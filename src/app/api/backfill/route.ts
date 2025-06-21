import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

function getNextDayOfWeek(date: Date, targetDay: number): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysUntilTarget = (targetDay - dayOfWeek + 7) % 7;
  if (daysUntilTarget === 0 && result.getTime() <= date.getTime()) {
    result.setDate(result.getDate() + 7);
  } else {
    result.setDate(result.getDate() + daysUntilTarget);
  }
  return result;
}

function getAllMeetingsSince2019() {
  const meetings = [];
  const startDate = new Date('2019-01-01');
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1); // Include next year
  
  let currentDate = new Date(startDate);
  
  // Find first Thursday and Saturday from start date
  let nextThursday = getNextDayOfWeek(currentDate, 4); // Thursday = 4
  let nextSaturday = getNextDayOfWeek(currentDate, 6); // Saturday = 6
  
  // Generate all meetings from 2019 to next year
  while (nextThursday <= endDate || nextSaturday <= endDate) {
    // Add Thursday 7pm meeting
    if (nextThursday <= endDate) {
      meetings.push({
        date: nextThursday.toISOString().split('T')[0],
        time: '19:00',
        title: `Team Meeting - ${nextThursday.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })}`,
        notes: '',
        zoomLink: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      nextThursday.setDate(nextThursday.getDate() + 7);
    }
    
    // Add Saturday 1pm meeting
    if (nextSaturday <= endDate) {
      meetings.push({
        date: nextSaturday.toISOString().split('T')[0],
        time: '13:00',
        title: `Weekend Team Meeting - ${nextSaturday.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })}`,
        notes: '',
        zoomLink: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      nextSaturday.setDate(nextSaturday.getDate() + 7);
    }
  }
  
  return meetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('calendarcms');
    
    // Get or create default config
    let config = await db.collection('config').findOne({});
    if (!config) {
      config = {
        defaultZoomLink: 'https://zoom.us/j/placeholder123456',
        updatedAt: new Date()
      };
      await db.collection('config').insertOne(config);
    }
    
    // Generate all meetings since 2019
    const meetings = getAllMeetingsSince2019();
    
    // Add zoom links to all meetings
    meetings.forEach(meeting => {
      meeting.zoomLink = config.defaultZoomLink;
    });
    
    // Check if meetings already exist to avoid duplicates
    const existingMeetings = await db.collection('meetings').find({}).toArray();
    
    if (existingMeetings.length === 0) {
      await db.collection('meetings').insertMany(meetings);
      return NextResponse.json({ 
        message: `Created ${meetings.length} meetings (Thu 7pm & Sat 1pm since 2019)` 
      });
    } else {
      // Add any missing meetings
      const existingDates = new Set(existingMeetings.map(m => `${m.date}-${m.time}`));
      const newMeetings = meetings.filter(m => !existingDates.has(`${m.date}-${m.time}`));
      
      if (newMeetings.length > 0) {
        await db.collection('meetings').insertMany(newMeetings);
        return NextResponse.json({ 
          message: `Added ${newMeetings.length} new meetings` 
        });
      } else {
        return NextResponse.json({ 
          message: 'All meetings already exist',
          total: meetings.length
        });
      }
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to backfill meetings' }, { status: 500 });
  }
}