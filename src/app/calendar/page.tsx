// src/app/calendar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Meeting {
  _id: string;
  date: string;
  time?: string;
  title: string;
  notes?: string;
  zoomLink?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export default function CalendarPage() {
  const [currentWeekMeetings, setCurrentWeekMeetings] = useState<Meeting[]>([]);
  const [previousMeetings, setPreviousMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrevious, setShowPrevious] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMeetings();
    checkAdminStatus();
  }, []);

  // Get current week's date range (Monday to Sunday)
  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const fetchMeetings = async () => {
    try {
      const response = await fetch('/api/meetings');
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (response.ok) {
        const allMeetings = await response.json();
        
        const weekRange = getCurrentWeekRange();
        const today = new Date().toISOString().split('T')[0];
        
        // Filter current week meetings (including past ones from this week)
        const thisWeek = allMeetings.filter((meeting: Meeting) => 
          meeting.date >= weekRange.start && meeting.date <= weekRange.end
        );
        
        // Filter previous meetings (before this week)
        const previous = allMeetings.filter((meeting: Meeting) => 
          meeting.date < weekRange.start
        ).sort((a: Meeting, b: Meeting) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setCurrentWeekMeetings(thisWeek);
        setPreviousMeetings(previous);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const configData = await response.json();
        setIsAdmin(true);
        setConfig(configData);
      } else {
        setIsAdmin(false);
        // Try to get config for display purposes even for non-admin
        try {
          const meetingsResponse = await fetch('/api/meetings');
          if (meetingsResponse.ok) {
            // Set default config for display
            setConfig({
              meetingDay1: 4,
              meetingDay2: 6,
              meetingTime1: '19:00',
              meetingTime2: '13:00'
            });
          }
        } catch (err) {
          // Fallback config
          setConfig({
            meetingDay1: 4,
            meetingDay2: 6,
            meetingTime1: '19:00',
            meetingTime2: '13:00'
          });
        }
      }
    } catch (error) {
      setIsAdmin(false);
      setConfig({
        meetingDay1: 4,
        meetingDay2: 6,
        meetingTime1: '19:00',
        meetingTime2: '13:00'
      });
    }
  };

  const handleUpdateMeeting = async (meetingId: string, updates: Partial<Meeting>) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setEditingMeeting(null);
        fetchMeetings();
        alert('Meeting updated successfully!');
      } else {
        alert('Failed to update meeting');
      }
    } catch (error) {
      alert('Error updating meeting');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Time TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getMeetingIcon = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    
    if (config) {
      if (dayOfWeek === config.meetingDay1 && timeString === config.meetingTime1) {
        return config.meetingDay1 === 4 ? '🌆' : '📅'; // Thursday evening or generic
      } else if (dayOfWeek === config.meetingDay2 && timeString === config.meetingTime2) {
        return config.meetingDay2 === 6 ? '☀️' : '📅'; // Saturday afternoon or generic
      }
    }
    
    return '📅';
  };

  const isPastMeeting = (dateString: string, timeString: string) => {
    if (!timeString) return false;
    const meetingDateTime = new Date(`${dateString}T${timeString}`);
    return meetingDateTime < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl text-gray-900">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Calendar</h1>
              {config && (
                <p className="text-sm text-gray-600 mt-1">
                  Weekly Schedule: {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][config.meetingDay1]} {config.meetingTime1} • {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][config.meetingDay2]} {config.meetingTime2}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
                >
                  Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Current Week Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week's Meetings</h2>
          
          {currentWeekMeetings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No meetings scheduled for this week</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentWeekMeetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                    isPastMeeting(meeting.date, meeting.time || '') 
                      ? 'border-gray-200' 
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">
                          {getMeetingIcon(meeting.date, meeting.time || '')}
                        </span>
                        <h3 className="font-medium text-gray-900">
                          {formatDate(meeting.date)} • {formatTime(meeting.time || '')}
                        </h3>
                        {!isPastMeeting(meeting.date, meeting.time || '') && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Upcoming
                          </span>
                        )}
                      </div>
                      
                      {meeting.notes && (
                        <p className="text-sm text-gray-700 mt-2 bg-gray-100 p-2 rounded">
                          {meeting.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      {meeting.zoomLink && meeting.zoomLink !== '' && (
                        <a
                          href={meeting.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Join
                        </a>
                      )}
                      <button
                        onClick={() => setEditingMeeting(meeting)}
                        className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors"
                      >
                        {isAdmin ? 'Edit' : 'View Notes'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Previous Meetings Toggle */}
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={() => setShowPrevious(!showPrevious)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>{showPrevious ? '↑' : '↓'}</span>
            <span>Previous Meetings ({previousMeetings.length})</span>
          </button>
          
          {showPrevious && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {previousMeetings.length === 0 ? (
                <p className="text-gray-500 text-sm">No previous meetings found</p>
              ) : (
                previousMeetings.map((meeting) => (
                  <div
                    key={meeting._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">
                            {getMeetingIcon(meeting.date, meeting.time || '')}
                          </span>
                          <h3 className="font-medium text-gray-900">
                            {formatDate(meeting.date)} • {formatTime(meeting.time || '')}
                          </h3>
                        </div>
                        
                        {meeting.notes && (
                          <p className="text-sm text-gray-700 mt-2 bg-gray-100 p-2 rounded">
                            {meeting.notes}
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setEditingMeeting(meeting)}
                        className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors ml-4"
                      >
                        {isAdmin ? 'View/Edit' : 'View Notes'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {isAdmin ? 'Edit Meeting' : 'Meeting Details'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {formatDate(editingMeeting.date)} • {formatTime(editingMeeting.time || '')}
            </p>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!isAdmin) return;
                
                const formData = new FormData(e.currentTarget);
                const notes = formData.get('notes') as string;
                const time = formData.get('time') as string;
                const zoomLink = formData.get('zoomLink') as string;
                
                handleUpdateMeeting(editingMeeting._id, {
                  notes,
                  time,
                  zoomLink
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Meeting Time
                </label>
                <input
                  type="time"
                  name="time"
                  defaultValue={editingMeeting.time || '13:00'}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Zoom Link
                </label>
                <input
                  type="url"
                  name="zoomLink"
                  defaultValue={editingMeeting.zoomLink || ''}
                  placeholder="https://zoom.us/j/1234567890"
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Meeting Notes
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={editingMeeting.notes || ''}
                  placeholder="Add meeting notes, agenda, or any important information..."
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {isAdmin && (
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}