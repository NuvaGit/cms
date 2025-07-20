import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface ConfigData {
  defaultZoomLink: string;
  meetingDay1: number;
  meetingDay2: number;
  meetingTime1: string;
  meetingTime2: string;
  updatedAt: Date;
}

interface ConfigUpdateData {
  defaultZoomLink?: string;
  meetingDay1?: number;
  meetingDay2?: number;
  meetingTime1?: string;
  meetingTime2?: string;
  updatedAt: Date;
}

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
    } catch (_err) {
      console.error('❌ Invalid ObjectId format:', userId, _err);
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
      const defaultConfig: ConfigData = {
        defaultZoomLink: 'https://zoom.us/j/placeholder123456',
        meetingDay1: 4, // Thursday
        meetingDay2: 6, // Saturday
        meetingTime1: '19:00',
        meetingTime2: '13:00',
        updatedAt: new Date()
      };
      await db.collection('config').insertOne(defaultConfig);
      return NextResponse.json(defaultConfig);
    }
    
    // Ensure config has meeting days (for existing configs)
    if (config.meetingDay1 === undefined) {
      const updateData: ConfigUpdateData = { 
        meetingDay1: 4,
        meetingDay2: 6,
        meetingTime1: '19:00',
        meetingTime2: '13:00',
        updatedAt: new Date()
      };
      
      await db.collection('config').updateOne(
        {},
        { $set: updateData }
      );
      
      // Update the config object with the new values
      config = { ...config, ...updateData };
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

    const { 
      defaultZoomLink, 
      meetingDay1, 
      meetingDay2, 
      meetingTime1, 
      meetingTime2 
    } = await request.json();
    
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    const updateData: ConfigUpdateData = { updatedAt: new Date() };
    
    if (defaultZoomLink !== undefined) updateData.defaultZoomLink = defaultZoomLink;
    if (meetingDay1 !== undefined) updateData.meetingDay1 = meetingDay1;
    if (meetingDay2 !== undefined) updateData.meetingDay2 = meetingDay2;
    if (meetingTime1 !== undefined) updateData.meetingTime1 = meetingTime1;
    if (meetingTime2 !== undefined) updateData.meetingTime2 = meetingTime2;
    
    await db.collection('config').updateOne(
      {},
      { $set: updateData },
      { upsert: true }
    );
    
    // Update future meetings with new zoom link if it was changed
    if (defaultZoomLink !== undefined) {
      const today = new Date().toISOString().split('T')[0];
      await db.collection('meetings').updateMany(
        { date: { $gte: today } },
        { $set: { zoomLink: defaultZoomLink, updatedAt: new Date() } }
      );
    }
    
    return NextResponse.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('❌ Failed to update config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}