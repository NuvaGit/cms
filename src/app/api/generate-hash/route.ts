import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    
    console.log('🔐 Generating hash for password:', password);
    const hash = await hashPassword(password);
    console.log('🔐 Generated hash:', hash);
    
    return NextResponse.json({ 
      password: password,
      hash: hash,
      message: 'Hash generated successfully'
    });
  } catch (error) {
    console.error('❌ Hash generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate hash',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}