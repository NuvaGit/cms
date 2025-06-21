import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken, hashPassword } from '@/lib/auth';
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
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    console.log('🔍 Admin check - User found:', user?.email, 'Role:', user?.role);
    return user?.role === 'admin' || user?.email === 'jackneilan02@gmail.com';
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !(await isAdmin(user.userId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    const users = await db.collection('users').find({}, { 
      projection: { password: 0 } // Don't return passwords
    }).toArray();
    
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !(await isAdmin(user.userId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, password, name, role } = await request.json();
    
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    
    const hashedPassword = await hashPassword(password);
    const newUser = {
      email,
      password: hashedPassword,
      name,
      role: role || 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    return NextResponse.json({ 
      message: 'User created successfully',
      user: { 
        _id: result.insertedId, 
        email: newUser.email, 
        name: newUser.name, 
        role: newUser.role 
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !(await isAdmin(user.userId))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await request.json();
    
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    // Prevent deleting the admin user
    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (targetUser?.email === 'jackneilan02@gmail.com') {
      return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 400 });
    }
    
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}