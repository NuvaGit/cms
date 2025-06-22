'use client';

import { useState } from 'react';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
      });

      const data = await response.json();
      setMessage(data.message);
      
      if (response.ok && data.adminEmail) {
        setIsComplete(true);
      }
    } catch (error) {
      setMessage('Setup failed - please check your connection and try again');
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
            Initialize the system with an administrator account
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          {message && (
            <div className={`border px-4 py-3 rounded ${
              isComplete 
                ? 'bg-green-100 border-green-400 text-green-700' 
                : 'bg-blue-100 border-blue-400 text-blue-700'
            }`}>
              {message}
            </div>
          )}
          
          <div className="bg-gray-100 p-4 rounded-md">
            <h3 className="font-semibold mb-2">Initial Setup Information:</h3>
            <ul className="text-sm space-y-1">
              <li>• Creates one administrator account</li>
              <li>• Email: admin@calendarcms.com</li>
              <li>• Password: admin123</li>
              <li>• Use the admin panel to create additional users</li>
            </ul>
          </div>

          {!isComplete ? (
            <button
              onClick={handleSetup}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Initializing System...' : 'Initialize Calendar CMS'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <strong>Important:</strong> Please change the default admin password after your first login!
              </div>
              <a
                href="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Continue to Login →
              </a>
            </div>
          )}
          
          {!isComplete && (
            <div className="text-center">
              <a
                href="/login"
                className="text-indigo-600 hover:text-indigo-500 text-sm"
              >
                Already set up? Go to Login →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}