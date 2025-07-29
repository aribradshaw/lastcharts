'use client';

import { useState } from 'react';
import { Download, Calculator, RotateCcw } from 'lucide-react';

interface DataManagementFormProps {
  onDataUpdated: () => void;
}

export default function DataManagementForm({ onDataUpdated }: DataManagementFormProps) {
  const [username, setUsername] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [calculateStatus, setCalculateStatus] = useState('');
  const [importResults, setImportResults] = useState<any>(null);
  const [calculateResults, setCalculateResults] = useState<any>(null);

  const handleImportRawData = async () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    setIsImporting(true);
    setImportStatus('🔍 Finding earliest week with scrobbles...');

    try {
      const response = await fetch('/api/import-raw-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const result = await response.json();

      if (response.ok) {
        setImportStatus('✅ Import completed!');
        setImportResults(result);
        onDataUpdated();
      } else {
        setImportStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setImportStatus(`❌ Error: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCalculateCharts = async () => {
    setIsCalculating(true);
    setCalculateStatus('📊 Calculating charts from raw data...');

    try {
      const response = await fetch('/api/calculate-charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setCalculateStatus('✅ Chart calculation completed!');
        setCalculateResults(result);
        onDataUpdated();
      } else {
        setCalculateStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setCalculateStatus(`❌ Error: ${(error as Error).message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Data Management</h2>
      
      <div className="mb-4">
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
          Last.fm Username
        </label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter Last.fm username"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Import Raw Data */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Step 1: Import Raw Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Download all scrobble data from Last.fm and save it locally. This only needs to be done once.
          </p>
          
          <button
            onClick={handleImportRawData}
            disabled={isImporting || !username.trim()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isImporting ? 'Importing...' : 'Import Raw Data'}
          </button>
          
          {importStatus && (
            <div className="mt-3 p-3 bg-gray-100 rounded-md">
              <p className="text-sm">{importStatus}</p>
              {importResults && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Weeks imported: {importResults.stats?.weeksImported}</p>
                  <p>Weeks skipped: {importResults.stats?.weeksSkipped}</p>
                  <p>Earliest week: {importResults.stats?.earliestWeek}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Calculate Charts */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Step 2: Calculate Charts
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Apply the chart algorithm to raw data. Can be recalculated anytime to test different algorithms.
          </p>
          
          <button
            onClick={handleCalculateCharts}
            disabled={isCalculating}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Charts'}
          </button>
          
          {calculateStatus && (
            <div className="mt-3 p-3 bg-gray-100 rounded-md">
              <p className="text-sm">{calculateStatus}</p>
              {calculateResults && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>Weeks processed: {calculateResults.stats?.weeksProcessed}</p>
                  <p>Total weeks: {calculateResults.stats?.totalWeeks}</p>
                  <p>Earliest: {calculateResults.stats?.earliestWeek}</p>
                  <p>Latest: {calculateResults.stats?.latestWeek}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h4 className="font-semibold text-yellow-800 mb-2">How it works:</h4>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li>1. <strong>Import Raw Data:</strong> Downloads all your Last.fm scrobbles from 2012 to present</li>
          <li>2. <strong>Calculate Charts:</strong> Applies the algorithm (1 point per stream + 0.5 from previous week)</li>
          <li>3. <strong>Recalculate:</strong> You can recalculate anytime to test different algorithms</li>
        </ol>
      </div>
    </div>
  );
} 