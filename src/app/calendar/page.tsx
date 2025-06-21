'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Meeting } from '@/types';

export default function CalendarPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    console.log('🏠 Calendar page mounted');
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      console.log('📅 Fetching meetings...');
      const response = await fetch('/api/meetings');
      console.log('📡 Meetings response status:', response.status);
      
      if (response.status === 401) {
        console.log('🔒 Unauthorized - redirecting to login');
        router.push('/login');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Meetings loaded:', data.length);
        setMeetings(data);
      } else {
        console.log('❌ Failed to fetch meetings');
      }
    } catch (error) {
      console.error('💥 Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    try {
      const response = await fetch('/api/backfill', { method: 'POST' });
      const data = await response.json();
      alert(data.message);
      fetchMeetings();
    } catch (error) {
      alert('Failed to backfill meetings');
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
        setMeetings(meetings.map(m => 
          m._id === selectedMeeting._id 
            ? { ...m, notes }
            : m
        ));
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

  const groupMeetingsByMonth = (meetings: Meeting[]) => {
    const grouped: { [key: string]: Meeting[] } = {};
    meetings.forEach(meeting => {
      const date = new Date(meeting.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(meeting);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading meetings...</div>
      </div>
    );
  }

  const groupedMeetings = groupMeetingsByMonth(meetings);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Calendar CMS</h1>
            <div className="flex space-x-4">
              <button
                onClick={handleBackfill}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Backfill Meetings
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar/Meetings List */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Meetings ({meetings.length})</h2>
            
            {meetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No meetings found.</p>
                <button
                  onClick={handleBackfill}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Create Sample Meetings
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedMeetings).map(([monthKey, monthMeetings]) => {
                  const date = new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]));
                  const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                  
                  return (
                    <div key={monthKey}>
                      <h3 className="font-semibold text-gray-700 mb-2">{monthName}</h3>
                      {monthMeetings.map((meeting) => (
                        <div
                          key={meeting._id}
                          onClick={() => handleMeetingSelect(meeting)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedMeeting?._id === meeting._id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                              <p className="text-sm text-gray-500">{formatDate(meeting.date)}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block w-3 h-3 rounded-full ${
                                meeting.notes ? 'bg-green-400' : 'bg-gray-300'
                              }`} title={meeting.notes ? 'Has notes' : 'No notes'}></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes Editor */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Meeting Notes</h2>
            
            {selectedMeeting ? (
              <div>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">{selectedMeeting.title}</h3>
                  <p className="text-sm text-gray-500">{formatDate(selectedMeeting.date)}</p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add your meeting notes here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Select a meeting to view or edit notes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}