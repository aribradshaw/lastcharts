'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekNavigationProps {
  currentWeek: string;
  availableWeeks: { week_start: string }[];
  onWeekChange: (week: string) => void;
}

export default function WeekNavigation({ currentWeek, availableWeeks, onWeekChange }: WeekNavigationProps) {
  const currentIndex = availableWeeks.findIndex(week => week.week_start === currentWeek);
  const hasPrevious = currentIndex < availableWeeks.length - 1;
  const hasNext = currentIndex > 0;

  const handlePrevious = () => {
    if (hasPrevious) {
      onWeekChange(availableWeeks[currentIndex + 1].week_start);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onWeekChange(availableWeeks[currentIndex - 1].week_start);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={handlePrevious}
          disabled={!hasPrevious}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous Week
        </button>
        
        <span className="text-sm text-gray-500">
          Week {availableWeeks.length - currentIndex} of {availableWeeks.length}
        </span>
        
        <button
          onClick={handleNext}
          disabled={!hasNext}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Week
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      
      <div className="text-sm text-gray-600">
        {new Date(currentWeek).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    </div>
  );
} 