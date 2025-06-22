import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    console.log('🔄 Login attempt for email:', email);
    console.log('🔄 Password provided:', password ? '***provided***' : 'NO PASSWORD');
    
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    // Check if user exists
    const user = await db.collection('users').findOne({ email });
    console.log('🔍 User lookup result:', user ? 'User found' : 'User not found');
    
    if (!user) {
      console.log('❌ No user found with email:', email);
      return NextResponse.json({ 
        error: 'Invalid credentials',
        debug: 'User not found in database'
      }, { status: 401 });
    }
    
    console.log('🔍 Found user:', {
      email: user.email,
      name: user.name,
      role: user.role,
      hasPassword: !!user.password
    });
    
    console.log('🔐 Stored password hash:', user.password);
    console.log('🔐 Verifying password for:', email);
    
    const passwordValid = await verifyPassword(password, user.password);
    console.log('🔐 Password verification result:', passwordValid ? 'VALID ✅' : 'INVALID ❌');
    
    if (!passwordValid) {
      console.log('❌ Invalid password for user:', email);
      return NextResponse.json({ 
        error: 'Invalid credentials',
        debug: 'Password verification failed'
      }, { status: 401 });
    }
    
    console.log('✅ Login successful for user:', email);
    const token = generateToken(user._id.toString());
    console.log('🎫 Generated token for user ID:', user._id.toString());
    
    const response = NextResponse.json({ 
      message: 'Login successful',
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name,
        role: user.role 
      }
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    console.log('🍪 Auth cookie set successfully');
    return response;
  } catch (error) {
    console.error('💥 Login error:', error);
    return NextResponse.json({ 
      error: 'Login failed',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}