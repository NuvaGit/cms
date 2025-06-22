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

async function getCurrentUser(userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db('calendarcms');
    return await db.collection('users').findOne({ _id: new ObjectId(userId) });
  } catch (error) {
    console.error('❌ Error fetching current user:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminStatus = await isAdmin(user.userId);
    if (!adminStatus) {
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
    
    // Get the target user and current user info
    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const currentUser = await getCurrentUser(user.userId);
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Prevent deleting yourself
    if (targetUser._id.toString() === user.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }
    
    // Check if this would delete the last admin
    if (targetUser.role === 'admin') {
      const adminCount = await db.collection('users').countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot delete the last admin user. Create another admin first.' 
        }, { status: 400 });
      }
    }
    
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}