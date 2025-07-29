'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekSelectorProps {
  availableWeeks: { week_start: string }[];
  selectedWeek: string;
  onWeekChange: (week: string) => void;
}

export default function WeekSelector({ availableWeeks, selectedWeek, onWeekChange }: WeekSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const selectedDate = new Date(selectedWeek);
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });

  const getWeeksInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // Add days from previous month to fill first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(firstDay);
      prevDate.setDate(prevDate.getDate() - i - 1);
      currentWeek.push(prevDate);
    }
    
    // Add all days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      currentWeek.push(currentDate);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Add days from next month to fill last week
    while (currentWeek.length < 7) {
      const nextDate = new Date(lastDay);
      nextDate.setDate(lastDay.getDate() + currentWeek.length + 1);
      currentWeek.push(nextDate);
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const formatWeekStart = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isWeekAvailable = (weekStart: Date) => {
    const weekString = formatWeekStart(weekStart);
    return availableWeeks.some(week => week.week_start === weekString);
  };

  const isWeekSelected = (weekStart: Date) => {
    const weekString = formatWeekStart(weekStart);
    return selectedWeek === weekString;
  };

  const handleWeekClick = (weekStart: Date) => {
    const weekString = formatWeekStart(weekStart);
    if (isWeekAvailable(weekStart)) {
      onWeekChange(weekString);
      setIsOpen(false);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const weeks = getWeeksInMonth(currentMonth);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Calendar className="w-4 h-4" />
        <span>Select Week</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-80">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              onClick={() => changeMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-semibold">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => changeMonth('next')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((date, dayIndex) => {
                  const weekStart = getWeekStart(date);
                  const isAvailable = isWeekAvailable(weekStart);
                  const isSelected = isWeekSelected(weekStart);
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  
                  return (
                    <button
                      key={dayIndex}
                      onClick={() => handleWeekClick(weekStart)}
                      disabled={!isAvailable}
                      className={`
                        p-2 text-xs rounded-md transition-colors
                        ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                        ${isAvailable ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-not-allowed opacity-50'}
                        ${isSelected ? 'bg-blue-500 text-white' : ''}
                        ${isAvailable && !isSelected ? 'hover:bg-blue-50' : ''}
                      `}
                    >
                      {date.getDate()}
                      {isAvailable && (
                        <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Available weeks</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>No data</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 