import { NextRequest, NextResponse } from 'next/server';
import { LastFmService } from '@/lib/lastfm';
import { ChartAlgorithm } from '@/lib/chartAlgorithm';
import { saveChartData, getChartData, initializeDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Initialize database if needed
    initializeDatabase();
    
    const { weekStart, username } = await request.json();
    
    if (!weekStart || !username) {
      return NextResponse.json(
        { error: 'Week start date and username are required' },
        { status: 400 }
      );
    }

    const lastfmService = LastFmService.getInstance();
    const weekStartDate = new Date(weekStart);
    
    // Get weekly scrobbles from Last.fm
    const weeklyTracks = await lastfmService.getWeeklyScrobbles(username, weekStartDate);
    
    if (weeklyTracks.length === 0) {
      return NextResponse.json(
        { error: 'No scrobbles found for this week' },
        { status: 404 }
      );
    }

    // Process the data with our algorithm
    const processedTracks = await ChartAlgorithm.processWeeklyData(weeklyTracks, weekStart);
    
    // Get previous week data for position calculations
    const previousWeekStart = lastfmService.getPreviousWeekStart(weekStartDate);
    const previousWeekData = getChartData(lastfmService.formatWeekStart(previousWeekStart));
    
    // Calculate positions
    const finalTracks = ChartAlgorithm.calculatePositions(processedTracks, previousWeekData);
    
    // Save to database
    saveChartData(weekStart, finalTracks);
    
    return NextResponse.json({
      success: true,
      weekStart,
      totalTracks: finalTracks.length,
      tracks: finalTracks.slice(0, 10) // Return top 10 for preview
    });
    
  } catch (error) {
    console.error('Error processing week:', error);
    return NextResponse.json(
      { error: 'Failed to process week data' },
      { status: 500 }
    );
  }
} 