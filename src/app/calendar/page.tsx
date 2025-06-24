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

  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    
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
        
        const thisWeek = allMeetings.filter((meeting: Meeting) => 
          meeting.date >= weekRange.start && meeting.date <= weekRange.end
        );
        
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
        try {
          const meetingsResponse = await fetch('/api/meetings');
          if (meetingsResponse.ok) {
            setConfig({
              meetingDay1: 4,
              meetingDay2: 6,
              meetingTime1: '19:00',
              meetingTime2: '13:00'
            });
          }
        } catch (err) {
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
        return config.meetingDay1 === 4 ? '🌆' : '📅';
      } else if (dayOfWeek === config.meetingDay2 && timeString === config.meetingTime2) {
        return config.meetingDay2 === 6 ? '☀️' : '📅';
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-r-violet-400 rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
          <div className="mt-8 text-center">
            <div className="text-2xl font-bold text-white/90 animate-pulse">Loading calendar...</div>
            <div className="text-sm text-white/60 mt-2">Preparing your meetings</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(90deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
          75% { transform: translateY(-10px) rotate(270deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #8b5cf6, #6366f1);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #a78bfa, #8b5cf6);
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse"></div>
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${8 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>

        {/* Glassmorphism Header */}
        <header className="relative backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
          <div className="relative max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center">
              <div className="group">
                <h1 className="text-4xl font-black bg-gradient-to-r from-white via-violet-200 to-indigo-200 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                  Team Calendar ✨
                </h1>
                {config && (
                  <div className="flex items-center mt-3 space-x-4">
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white/90 text-sm font-medium">
                        Weekly Schedule
                      </span>
                    </div>
                    <div className="text-white/80 text-sm font-medium bg-gradient-to-r from-violet-600/30 to-indigo-600/30 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][config.meetingDay1]} {config.meetingTime1} • {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][config.meetingDay2]} {config.meetingTime2}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex space-x-4">
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="group relative bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-2xl hover:shadow-violet-500/25 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 border border-white/20 backdrop-blur-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-indigo-400/20 rounded-xl blur group-hover:blur-md transition-all duration-300"></div>
                    <span className="relative">⚡ Admin</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="group relative bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold border border-white/20 hover:bg-white/20 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-white/10"
                >
                  <span className="relative">👋 Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          {/* Current Week Section */}
          <div className="mb-16">
            <div className="flex items-center space-x-4 mb-8">
              <h2 className="text-3xl font-bold text-white">This Week's Meetings</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent"></div>
              <div className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                {currentWeekMeetings.length} meetings
              </div>
            </div>
            
            {currentWeekMeetings.length === 0 ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 hover:scale-102">
                  <div className="text-6xl mb-4 animate-bounce">📅</div>
                  <p className="text-xl text-white/80 font-medium">No meetings scheduled for this week</p>
                  <p className="text-white/60 mt-2">Enjoy your free time! ✨</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {currentWeekMeetings.map((meeting, index) => (
                  <div
                    key={meeting._id}
                    className="group relative"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`absolute inset-0 rounded-3xl blur-xl transition-all duration-500 ${
                      isPastMeeting(meeting.date, meeting.time || '') 
                        ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/20' 
                        : 'bg-gradient-to-r from-violet-500/30 to-indigo-500/30 group-hover:from-violet-400/40 group-hover:to-indigo-400/40'
                    }`}></div>
                    
                    <div className={`relative backdrop-blur-xl border rounded-3xl p-8 shadow-2xl transition-all duration-500 group-hover:scale-102 group-hover:-translate-y-1 ${
                      isPastMeeting(meeting.date, meeting.time || '') 
                        ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                        : 'bg-white/10 border-white/20 hover:bg-white/15 shadow-violet-500/20'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                              {getMeetingIcon(meeting.date, meeting.time || '')}
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-white mb-1">
                                {formatDate(meeting.date)}
                              </h3>
                              <div className="flex items-center space-x-3">
                                <span className="text-lg text-white/80 font-medium">
                                  {formatTime(meeting.time || '')}
                                </span>
                                {!isPastMeeting(meeting.date, meeting.time || '') && (
                                  <span className="bg-gradient-to-r from-green-400 to-emerald-400 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg animate-pulse">
                                    ✨ Upcoming
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {meeting.notes && (
                            <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mt-4 group-hover:from-white/15 group-hover:to-white/10 transition-all duration-300">
                              <p className="text-white/90 leading-relaxed">{meeting.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-3 ml-8">
                          {meeting.zoomLink && meeting.zoomLink !== '' && (
                            <a
                              href={meeting.zoomLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/btn relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 border border-white/20"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-xl blur group-hover/btn:blur-md transition-all duration-300"></div>
                              <span className="relative">🎥 Join Meeting</span>
                            </a>
                          )}
                          <button
                            onClick={() => setEditingMeeting(meeting)}
                            className="group/btn relative bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold border border-white/20 hover:bg-white/20 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-white/10"
                          >
                            <span className="relative">
                              {isAdmin ? '✏️ Edit' : '👁️ View Notes'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previous Meetings Section */}
          <div className="relative">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8"></div>
            <button
              onClick={() => setShowPrevious(!showPrevious)}
              className="group relative w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-101 shadow-lg hover:shadow-white/5"
            >
              <div className="flex items-center justify-center space-x-4">
                <span className={`text-2xl transform transition-transform duration-300 ${showPrevious ? 'rotate-180' : ''}`}>
                  ⬇️
                </span>
                <span className="text-xl font-bold text-white">
                  Previous Meetings
                </span>
                <div className="bg-gradient-to-r from-violet-500/80 to-indigo-500/80 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  {previousMeetings.length}
                </div>
              </div>
            </button>
            
            {showPrevious && (
              <div className="mt-8 space-y-4 max-h-96 overflow-y-auto custom-scrollbar animate-fadeIn">
                {previousMeetings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-white/60">No previous meetings found</p>
                  </div>
                ) : (
                  previousMeetings.map((meeting, index) => (
                    <div
                      key={meeting._id}
                      className="group relative opacity-0 animate-slideInUp"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-600/10 to-gray-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group-hover:scale-101 shadow-lg hover:shadow-white/5">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">
                                {getMeetingIcon(meeting.date, meeting.time || '')}
                              </span>
                              <div>
                                <h3 className="font-bold text-white/90 text-lg">
                                  {formatDate(meeting.date)}
                                </h3>
                                <span className="text-white/70">{formatTime(meeting.time || '')}</span>
                              </div>
                            </div>
                            
                            {meeting.notes && (
                              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5 mt-3">
                                <p className="text-white/80 text-sm leading-relaxed">{meeting.notes}</p>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => setEditingMeeting(meeting)}
                            className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/20 transform hover:scale-105 transition-all duration-300 ml-4"
                          >
                            {isAdmin ? '👁️ View/Edit' : '👁️ View Notes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Edit Meeting Modal */}
        {editingMeeting && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
            <div className="relative group max-w-lg w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-indigo-500/30 rounded-3xl blur-2xl"></div>
              
              <div className="relative backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl animate-slideInUp">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="text-3xl">✨</div>
                  <h3 className="text-2xl font-bold text-white">
                    {isAdmin ? 'Edit Meeting' : 'Meeting Details'}
                  </h3>
                </div>
                
                <div className="bg-gradient-to-r from-white/10 to-white/5 rounded-2xl p-4 mb-6 border border-white/10">
                  <p className="text-white/90 font-medium text-lg">
                    {formatDate(editingMeeting.date)} • {formatTime(editingMeeting.time || '')}
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-white font-semibold mb-3 flex items-center space-x-2">
                      <span>🕐</span>
                      <span>Meeting Time</span>
                    </label>
                    <input
                      type="time"
                      name="time"
                      defaultValue={editingMeeting.time || '13:00'}
                      disabled={!isAdmin}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-white placeholder-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-3 flex items-center space-x-2">
                      <span>🎥</span>
                      <span>Zoom Link</span>
                    </label>
                    <input
                      type="url"
                      name="zoomLink"
                      defaultValue={editingMeeting.zoomLink || ''}
                      placeholder="https://zoom.us/j/1234567890"
                      disabled={!isAdmin}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-white placeholder-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-3 flex items-center space-x-2">
                      <span>📝</span>
                      <span>Meeting Notes</span>
                    </label>
                    <textarea
                      name="notes"
                      rows={4}
                      defaultValue={editingMeeting.notes || ''}
                      placeholder="Add meeting notes, agenda, or any important information..."
                      disabled={!isAdmin}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-white placeholder-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 resize-none"
                    />
                  </div>
                  
                  <div className="flex space-x-4 pt-4">
                    <button
                      onClick={() => setEditingMeeting(null)}
                      className="flex-1 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
                    >
                      Close
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          const timeInput = document.querySelector('input[name="time"]') as HTMLInputElement;
                          const notesInput = document.querySelector('textarea[name="notes"]') as HTMLTextAreaElement;
                          const zoomLinkInput = document.querySelector('input[name="zoomLink"]') as HTMLInputElement;
                          
                          const notes = notesInput?.value || '';
                          const time = timeInput?.value || '';
                          const zoomLink = zoomLinkInput?.value || '';
                          
                          handleUpdateMeeting(editingMeeting._id, {
                            notes,
                            time,
                            zoomLink
                          });
                        }}
                        className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-2xl hover:shadow-violet-500/25 transform hover:scale-105 transition-all duration-300 border border-white/20"
                      >
                        ✨ Save Changes
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}