import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    console.log('❌ No auth token found');
    return null;
  }
  const user = verifyToken(token);
  console.log('🔍 Auth verification result:', user);
  return user;
}

async function isAdmin(userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    console.log('🔍 Looking up user with ID:', userId);
    
    // Try to create ObjectId and handle invalid format
    let objectId;
    try {
      objectId = new ObjectId(userId);
    } catch (err) {
      console.error('❌ Invalid ObjectId format:', userId);
      return false;
    }
    
    const user = await db.collection('users').findOne({ _id: objectId });
    console.log('🔍 Admin check - User found:', user?.email, 'Role:', user?.role);
    
    if (!user) {
      console.log('❌ No user found with ID:', userId);
      return false;
    }
    
    // Check only role-based admin access
    const isUserAdmin = user?.role === 'admin';
    console.log('🔍 Final admin status:', isUserAdmin);
    return isUserAdmin;
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      console.log('❌ No user found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminStatus = await isAdmin(user.userId);
    if (!adminStatus) {
      console.log('❌ User is not admin, returning 403');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('✅ Admin access granted');
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    let config = await db.collection('config').findOne({});
    if (!config) {
      config = {
        defaultZoomLink: 'https://zoom.us/j/placeholder123456',
        updatedAt: new Date()
      };
      await db.collection('config').insertOne(config);
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('❌ Config GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !(await isAdmin(user.userId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { defaultZoomLink } = await request.json();
    
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    const result = await db.collection('config').updateOne(
      {},
      { 
        $set: { 
          defaultZoomLink,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    // Update all future meetings with new zoom link
    const today = new Date().toISOString().split('T')[0];
    await db.collection('meetings').updateMany(
      { date: { $gte: today } },
      { $set: { zoomLink: defaultZoomLink, updatedAt: new Date() } }
    );
    
    return NextResponse.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}