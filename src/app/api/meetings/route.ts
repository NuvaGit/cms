import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Validate if the proposed meeting follows the schedule rules
function validateMeetingSchedule(date: string, time: string): { valid: boolean; message?: string } {
  const meetingDate = new Date(date);
  const dayOfWeek = meetingDate.getDay(); // 0 = Sunday, 4 = Thursday, 6 = Saturday
  
  // Only allow Thursday 7pm or Saturday 1pm
  if (dayOfWeek === 4 && time === '19:00') {
    return { valid: true };
  } else if (dayOfWeek === 6 && time === '13:00') {
    return { valid: true };
  } else {
    return { 
      valid: false, 
      message: 'Meetings can only be scheduled for Thursday 7:00 PM or Saturday 1:00 PM' 
    };
  }
}

// Check if date is an Irish holiday
function isIrishHoliday(date: Date): boolean {
  // Simplified holiday check - in production you'd want the full implementation
  const month = date.getMonth();
  const day = date.getDate();
  
  // Check major holidays
  if (month === 0 && day === 1) return true; // New Year's Day
  if (month === 2 && day === 17) return true; // St. Patrick's Day
  if (month === 11 && (day === 25 || day === 26)) return true; // Christmas/St. Stephen's
  
  // Note: For production, implement full holiday calculation including Easter and bank holidays
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('filter'); // 'upcoming' or 'previous'

    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    let query = {};
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (timeFilter === 'upcoming') {
      query = { date: { $gte: today } };
    } else if (timeFilter === 'previous') {
      query = { date: { $lt: today } };
    }
    
    const meetings = await db.collection('meetings').find(query).sort({ date: timeFilter === 'previous' ? -1 : 1 }).toArray();
    
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

    const { date, time, title, notes, zoomLink } = await request.json();
    
    // Validate required fields
    if (!date || !time) {
      return NextResponse.json({ error: 'Date and time are required' }, { status: 400 });
    }
    
    // Validate meeting schedule
    const scheduleValidation = validateMeetingSchedule(date, time);
    if (!scheduleValidation.valid) {
      return NextResponse.json({ error: scheduleValidation.message }, { status: 400 });
    }
    
    // Check if it's a holiday
    const meetingDate = new Date(date);
    if (isIrishHoliday(meetingDate)) {
      return NextResponse.json({ 
        error: 'Cannot schedule meetings on Irish public holidays' 
      }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    // Check if meeting already exists at this date/time
    const existingMeeting = await db.collection('meetings').findOne({ date, time });
    if (existingMeeting) {
      return NextResponse.json({ 
        error: 'A meeting already exists at this date and time' 
      }, { status: 400 });
    }
    
    const meeting = {
      date,
      time,
      title: title || `Team Meeting - ${meetingDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`,
      notes: notes || '',
      zoomLink: zoomLink || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('meetings').insertOne(meeting);
    
    return NextResponse.json({ 
      message: 'Meeting created successfully',
      meeting: { ...meeting, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}