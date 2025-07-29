'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';

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
  weeks_on_chart?: number;
  is_new_entry?: boolean;
  is_recurring?: boolean;
  last_on_chart?: string | null;
}

interface ChartTabProps {
  data: ChartData[];
  type: 'songs' | 'artists' | 'albums';
  weekStart: string;
}

export default function ChartTab({ data, type, weekStart }: ChartTabProps) {
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  const getPositionChange = (current: number, previous: number | null) => {
    if (!previous) return 'new';
    if (current < previous) return 'up';
    if (current > previous) return 'down';
    return 'same';
  };

  const getPositionIcon = (change: string) => {
    switch (change) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'new':
        return <Star className="w-4 h-4 text-blue-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPositionChangeText = (current: number, previous: number | null) => {
    // Properly handle null, undefined, and 0 values
    if (previous === null || previous === undefined) return 'NEW';
    const diff = previous - current;
    if (diff > 0) return `+${diff}`;
    if (diff < 0) return `${diff}`;
    return '—';
  };

  const getDisplayName = (item: ChartData) => {
    switch (type) {
      case 'songs':
        return item.song_name;
      case 'artists':
        return item.artist_name;
      case 'albums':
        return item.album_name || 'Unknown Album';
      default:
        return item.song_name;
    }
  };

  const getSubtitle = (item: ChartData) => {
    switch (type) {
      case 'songs':
        return `${item.artist_name} • ${item.album_name || 'Unknown Album'}`;
      case 'artists':
        return `${item.scrobbles_this_week} scrobbles this week`;
      case 'albums':
        return `${item.artist_name} • ${item.scrobbles_this_week} scrobbles`;
      default:
        return item.artist_name;
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data available for this week.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 capitalize">
            {type} Chart
          </h3>
          <p className="text-sm text-gray-500">
            Showing top 100 • {data.length} total {type} tracked
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {data.slice(0, 100).map((item, index) => {
          const positionChange = getPositionChange(item.position, item.previous_position);
          // Only show peak if current position is actually the best position ever achieved
          const isPeak = item.position <= 100 && 
                        item.position === item.peak_position && 
                        item.weeks_on_chart && 
                        item.weeks_on_chart > 1 &&
                        item.previous_position; // Must have a previous position to be at peak

          return (
            <div
              key={`${item.song_name}-${item.artist_name}-${index}`}
              className="chart-card relative"
              onMouseEnter={() => setHoveredItem(index)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex items-start space-x-4">
                {/* Position */}
                <div className="flex items-start space-x-3 min-w-[120px]">
                  <span className="text-2xl font-bold text-gray-900 w-12 text-center">
                    {item.position}
                  </span>
                  <div className="flex flex-col items-center w-16 min-h-[60px] justify-start">
                    {getPositionIcon(positionChange)}
                    {item.is_new_entry ? (
                      <span className="px-1 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded mt-1">
                        NEW
                      </span>
                    ) : item.is_recurring ? (
                      <span className="px-1 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded mt-1">
                        RECURRING
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 mt-1">
                        {getPositionChangeText(item.position, item.previous_position)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Album Art */}
                <div className="w-16 h-16 flex-shrink-0 mt-1">
                  {item.album_art ? (
                    <img
                      src={item.album_art}
                      alt="Album art"
                      className="w-full h-full object-cover rounded-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-album.png';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Art</span>
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0 mt-1">
                  <h4 className="text-lg font-semibold text-gray-900 truncate">
                    {getDisplayName(item)}
                  </h4>
                  <p className="text-sm text-gray-600 truncate">
                    {getSubtitle(item)}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {isPeak && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Peak Position
                      </span>
                    )}
                    {item.previous_position && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        Last: #{item.previous_position}
                      </span>
                    )}
                    {item.weeks_on_chart && item.weeks_on_chart > 0 ? (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                        {item.weeks_on_chart} week{item.weeks_on_chart > 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {item.is_recurring && item.last_on_chart ? (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        Last on Chart: {new Date(item.last_on_chart).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Points and Weeks on Chart */}
                <div className="text-right mt-1">
                  <div className="relative">
                    <div className="flex items-center justify-end space-x-2">
                      <div>
                        <span className="text-xl font-bold text-gray-900">
                          {item.points.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">pts</span>
                      </div>
                      
                      {/* Weeks on Chart Indicator */}
                      {item.weeks_on_chart && item.weeks_on_chart > 0 ? (
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            item.weeks_on_chart >= 10 ? 'bg-red-500' :
                            item.weeks_on_chart >= 5 ? 'bg-orange-500' :
                            'bg-purple-500'
                          }`}></div>
                          <span className={`text-sm font-medium ${
                            item.weeks_on_chart >= 10 ? 'text-red-700' :
                            item.weeks_on_chart >= 5 ? 'text-orange-700' :
                            'text-purple-700'
                          }`}>
                            {item.weeks_on_chart} week{item.weeks_on_chart > 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    
                    {/* Points breakdown tooltip */}
                    {hoveredItem === index && (
                      <div className="absolute bottom-full right-0 mb-2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-10 min-w-48">
                        <div className="font-semibold mb-2">Points Breakdown:</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>This Week:</span>
                            <span className="text-green-400">
                              {item.points_from_current_week.toFixed(2)} pts
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>From Previous:</span>
                            <span className="text-blue-400">
                              {item.points_from_previous_week.toFixed(2)} pts
                            </span>
                          </div>
                          <div className="border-t border-gray-700 pt-1 mt-1">
                            <div className="flex justify-between font-semibold">
                              <span>Total:</span>
                              <span>{item.points.toFixed(2)} pts</span>
                            </div>
                          </div>
                          {item.weeks_on_chart && item.weeks_on_chart > 0 ? (
                            <div className="border-t border-gray-700 pt-1 mt-1">
                              <div className="flex justify-between">
                                <span>Weeks on Chart:</span>
                                <span className="text-purple-400">
                                  {item.weeks_on_chart} week{item.weeks_on_chart > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 