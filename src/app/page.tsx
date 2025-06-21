'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/meetings')
      .then(response => {
        if (response.status === 401) {
          router.push('/login');
        } else {
          router.push('/calendar');
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Calendar CMS</h1>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}