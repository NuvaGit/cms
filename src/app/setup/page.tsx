'use client';

import { useState } from 'react';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
      });

      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Calendar CMS Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Initialize the database with test users
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          {message && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              {message}
            </div>
          )}
          
          <div className="bg-gray-100 p-4 rounded-md">
            <h3 className="font-semibold mb-2">Test Users that will be created:</h3>
            <ul className="text-sm space-y-1">
              <li>• admin@company.com (password: admin123)</li>
              <li>• john@company.com (password: john123)</li>
              <li>• jane@company.com (password: jane123)</li>
              <li>• bob@company.com (password: bob123)</li>
            </ul>
          </div>

          <button
            onClick={handleSetup}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Initialize Database'}
          </button>
          
          <div className="text-center">
            <a
              href="/login"
              className="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              Go to Login →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}