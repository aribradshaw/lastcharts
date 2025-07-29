'use client';

import { useState } from 'react';
import { Calendar, User, Loader2, Database } from 'lucide-react';

interface ProcessAllWeeksFormProps {
  onWeeksProcessed: () => void;
}

interface ProcessingResult {
  week: string;
  tracks: number;
  success: boolean;
  message?: string;
}

interface ProcessingStatus {
  phase: 'discovery' | 'processing' | 'complete';
  currentWeek?: string;
  totalWeeks?: number;
  currentWeekIndex?: number;
  weeksFound?: number;
  totalTracks?: number;
}

export default function ProcessAllWeeksForm({ onWeeksProcessed }: ProcessAllWeeksFormProps) {
  const [username, setUsername] = useState(process.env.NEXT_PUBLIC_EXAMPLE_USER || 'TeamRHI');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      setMessage('Please enter your Last.fm username');
      return;
    }

    setLoading(true);
    setMessage('');
    setProcessingResults([]);
    setShowResults(false);
    setProcessingStatus({ phase: 'discovery' });

    try {
      const response = await fetch('/api/process-all-weeks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Successfully processed ${data.processedWeeks} weeks with ${data.totalTracks} total tracks!`);
        setProcessingResults(data.results || []);
        setShowResults(true);
        setProcessingStatus({ phase: 'complete', totalTracks: data.totalTracks });
        onWeeksProcessed();
      } else {
        setMessage(data.error || 'Failed to process weeks');
        setProcessingStatus(null);
      }
          } catch (error) {
        setMessage('Error processing weeks. Please try again.');
        console.error('Error:', error);
        setProcessingStatus(null);
      } finally {
        setLoading(false);
      }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
    ) : (
      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
    );
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
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
              <>
                <Database className="w-4 h-4 mr-2" />
                Process All Weeks
              </>
            )}
          </button>

          {message && (
            <span className={`text-sm ${message.includes('Successfully') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </span>
          )}
        </div>
      </form>

      {/* Progress Bar */}
      {processingStatus && (
        <div className="mt-6">
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {processingStatus.phase === 'discovery' && '🔍 Discovering your scrobble history...'}
                {processingStatus.phase === 'processing' && '📊 Processing weeks...'}
                {processingStatus.phase === 'complete' && '✅ Processing complete!'}
              </span>
              {processingStatus.currentWeek && (
                <span className="text-xs text-gray-500">
                  {processingStatus.currentWeek}
                </span>
              )}
            </div>
            
            {processingStatus.phase === 'discovery' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            )}
            
            {processingStatus.phase === 'processing' && processingStatus.totalWeeks && processingStatus.currentWeekIndex && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(processingStatus.currentWeekIndex / processingStatus.totalWeeks) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600">
                  Week {processingStatus.currentWeekIndex} of {processingStatus.totalWeeks} 
                  ({Math.round((processingStatus.currentWeekIndex / processingStatus.totalWeeks) * 100)}%)
                </div>
              </div>
            )}
            
            {processingStatus.phase === 'complete' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            )}
            
            {processingStatus.weeksFound && (
              <div className="text-xs text-gray-600 mt-1">
                Found {processingStatus.weeksFound} weeks with scrobbles
              </div>
            )}
            
            {processingStatus.totalTracks && (
              <div className="text-xs text-gray-600 mt-1">
                Total tracks processed: {processingStatus.totalTracks}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Results */}
      {showResults && processingResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Processing Results</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="grid gap-2">
              {processingResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.success)}
                    <span className="font-medium">{result.week}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {result.success ? (
                      <span className="text-green-600">{result.tracks} tracks</span>
                    ) : (
                      <span className="text-red-600">{result.message}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
        <p className="font-medium mb-1">How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Automatically finds your earliest week with scrobbles (goes back as far as possible)</li>
          <li>Processes ALL weeks chronologically from earliest to latest</li>
          <li>Applies the algorithm: 1 point per stream + 0.5 points from previous week</li>
          <li>Saves all processed data to your local database</li>
          <li>Creates a complete chart history for browsing</li>
          <li>Real-time progress tracking with detailed status updates</li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">
          <strong>Note:</strong> This may take several minutes depending on your scrobble history. The algorithm processes weeks chronologically to ensure accurate point calculations.
        </p>
      </div>
    </div>
  );
} 