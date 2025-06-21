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
      return NextResponse.json({ message: 'Users already exist' });
    }
    
    // Create 4 hardcoded users
  // Create 4 hardcoded users
    const users = [
      { email: 'admin@company.com', password: await hashPassword('admin123'), name: 'Admin User', role: 'admin' },
      { email: 'john@company.com', password: await hashPassword('john123'), name: 'John Doe', role: 'user' },
      { email: 'jane@company.com', password: await hashPassword('jane123'), name: 'Jane Smith', role: 'user' },
      { email: 'bob@company.com', password: await hashPassword('bob123'), name: 'Bob Wilson', role: 'user' }
    ];
    
    await db.collection('users').insertMany(users);
    
    return NextResponse.json({ message: 'Setup complete - users created' });
  } catch (error) {
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}