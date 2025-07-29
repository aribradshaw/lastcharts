'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Music, User, Disc } from 'lucide-react';
import WeekSelector from './WeekSelector';

interface WeekData {
  week_start: string;
}

interface StickyHeaderProps {
  currentWeek: string;
  availableWeeks: WeekData[];
  activeTab: 'songs' | 'artists' | 'albums';
  onWeekChange: (week: string) => void;
  onTabChange: (tab: 'songs' | 'artists' | 'albums') => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export default function StickyHeader({
  currentWeek,
  availableWeeks,
  activeTab,
  onWeekChange,
  onTabChange,
  onPreviousWeek,
  onNextWeek,
  canGoPrevious,
  canGoNext
}: StickyHeaderProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const tabs = [
    { id: 'songs', label: 'Songs', icon: Music },
    { id: 'artists', label: 'Artists', icon: User },
    { id: 'albums', label: 'Albums', icon: Disc },
  ];

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm backdrop-blur-sm bg-white/95">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Week Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onPreviousWeek}
              disabled={!canGoPrevious}
              className={`p-2 rounded-md transition-colors ${
                canGoPrevious 
                  ? 'hover:bg-gray-100 text-gray-600' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="text-center">
                <h1 className="text-lg font-bold text-gray-900">
                  Week of {new Date(currentWeek).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h1>
                <p className="text-xs text-gray-500">
                  {availableWeeks.length} weeks available
                </p>
              </div>
              
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                title="Select week from calendar"
              >
                <Calendar className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={onNextWeek}
              disabled={!canGoNext}
              className={`p-2 rounded-md transition-colors ${
                canGoNext 
                  ? 'hover:bg-gray-100 text-gray-600' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Center: Weeks on Chart Legend */}
          <div className="flex items-center space-x-4 text-xs text-gray-600">
            <span>Weeks on Chart:</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>1-4 weeks</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>5-9 weeks</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>10+ weeks</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id as any)}
                  className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Calendar Dropdown */}
        {showCalendar && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <WeekSelector
              availableWeeks={availableWeeks}
              selectedWeek={currentWeek}
              onWeekChange={(week) => {
                onWeekChange(week);
                setShowCalendar(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
} 