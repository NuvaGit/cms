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
    // Add Thursday 7pm meeting (only if not a holiday)
    if (nextThursday <= endDate && !isIrishHoliday(nextThursday)) {
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
    }
    nextThursday.setDate(nextThursday.getDate() + 7);
    
    // Add Saturday 1pm meeting (only if not a holiday)
    if (nextSaturday <= endDate && !isIrishHoliday(nextSaturday)) {
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
    }
    nextSaturday.setDate(nextSaturday.getDate() + 7);
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
    
    // Generate all meetings since 2019 (excluding Irish holidays)
    const meetings = getAllMeetingsSince2019();
    
    // Add zoom links to all meetings
    meetings.forEach(meeting => {
      meeting.zoomLink = config.defaultZoomLink;
    });
    
    // Check if meetings already exist to avoid duplicates
    const existingMeetings = await db.collection('meetings').find({}).toArray();
    
    if (existingMeetings.length === 0) {
      await db.collection('meetings').insertMany(meetings);
      
      // Count holidays excluded
      const allPossibleMeetings = getAllMeetingsWithoutHolidayFilter();
      const holidaysExcluded = allPossibleMeetings.length - meetings.length;
      
      return NextResponse.json({ 
        message: `Created ${meetings.length} meetings (Thu 7pm & Sat 1pm since 2019)`,
        holidaysExcluded: holidaysExcluded,
        note: 'Irish public holidays automatically excluded'
      });
    } else {
      // Add any missing meetings
      const existingDates = new Set(existingMeetings.map(m => `${m.date}-${m.time}`));
      const newMeetings = meetings.filter(m => !existingDates.has(`${m.date}-${m.time}`));
      
      if (newMeetings.length > 0) {
        await db.collection('meetings').insertMany(newMeetings);
        return NextResponse.json({ 
          message: `Added ${newMeetings.length} new meetings`,
          note: 'Irish public holidays automatically excluded'
        });
      } else {
        return NextResponse.json({ 
          message: 'All meetings already exist',
          total: meetings.length,
          note: 'Irish public holidays excluded from schedule'
        });
      }
    }
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: 'Failed to backfill meetings' }, { status: 500 });
  }
}

// Helper function for counting total meetings without holiday filter
function getAllMeetingsWithoutHolidayFilter() {
  const meetings = [];
  const startDate = new Date('2019-01-01');
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  let currentDate = new Date(startDate);
  let nextThursday = getNextDayOfWeek(currentDate, 4);
  let nextSaturday = getNextDayOfWeek(currentDate, 6);
  
  while (nextThursday <= endDate || nextSaturday <= endDate) {
    if (nextThursday <= endDate) {
      meetings.push({ date: nextThursday.toISOString().split('T')[0], time: '19:00' });
      nextThursday.setDate(nextThursday.getDate() + 7);
    }
    if (nextSaturday <= endDate) {
      meetings.push({ date: nextSaturday.toISOString().split('T')[0], time: '13:00' });
      nextSaturday.setDate(nextSaturday.getDate() + 7);
    }
  }
  
  return meetings;
}