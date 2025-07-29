'use client';

import { useState } from 'react';
import { Calendar, User, Loader2 } from 'lucide-react';

interface ProcessWeekFormProps {
  onWeekProcessed: () => void;
}

export default function ProcessWeekForm({ onWeekProcessed }: ProcessWeekFormProps) {
  const [weekStart, setWeekStart] = useState('');
  const [username, setUsername] = useState(process.env.NEXT_PUBLIC_EXAMPLE_USER || 'TeamRHI');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const getDefaultWeekStart = () => {
    const today = new Date();
    const monday = new Date(today);
    const day = today.getDay();
    const diff = today.getDay() === 0 ? 6 : day - 1; // Sunday = 0, but we want Monday = 0
    monday.setDate(today.getDate() - diff);
    return monday.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!weekStart || !username) {
      setMessage('Please fill in all fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/process-week', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStart,
          username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Successfully processed week! Found ${data.totalTracks} tracks.`);
        setWeekStart('');
        onWeekProcessed();
      } else {
        setMessage(data.error || 'Failed to process week');
      }
    } catch (error) {
      setMessage('Error processing week. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="w-4 h-4 inline mr-1" />
            Last.fm Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter Last.fm username"
            required
          />
        </div>

        {/* Week Start */}
        <div>
          <label htmlFor="weekStart" className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Week Start Date
          </label>
          <input
            type="date"
            id="weekStart"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="button"
            onClick={() => setWeekStart(getDefaultWeekStart())}
            className="mt-1 text-sm text-blue-600 hover:text-blue-800"
          >
            Use current week
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center space-x-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Process Week'
          )}
        </button>

        {message && (
          <span className={`text-sm ${message.includes('Successfully') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
        <p className="font-medium mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Fetches your Last.fm scrobbles for the selected week</li>
          <li>Applies the algorithm: 1 point per stream + 0.5 points from previous week</li>
          <li>Saves the processed data to your local database</li>
          <li>Updates your charts with the new calculated points</li>
        </ul>
      </div>
    </form>
  );
} 