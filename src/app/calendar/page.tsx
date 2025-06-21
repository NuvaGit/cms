'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Meeting } from '@/types';

export default function CalendarPage() {
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [previousMeetings, setPreviousMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('🏠 Calendar page mounted');
    fetchUpcomingMeetings();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/config');
      setIsAdmin(response.status !== 403);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const fetchUpcomingMeetings = async () => {
    try {
      console.log('📅 Fetching upcoming meetings...');
      const response = await fetch('/api/meetings?filter=upcoming');
      console.log('📡 Meetings response status:', response.status);
      
      if (response.status === 401) {
        console.log('🔒 Unauthorized - redirecting to login');
        router.push('/login');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Upcoming meetings loaded:', data.length);
        setUpcomingMeetings(data);
      } else {
        console.log('❌ Failed to fetch upcoming meetings');
      }
    } catch (error) {
      console.error('💥 Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousMeetings = async () => {
    if (previousMeetings.length > 0) return; // Already loaded
    
    try {
      console.log('📅 Fetching previous meetings...');
      const response = await fetch('/api/meetings?filter=previous');
      
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Previous meetings loaded:', data.length);
        setPreviousMeetings(data);
      } else {
        console.log('❌ Failed to fetch previous meetings');
      }
    } catch (error) {
      console.error('💥 Error fetching previous meetings:', error);
    }
  };

  const handleShowPrevious = () => {
    setShowPrevious(!showPrevious);
    if (!showPrevious) {
      fetchPreviousMeetings();
    }
  };

  const handleMeetingSelect = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setNotes(meeting.notes || '');
  };

  const handleSaveNotes = async () => {
    if (!selectedMeeting) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        // Update local state
        const updateMeeting = (meetings: Meeting[]) => 
          meetings.map(m => 
            m._id === selectedMeeting._id 
              ? { ...m, notes }
              : m
          );
        
        setUpcomingMeetings(updateMeeting);
        setPreviousMeetings(updateMeeting);
        setSelectedMeeting({ ...selectedMeeting, notes });
        alert('Notes saved successfully!');
      } else {
        alert('Failed to save notes');
      }
    } catch (error) {
      alert('Error saving notes');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '1:00 PM';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isUpcoming = (dateString: string, timeString: string) => {
    const now = new Date();
    const meetingDate = new Date(dateString);
    const [hours, minutes] = (timeString || '13:00').split(':');
    meetingDate.setHours(parseInt(hours), parseInt(minutes));
    return meetingDate > now;
  };

  const getNextMeeting = () => {
    return upcomingMeetings.find(meeting => 
      isUpcoming(meeting.date, meeting.time)
    );
  };

  const getDayOfWeek = (dateString: string) => {
    const day = new Date(dateString).getDay();
    return day === 4 ? 'Thursday' : day === 6 ? 'Saturday' : '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900">
        <div className="text-xl text-white">Loading meetings...</div>
      </div>
    );
  }

  const nextMeeting = getNextMeeting();
  const displayMeetings = showPrevious ? previousMeetings : upcomingMeetings;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-white">Calendar CMS</h1>
            <div className="flex space-x-4">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
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
        {/* Next Meeting Banner */}
        {nextMeeting && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl p-6 mb-8 shadow-xl border border-white/20 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3">🔥 Next Meeting</h2>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
              <div>
                <h3 className="text-lg font-medium">{nextMeeting.title}</h3>
                <p className="text-emerald-100">
                  {getDayOfWeek(nextMeeting.date)} • {formatDate(nextMeeting.date)} at {formatTime(nextMeeting.time)}
                </p>
              </div>
              <a
                href={nextMeeting.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-emerald-600 px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl text-center"
              >
                🎥 Join Zoom Meeting
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Meetings List */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                {showPrevious ? '📅 Previous Meetings' : '🗓️ Upcoming Meetings'} ({displayMeetings.length})
              </h2>
              <button
                onClick={handleShowPrevious}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
                  showPrevious 
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                }`}
              >
                {showPrevious ? 'Show Upcoming' : 'Show Previous'}
              </button>
            </div>
            
            {displayMeetings.length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-lg font-medium">No {showPrevious ? 'previous' : 'upcoming'} meetings found.</p>
                {isAdmin && !showPrevious && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Initialize Meetings in Admin Panel
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                {displayMeetings.map((meeting) => (
                  <div
                    key={meeting._id}
                    onClick={() => handleMeetingSelect(meeting)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                      selectedMeeting?._id === meeting._id
                        ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-2 border-blue-400 shadow-lg'
                        : 'bg-white/10 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{meeting.title}</h4>
                        <p className="text-sm text-gray-300 mb-2">
                          {getDayOfWeek(meeting.date)} • {formatDate(meeting.date)} at {formatTime(meeting.time)}
                        </p>
                        {meeting.zoomLink && (
                          <a
                            href={meeting.zoomLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            🎥 Join Zoom →
                          </a>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <span className={`inline-block w-3 h-3 rounded-full shadow-sm ${
                          meeting.notes ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-gray-400'
                        }`} title={meeting.notes ? 'Has notes' : 'No notes'}></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Editor */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 text-white">📝 Meeting Notes</h2>
            
            {selectedMeeting ? (
              <div>
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-white/20">
                  <h3 className="font-medium text-white mb-1">{selectedMeeting.title}</h3>
                  <p className="text-sm text-gray-300 mb-2">
                    {getDayOfWeek(selectedMeeting.date)} • {formatDate(selectedMeeting.date)} at {formatTime(selectedMeeting.time)}
                  </p>
                  {selectedMeeting.zoomLink && (
                    <a
                      href={selectedMeeting.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                    >
                      🎥 Join Zoom Meeting →
                    </a>
                  )}
                </div>
                
                <div className="mb-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-200 mb-3">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={12}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-300 resize-none"
                    placeholder="Add your meeting notes here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {saving ? '💾 Saving...' : '💾 Save Notes'}
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-300">
                <div className="text-4xl mb-4">👆</div>
                <p className="text-lg">Select a meeting to view or edit notes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}