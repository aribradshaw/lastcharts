import { NextRequest, NextResponse } from 'next/server';
import { LastFmService } from '@/lib/lastfm';
import { initializeDatabase, saveRawData, hasRawData, saveSetting } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    initializeDatabase();
    const lastfmService = LastFmService.getInstance();
    
    const currentDate = new Date();
    const startDate = new Date('2012-01-01');
    const weeksFrom2012 = Math.ceil((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    console.log(`🔍 Importing raw data for ${username} from 2012-07-23 to current date...`);
    
    // Hardcode the earliest week we found
    const earliestWeekWithData = '2012-07-23';
    let weeksImported = 0;
    let weeksSkipped = 0;
    
    console.log(`🎯 Using hardcoded earliest week: ${earliestWeekWithData}`);
    
    // We know we have a valid start date, so no need to check
    
    // Save the starting week for future reference
    saveSetting('earliest_week', earliestWeekWithData);
    
    // Import all weeks from earliest to current date (limit to 25 weeks for testing)
    const earliestDate = new Date(earliestWeekWithData);
    const weeksToImport = Math.min(
      Math.ceil((currentDate.getTime() - earliestDate.getTime()) / (7 * 24 * 60 * 60 * 1000)),
      24 // Limit to 25 weeks total (earliest week + 24 more)
    );
    
    console.log(`📥 Importing ${weeksToImport + 1} weeks from ${earliestWeekWithData} (limited to 25 weeks for testing)...`);
    
    for (let i = 0; i <= weeksToImport; i++) {
      const weekDate = new Date(earliestDate);
      weekDate.setDate(weekDate.getDate() + (i * 7));
      const weekStartString = lastfmService.formatWeekStart(weekDate);
      const weekStartDate = lastfmService.getWeekStartDate(weekDate);
      
      // Skip if we already have the data
      if (hasRawData(weekStartString)) {
        console.log(`⏭️ Raw data already exists for ${weekStartString}`);
        continue;
      }
      
      try {
        console.log(`📥 Importing week: ${weekStartString} (${i + 1}/${weeksToImport + 1})`);
        const weeklyTracks = await lastfmService.getWeeklyScrobbles(username, weekStartDate);
        
        if (weeklyTracks.length > 0) {
          // Filter out tracks with missing required fields
          const validTracks = weeklyTracks.filter(track => 
            track.song_name && 
            track.artist_name &&
            track.scrobbles_this_week > 0
          );
          
          if (validTracks.length > 0) {
            saveRawData(weekStartString, validTracks);
            weeksImported++;
            console.log(`✅ Imported ${validTracks.length} tracks for ${weekStartString}`);
          } else {
            console.log(`⚠️ No valid tracks found for ${weekStartString}`);
          }
        } else {
          console.log(`❌ No tracks found in ${weekStartString}`);
        }
      } catch (error) {
        console.error(`Error importing week ${weekStartString}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Import completed!`,
      stats: {
        weeksImported,
        weeksSkipped,
        earliestWeek: earliestWeekWithData,
        totalWeeks: weeksToImport + 1
      }
    });
    
  } catch (error) {
    console.error('Error importing raw data:', error);
    return NextResponse.json(
      { error: 'Failed to import raw data' },
      { status: 500 }
    );
  }
} 