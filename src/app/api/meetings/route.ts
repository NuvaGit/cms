import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    const meetings = await db.collection('meetings').find({}).sort({ date: 1 }).toArray();
    
    return NextResponse.json(meetings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, title, notes } = await request.json();
    
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    const meeting = {
      date,
      title,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('meetings').insertOne(meeting);
    
    return NextResponse.json({ ...meeting, _id: result.insertedId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}