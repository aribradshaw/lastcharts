import { NextRequest, NextResponse } from 'next/server';
import { ChartAlgorithm } from '@/lib/chartAlgorithm';
import { initializeDatabase, getRawData, getWeeksWithRawData, saveChartData, clearChartData, getSetting, getAllSongsForWeek } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    initializeDatabase();
    
    // Clear existing chart data
    clearChartData();
    console.log('🗑️ Cleared existing chart data');
    
    // Get all weeks with raw data (limit to 25 weeks for testing)
    const weeksWithData = getWeeksWithRawData();
    if (weeksWithData.length === 0) {
      return NextResponse.json(
        { error: 'No raw data found. Please import data first.' },
        { status: 404 }
      );
    }
    
    // Limit to first 25 weeks for testing
    const limitedWeeks = weeksWithData.slice(0, 25);
    
    console.log(`📊 Calculating charts for ${limitedWeeks.length} weeks (limited to 25 weeks for testing)...`);
    
    let weeksProcessed = 0;
    const results = [];
    
    // Process weeks chronologically
    for (let i = 0; i < limitedWeeks.length; i++) {
      const weekStart = limitedWeeks[i].week_start;
      
      try {
        console.log(`📊 Processing week: ${weekStart} (${i + 1}/${limitedWeeks.length})`);
        
        // Get ALL songs for this week (current scrobbles + carryover candidates)
        const allSongs = getAllSongsForWeek(weekStart);
        
        if (allSongs.length === 0) {
          console.log(`❌ No songs found for ${weekStart}`);
          continue;
        }
        
        console.log(`🎵 Found ${allSongs.length} songs to process for ${weekStart}`);
        
        // Convert to the format expected by the algorithm
        const tracksForAlgorithm = allSongs.map((song: any) => ({
          song_name: song.song_name,
          artist_name: song.artist_name,
          album_name: song.album_name || '',
          album_art: song.album_art || '',
          scrobbles_this_week: song.current_scrobbles || 0,
          points: 0,
          points_from_current_week: 0,
          points_from_previous_week: 0
        }));
        
        // Apply the algorithm
        const processedTracks = await ChartAlgorithm.processWeeklyData(tracksForAlgorithm, weekStart);
        
        // Calculate positions using the new database-based tracking
        const tracksWithPositions = ChartAlgorithm.calculatePositions(processedTracks, weekStart);
        
        // Save to database
        saveChartData(weekStart, tracksWithPositions);
        
        weeksProcessed++;
        results.push({
          week: weekStart,
          tracks: tracksWithPositions.length,
          status: 'success'
        });
        
        console.log(`✅ Processed ${tracksWithPositions.length} tracks for ${weekStart}`);
        
      } catch (error) {
        console.error(`Error processing week ${weekStart}:`, error);
        results.push({
          week: weekStart,
          error: (error as Error).message,
          status: 'error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Chart calculation completed!`,
      stats: {
        weeksProcessed,
        totalWeeks: limitedWeeks.length,
        earliestWeek: limitedWeeks[0]?.week_start,
        latestWeek: limitedWeeks[limitedWeeks.length - 1]?.week_start
      },
      results
    });
    
  } catch (error) {
    console.error('Error calculating charts:', error);
    return NextResponse.json(
      { error: 'Failed to calculate charts' },
      { status: 500 }
    );
  }
} 