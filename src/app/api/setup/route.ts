import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    // Check if users already exist
    const existingUsers = await db.collection('users').countDocuments();
    if (existingUsers > 0) {
      return NextResponse.json({ 
        message: 'System already initialized - users exist',
        existingUsers 
      });
    }
    
    // Create only one initial admin user
    const initialAdmin = {
      email: 'admin@calendarcms.com',
      password: await hashPassword('admin123'),
      name: 'System Administrator',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('users').insertOne(initialAdmin);
    
    return NextResponse.json({ 
      message: 'System initialized successfully!',
      adminEmail: 'admin@calendarcms.com',
      note: 'Use the admin interface to create additional users'
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}