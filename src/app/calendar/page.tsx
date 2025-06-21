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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'previous'>('upcoming');
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchMeetings();
    checkAdminStatus();
  }, [filter]);

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`/api/meetings?filter=${filter}`);
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
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
        setIsAdmin(true);
      }
    } catch (error) {
      // User is not admin, which is fine
      setIsAdmin(false);
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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDay(); // 0 = Sunday, 4 = Thursday, 6 = Saturday
  };

  const getMeetingType = (dateString: string, timeString: string) => {
    const dayOfWeek = getDayOfWeek(dateString);
    const time = timeString || '';
    
    if (dayOfWeek === 4 && time === '19:00') {
      return { type: 'Thursday Evening', icon: '🌆', color: 'from-blue-500 to-blue-600' };
    } else if (dayOfWeek === 6 && time === '13:00') {
      return { type: 'Saturday Afternoon', icon: '☀️', color: 'from-green-500 to-green-600' };
    } else {
      return { type: 'Team Meeting', icon: '📅', color: 'from-gray-500 to-gray-600' };
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) {
      return 'Time TBD';
    }
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isUpcoming = (dateString: string, timeString: string) => {
    if (!dateString) return false;
    if (!timeString) {
      // If no time specified, just check if date is today or future
      const meetingDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return meetingDate >= today;
    }
    const meetingDateTime = new Date(`${dateString}T${timeString}`);
    return meetingDateTime > new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-xl text-white">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Team Calendar</h1>
              <p className="text-blue-200 text-sm mt-1">
                📅 Regular Schedule: Thursdays 7:00 PM • Saturdays 1:00 PM
              </p>
            </div>
            <div className="flex space-x-4">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Schedule Info */}
        <div className="mb-8 bg-gradient-to-r from-blue-600/20 to-green-600/20 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">
            📋 Regular Meeting Schedule
          </h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🌆</div>
              <h3 className="text-lg font-semibold text-white">Thursday Evenings</h3>
              <p className="text-blue-200">7:00 PM</p>
              <p className="text-sm text-gray-300 mt-1">Weekly team meeting</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">☀️</div>
              <h3 className="text-lg font-semibold text-white">Saturday Afternoons</h3>
              <p className="text-green-200">1:00 PM</p>
              <p className="text-sm text-gray-300 mt-1">Weekend team meeting</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-300">
              🇮🇪 <strong>Note:</strong> Meetings are automatically cancelled on Irish public holidays
            </p>
            <p className="text-xs text-gray-400 mt-1">
              (New Year's, St. Patrick's Day, Easter Monday, Bank Holidays, Christmas, etc.)
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/10 p-1 rounded-lg w-fit">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              filter === 'upcoming'
                ? 'bg-white text-gray-900 shadow-lg'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Upcoming Meetings
          </button>
          <button
            onClick={() => setFilter('previous')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              filter === 'previous'
                ? 'bg-white text-gray-900 shadow-lg'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Previous Meetings
          </button>
        </div>

        {/* Meetings Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {meetings.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
                <p className="text-white text-lg">
                  No {filter} meetings found
                </p>
              </div>
            </div>
          ) : (
            meetings.map((meeting) => {
              const meetingType = getMeetingType(meeting.date, meeting.time || '');
              return (
                <div
                  key={meeting._id}
                  className={`bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl transition-all duration-200 hover:shadow-2xl hover:bg-white/15 ${
                    isUpcoming(meeting.date, meeting.time || '') ? 'ring-2 ring-blue-400/50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{meetingType.icon}</span>
                        <span className={`bg-gradient-to-r ${meetingType.color} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                          {meetingType.type}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {meeting.title}
                      </h3>
                      <p className="text-blue-200 text-sm">
                        {formatDate(meeting.date)}
                      </p>
                      <p className="text-blue-200 text-sm font-medium">
                        {formatTime(meeting.time || '')}
                      </p>
                    </div>
                    {isUpcoming(meeting.date, meeting.time || '') && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        Upcoming
                      </span>
                    )}
                  </div>

                  {meeting.notes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-2">Notes:</h4>
                      <p className="text-gray-300 text-sm bg-white/10 p-3 rounded-lg">
                        {meeting.notes}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {meeting.zoomLink && meeting.zoomLink !== 'https://zoom.us/placeholder' && meeting.zoomLink !== '' && (
                      <a
                        href={meeting.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                      >
                        <span>🔗</span>
                        <span>Join Meeting</span>
                      </a>
                    )}
                    
                    <button
                      onClick={() => setEditingMeeting(meeting)}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Edit Notes
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Edit Meeting: {editingMeeting.title}
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Time
                </label>
                <input
                  type="time"
                  name="time"
                  defaultValue={editingMeeting.time || '13:00'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zoom Link
                </label>
                <input
                  type="url"
                  name="zoomLink"
                  defaultValue={editingMeeting.zoomLink || ''}
                  placeholder="https://zoom.us/j/1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Notes
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={editingMeeting.notes || ''}
                  placeholder="Add meeting notes, agenda, or any important information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}