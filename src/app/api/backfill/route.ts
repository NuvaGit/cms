import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Calculate Easter Sunday for a given year (using the algorithm)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Get all Irish public holidays for a given year
function getIrishHolidays(year: number): Date[] {
  const holidays: Date[] = [];
  
  // Fixed date holidays
  holidays.push(new Date(year, 0, 1));   // New Year's Day
  holidays.push(new Date(year, 2, 17));  // St. Patrick's Day
  holidays.push(new Date(year, 11, 25)); // Christmas Day
  holidays.push(new Date(year, 11, 26)); // St. Stephen's Day
  
  // Easter-related holidays
  const easter = getEasterSunday(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push(easterMonday);
  
  // Bank holidays (first Monday of month)
  const mayBankHoliday = getFirstMondayOfMonth(year, 4); // May (month 4 = May)
  const juneBankHoliday = getFirstMondayOfMonth(year, 5); // June
  const augustBankHoliday = getFirstMondayOfMonth(year, 7); // August
  
  holidays.push(mayBankHoliday);
  holidays.push(juneBankHoliday);
  holidays.push(augustBankHoliday);
  
  // October bank holiday (last Monday)
  const octoberBankHoliday = getLastMondayOfMonth(year, 9); // October
  holidays.push(octoberBankHoliday);
  
  return holidays;
}

function getFirstMondayOfMonth(year: number, month: number): Date {
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  return new Date(year, month, daysToMonday);
}

function getLastMondayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const dayOfWeek = lastDay.getDay();
  const daysToLastMonday = dayOfWeek === 0 ? 6 : (dayOfWeek - 1);
  return new Date(year, month, lastDay.getDate() - daysToLastMonday);
}

function isIrishHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const holidays = getIrishHolidays(year);
  
  return holidays.some(holiday => 
    holiday.getFullYear() === date.getFullYear() &&
    holiday.getMonth() === date.getMonth() &&
    holiday.getDate() === date.getDate()
  );
}

function getAllMeetingsSince2019(config: any) {
  const meetings = [];
  const startDate = new Date('2019-01-01');
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1); // Include next year
  
  // Get meeting days from config (default to Thursday=4, Saturday=6)
  const meetingDay1 = config.meetingDay1 || 4; // Thursday
  const meetingDay2 = config.meetingDay2 || 6; // Saturday
  const meetingTime1 = config.meetingTime1 || '19:00'; // 7 PM
  const meetingTime2 = config.meetingTime2 || '13:00'; // 1 PM
  
  // Generate meetings for first day (default Thursday)
  let currentDate = new Date(startDate);
  
  // Find the first occurrence of meetingDay1 on or after the start date
  while (currentDate.getDay() !== meetingDay1) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Generate all meetings for day 1
  while (currentDate <= endDate) {
    if (!isIrishHoliday(currentDate)) {
      // Use UTC date to avoid timezone issues
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      meetings.push({
        date: dateStr,
        time: meetingTime1,
        title: `Team Meeting - ${dayName}, ${currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })}`,
        notes: '',
        zoomLink: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  // Reset for second day meetings (default Saturday)
  currentDate = new Date(startDate);
  
  // Find the first occurrence of meetingDay2 on or after the start date
  while (currentDate.getDay() !== meetingDay2) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Generate all meetings for day 2
  while (currentDate <= endDate) {
    if (!isIrishHoliday(currentDate)) {
      // Use UTC date to avoid timezone issues
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      meetings.push({
        date: dateStr,
        time: meetingTime2,
        title: `${dayName} Team Meeting - ${currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })}`,
        notes: '',
        zoomLink: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
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
        meetingDay1: 4, // Thursday (0=Sunday, 1=Monday, etc.)
        meetingDay2: 6, // Saturday
        meetingTime1: '19:00', // 7 PM
        meetingTime2: '13:00', // 1 PM
        updatedAt: new Date()
      };
      await db.collection('config').insertOne(config);
    }
    
    // Ensure config has meeting days (for existing configs)
    if (config.meetingDay1 === undefined) {
      await db.collection('config').updateOne(
        {},
        { 
          $set: { 
            meetingDay1: 4, // Thursday
            meetingDay2: 6, // Saturday
            meetingTime1: '19:00',
            meetingTime2: '13:00',
            updatedAt: new Date()
          }
        }
      );
      config.meetingDay1 = 4;
      config.meetingDay2 = 6;
      config.meetingTime1 = '19:00';
      config.meetingTime2 = '13:00';
    }
    
    // Clear existing meetings first to avoid duplicates and ensure correct schedule
    await db.collection('meetings').deleteMany({});
    
    // Generate all meetings since 2019 (excluding Irish holidays)
    const meetings = getAllMeetingsSince2019(config);
    
    // Add zoom links to all meetings
    meetings.forEach(meeting => {
      meeting.zoomLink = config.defaultZoomLink;
    });
    
    // Insert all meetings
    await db.collection('meetings').insertMany(meetings);
    
    // Count holidays excluded
    const allPossibleMeetings = getAllMeetingsWithoutHolidayFilter(config);
    const holidaysExcluded = allPossibleMeetings.length - meetings.length;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day1Name = dayNames[config.meetingDay1];
    const day2Name = dayNames[config.meetingDay2];
    
    return NextResponse.json({ 
      message: `Created ${meetings.length} meetings (${day1Name} ${config.meetingTime1} & ${day2Name} ${config.meetingTime2} since 2019)`,
      holidaysExcluded: holidaysExcluded,
      note: 'Irish public holidays automatically excluded',
      schedule: `Meetings scheduled for every ${day1Name} ${config.meetingTime1} and ${day2Name} ${config.meetingTime2}`
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: 'Failed to backfill meetings' }, { status: 500 });
  }
}

// Helper function for counting total meetings without holiday filter
function getAllMeetingsWithoutHolidayFilter(config: any) {
  const meetings = [];
  const startDate = new Date('2019-01-01');
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  const meetingDay1 = config.meetingDay1 || 4; // Thursday
  const meetingDay2 = config.meetingDay2 || 6; // Saturday
  
  // Count all meetings for day 1
  let currentDate = new Date(startDate);
  while (currentDate.getDay() !== meetingDay1) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    meetings.push({ date: dateStr, time: config.meetingTime1 || '19:00' });
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  // Count all meetings for day 2
  currentDate = new Date(startDate);
  while (currentDate.getDay() !== meetingDay2) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    meetings.push({ date: dateStr, time: config.meetingTime2 || '13:00' });
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return meetings;
}