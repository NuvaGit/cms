'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  email: string;
  name: string;
  role?: string;
}

interface Config {
  defaultZoomLink: string;
  meetingDay1?: number;
  meetingDay2?: number;
  meetingTime1?: string;
  meetingTime2?: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newZoomLink, setNewZoomLink] = useState('');
  const [meetingConfig, setMeetingConfig] = useState({
    meetingDay1: 4,
    meetingDay2: 6,
    meetingTime1: '19:00',
    meetingTime2: '13:00'
  });
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user'
  });
  const router = useRouter();

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (response.status === 401) {
        router.push('/login');
        return;
      } else if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [router]);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      // First check if user is authenticated by trying to fetch config
      const response = await fetch('/api/config');
      
      if (response.status === 401) {
        // User is not authenticated, redirect to login
        console.log('❌ User not authenticated, redirecting to login');
        router.push('/login');
        return;
      } else if (response.status === 403) {
        // User is authenticated but not admin, redirect to calendar
        console.log('❌ User not admin, redirecting to calendar');
        alert('Admin access required');
        router.push('/calendar');
        return;
      } else if (response.ok) {
        // User is authenticated and is admin, load the data
        const configData: Config = await response.json();
        setNewZoomLink(configData.defaultZoomLink);
        setMeetingConfig({
          meetingDay1: configData.meetingDay1 || 4,
          meetingDay2: configData.meetingDay2 || 6,
          meetingTime1: configData.meetingTime1 || '19:00',
          meetingTime2: configData.meetingTime2 || '13:00'
        });
        
        // Now fetch users
        await fetchUsers();
      } else {
        // Some other error
        console.error('❌ Config fetch error:', response.status);
        alert('Error loading admin panel');
        router.push('/calendar');
        return;
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
      // On network error, assume not authenticated
      router.push('/login');
      return;
    } finally {
      setLoading(false);
    }
  }, [router, fetchUsers]);

  useEffect(() => {
    // Check authentication first, then load data
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          defaultZoomLink: newZoomLink,
          ...meetingConfig
        }),
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      } else if (response.ok) {
        alert('Configuration saved successfully!');
      } else {
        alert('Failed to save configuration');
      }
    } catch (_error) {
      console.error('Error saving configuration:', _error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      } else if (response.ok) {
        const data = await response.json();
        setUsers([...users, data.user]);
        setNewUser({ email: '', password: '', name: '', role: 'user' });
        setShowCreateUser(false);
        alert('User created successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create user');
      }
    } catch (_error) {
      console.error('Error creating user:', _error);
      alert('Error creating user');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      } else if (response.ok) {
        setUsers(users.filter(u => u._id !== userId));
        alert('User deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (_error) {
      console.error('Error deleting user:', _error);
      alert('Error deleting user');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-xl text-white">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/calendar')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Back to Calendar
              </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Settings */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 text-white">Meeting Configuration</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="zoomLink" className="block text-sm font-medium text-gray-200 mb-2">
                  Default Zoom Link
                </label>
                <input
                  id="zoomLink"
                  type="url"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-300"
                  placeholder="https://zoom.us/j/1234567890"
                  value={newZoomLink}
                  onChange={(e) => setNewZoomLink(e.target.value)}
                />
                <p className="text-sm text-gray-300 mt-2">
                  This link will be used for all future meetings
                </p>
              </div>

              <div className="border-t border-white/20 pt-4">
                <h3 className="text-lg font-medium text-white mb-4">Meeting Schedule</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      First Meeting Day
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      value={meetingConfig.meetingDay1}
                      onChange={(e) => setMeetingConfig({...meetingConfig, meetingDay1: parseInt(e.target.value)})}
                    >
                      {dayNames.map((day, index) => (
                        <option key={index} value={index} className="text-gray-900">{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      First Meeting Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      value={meetingConfig.meetingTime1}
                      onChange={(e) => setMeetingConfig({...meetingConfig, meetingTime1: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Second Meeting Day
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      value={meetingConfig.meetingDay2}
                      onChange={(e) => setMeetingConfig({...meetingConfig, meetingDay2: parseInt(e.target.value)})}
                    >
                      {dayNames.map((day, index) => (
                        <option key={index} value={index} className="text-gray-900">{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Second Meeting Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      value={meetingConfig.meetingTime2}
                      onChange={(e) => setMeetingConfig({...meetingConfig, meetingTime2: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-200">
                    Current Schedule: {dayNames[meetingConfig.meetingDay1]} {meetingConfig.meetingTime1} • {dayNames[meetingConfig.meetingDay2]} {meetingConfig.meetingTime2}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">User Management ({users.length})</h2>
              <button
                onClick={() => setShowCreateUser(!showCreateUser)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {showCreateUser ? 'Cancel' : 'Add User'}
              </button>
            </div>

            {/* Create User Form */}
            {showCreateUser && (
              <form onSubmit={handleCreateUser} className="mb-6 p-4 bg-white/10 rounded-lg border border-white/20">
                <h3 className="text-lg font-medium text-white mb-4">Create New User</h3>
                <div className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-300"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-300"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-300"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    required
                  />
                  <select
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  >
                    <option value="user" className="text-gray-900">User</option>
                    <option value="admin" className="text-gray-900">Admin</option>
                  </select>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Create User
                  </button>
                </div>
              </form>
            )}
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex justify-between items-center p-4 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm"
                >
                  <div>
                    <h4 className="font-medium text-white">{user.name}</h4>
                    <p className="text-sm text-gray-300">{user.email}</p>
                    {user.role === 'admin' && (
                      <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full mt-1">
                        Admin
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteUser(user._id, user.email)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-all duration-200"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}