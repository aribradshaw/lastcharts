'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChartTab from '@/components/ChartTab';
import DataManagementForm from '@/components/DataManagementForm';
import StickyHeader from '@/components/StickyHeader';
import { TrendingUp, Music, User, Disc } from 'lucide-react';

interface ChartData {
  song_name: string;
  artist_name: string;
  album_name: string;
  album_art: string;
  position: number;
  previous_position: number | null;
  peak_position: number;
  points: number;
  points_from_current_week: number;
  points_from_previous_week: number;
  scrobbles_this_week: number;
}

interface WeekData {
  week_start: string;
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'songs' | 'artists' | 'albums'>('songs');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<WeekData[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Initialize from URL parameters
  useEffect(() => {
    const weekParam = searchParams.get('week');
    const tabParam = searchParams.get('tab') as 'songs' | 'artists' | 'albums';
    
    if (weekParam) {
      setSelectedWeek(weekParam);
    }
    
    if (tabParam && ['songs', 'artists', 'albums'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Validate selected week exists in available weeks and handle URL parameters after weeks are loaded
  useEffect(() => {
    if (availableWeeks.length > 0) {
      const weekParam = searchParams.get('week');
      
      // If there's a URL parameter but no selected week, set it
      if (weekParam && !selectedWeek) {
        setSelectedWeek(weekParam);
      }
      
      // Validate the selected week exists
      if (selectedWeek) {
        const weekExists = availableWeeks.some(week => week.week_start === selectedWeek);
        if (!weekExists) {
          // If selected week doesn't exist, fall back to the most recent week
          console.warn(`Week ${selectedWeek} not found in available weeks, falling back to most recent`);
          const mostRecentWeek = availableWeeks[0].week_start;
          setSelectedWeek(mostRecentWeek);
          updateURL(mostRecentWeek);
        }
      }
    }
  }, [availableWeeks, selectedWeek, searchParams]);

  // Update URL when state changes
  const updateURL = (week?: string, tab?: 'songs' | 'artists' | 'albums') => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (week) {
      params.set('week', week);
    }
    
    if (tab) {
      params.set('tab', tab);
    }
    
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    fetchAvailableWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchChartData(selectedWeek);
    }
  }, [selectedWeek]);

  const fetchAvailableWeeks = async () => {
    try {
      const response = await fetch('/api/charts');
      const data = await response.json();
      if (data.weeks && data.weeks.length > 0) {
        setAvailableWeeks(data.weeks);
        // Only set default week if no week is currently selected AND no URL parameter exists
        const weekParam = searchParams.get('week');
        if (!selectedWeek && !weekParam) {
          setSelectedWeek(data.weeks[0].week_start);
          updateURL(data.weeks[0].week_start);
        }
      }
    } catch (error) {
      console.error('Error fetching weeks:', error);
    }
  };

  const fetchChartData = async (weekStart: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/charts?week=${weekStart}`);
      const data = await response.json();
      if (data.chartData) {
        setChartData(data.chartData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (week: string) => {
    setSelectedWeek(week);
    updateURL(week);
  };

  const handleTabChange = (tab: 'songs' | 'artists' | 'albums') => {
    setActiveTab(tab);
    updateURL(undefined, tab);
  };

  const handlePreviousWeek = () => {
    const currentIndex = availableWeeks.findIndex(week => week.week_start === selectedWeek);
    if (currentIndex < availableWeeks.length - 1) {
      const previousWeek = availableWeeks[currentIndex + 1].week_start;
      handleWeekChange(previousWeek);
    }
  };

  const handleNextWeek = () => {
    const currentIndex = availableWeeks.findIndex(week => week.week_start === selectedWeek);
    if (currentIndex > 0) {
      const nextWeek = availableWeeks[currentIndex - 1].week_start;
      handleWeekChange(nextWeek);
    }
  };

  const canGoPrevious = () => {
    const currentIndex = availableWeeks.findIndex(week => week.week_start === selectedWeek);
    return currentIndex < availableWeeks.length - 1;
  };

  const canGoNext = () => {
    const currentIndex = availableWeeks.findIndex(week => week.week_start === selectedWeek);
    return currentIndex > 0;
  };

  const getFilteredData = () => {
    if (activeTab === 'songs') {
      return chartData;
    } else if (activeTab === 'artists') {
      // Group by artist and sum points
      const artistMap = new Map<string, ChartData>();
      chartData.forEach(track => {
        const key = track.artist_name;
        if (artistMap.has(key)) {
          const existing = artistMap.get(key)!;
          existing.points += track.points;
          existing.points_from_current_week += track.points_from_current_week;
          existing.points_from_previous_week += track.points_from_previous_week;
          existing.scrobbles_this_week += track.scrobbles_this_week;
        } else {
          artistMap.set(key, { ...track });
        }
      });
      return Array.from(artistMap.values())
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({
          ...item,
          position: index + 1,
          previous_position: null, // Reset for aggregated view
          peak_position: index + 1,
          weeks_on_chart: 0, // Reset for aggregated view
          is_new_entry: false,
          is_recurring: false
        }));
    } else {
      // Group by album and sum points
      const albumMap = new Map<string, ChartData>();
      chartData.forEach(track => {
        const key = `${track.artist_name}-${track.album_name}`;
        if (albumMap.has(key)) {
          const existing = albumMap.get(key)!;
          existing.points += track.points;
          existing.points_from_current_week += track.points_from_current_week;
          existing.points_from_previous_week += track.points_from_previous_week;
          existing.scrobbles_this_week += track.scrobbles_this_week;
        } else {
          albumMap.set(key, { ...track });
        }
      });
      return Array.from(albumMap.values())
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({
          ...item,
          position: index + 1,
          previous_position: null, // Reset for aggregated view
          peak_position: index + 1,
          weeks_on_chart: 0, // Reset for aggregated view
          is_new_entry: false,
          is_recurring: false
        }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Management Form */}
      <DataManagementForm onDataUpdated={fetchAvailableWeeks} />

      {/* Sticky Header */}
      {availableWeeks.length > 0 && selectedWeek && (
        <StickyHeader
          currentWeek={selectedWeek}
          availableWeeks={availableWeeks}
          activeTab={activeTab}
          onWeekChange={handleWeekChange}
          onTabChange={handleTabChange}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          canGoPrevious={canGoPrevious()}
          canGoNext={canGoNext()}
        />
      )}

      {/* Chart Display */}
      {selectedWeek && (
        <div className="bg-white rounded-lg shadow">
          {/* Chart Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading chart data...</p>
              </div>
            ) : (
              <ChartTab
                data={getFilteredData()}
                type={activeTab}
                weekStart={selectedWeek}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
} 