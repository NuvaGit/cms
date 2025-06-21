import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    // Generate 52 weekly meetings (past year)
    const meetings = [];
    const now = new Date();
    
    for (let i = 52; i >= 0; i--) {
      const meetingDate = new Date(now);
      meetingDate.setDate(now.getDate() - (i * 7)); // Go back i weeks
      
      meetings.push({
        date: meetingDate.toISOString().split('T')[0],
        title: `Weekly Meeting - ${meetingDate.toLocaleDateString()}`,
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Check if meetings already exist to avoid duplicates
    const existingMeetings = await db.collection('meetings').find({}).toArray();
    
    if (existingMeetings.length === 0) {
      await db.collection('meetings').insertMany(meetings);
      return NextResponse.json({ message: `Created ${meetings.length} meetings` });
    } else {
      return NextResponse.json({ message: 'Meetings already exist' });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to backfill meetings' }, { status: 500 });
  }
}