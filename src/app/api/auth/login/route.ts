import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    const user = await db.collection('users').findOne({ email });
    
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    const token = generateToken(user._id.toString());
    
    const response = NextResponse.json({ 
      message: 'Login successful',
      user: { id: user._id, email: user.email, name: user.name }
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}