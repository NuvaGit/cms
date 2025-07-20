import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface MeetingUpdateFields {
  notes?: string;
  time?: string;
  zoomLink?: string;
  updatedAt: Date;
}

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notes, time, zoomLink } = await request.json();
    const client = await clientPromise;
    const db = client.db('calendarcms');

    const updateFields: MeetingUpdateFields = { updatedAt: new Date() };
    if (notes !== undefined) updateFields.notes = notes;
    if (time !== undefined) updateFields.time = time;
    if (zoomLink !== undefined) updateFields.zoomLink = zoomLink;

    const result = await db.collection('meetings').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Meeting updated successfully' });
  } catch (error) {
    console.error('❌ Failed to update meeting:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}