import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    const users = await db.collection('users').find({}, { 
      projection: { password: 0 } // Don't return passwords
    }).toArray();
    
    console.log('🔍 All users in database:', users);
    
    return NextResponse.json({ 
      message: 'Debug info',
      userCount: users.length,
      users: users.map(u => ({ 
        id: u._id, 
        email: u.email, 
        name: u.name, 
        role: u.role 
      }))
    });
  } catch (error) {
    console.error('❌ Debug users error:', error);
    return NextResponse.json({ error: 'Failed to fetch debug info' }, { status: 500 });
  }
}