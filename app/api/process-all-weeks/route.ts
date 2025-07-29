import { NextRequest, NextResponse } from 'next/server';
import { LastFmService } from '@/lib/lastfm';
import { ChartAlgorithm } from '@/lib/chartAlgorithm';
import { saveChartData, getChartData, initializeDatabase } from '@/lib/database';
import { subWeeks, format, startOfWeek } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Initialize database if needed
    initializeDatabase();
    
    const { username } = await request.json();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const lastfmService = LastFmService.getInstance();
    const results = [];

    // First, let's find the earliest week with scrobbles
    // Start from 2012 since we know that's when the user started scrobbling
    const currentDate = new Date();
    const startDate = new Date('2012-01-01'); // Start from 2012
    let earliestWeekWithData = null;
    let latestWeekWithData = null;
    let weeksChecked = 0;
    
    // Calculate weeks from 2012 to current date
    const weeksFrom2012 = Math.ceil((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    // Find the earliest week with data by checking from 2012 forward
    console.log('Finding earliest week with scrobbles starting from 2012...');
    let foundWeeks: string[] = [];
    
    for (let i = 0; i < weeksFrom2012; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + (i * 7));
      const weekStartDate = lastfmService.getWeekStartDate(checkDate);
      const weekStartString = lastfmService.formatWeekStart(weekStartDate);
      
      console.log(`Checking week ${weekStartString} (${i + 1}/${weeksFrom2012})`);
      
              try {
          const weeklyTracks = await lastfmService.getWeeklyScrobbles(username, weekStartDate);
          if (weeklyTracks.length > 0) {
            console.log(`✅ Found ${weeklyTracks.length} tracks in ${weekStartString}`);
            foundWeeks.push(weekStartString);
            if (!earliestWeekWithData) {
              earliestWeekWithData = weekStartString;
              console.log(`🎯 Found earliest week with scrobbles: ${weekStartString}`);
            }
            if (!latestWeekWithData) {
              latestWeekWithData = weekStartString;
            }
          } else {
            console.log(`❌ No tracks found in ${weekStartString}`);
          }
          
          weeksChecked++;
          
          // If we found our earliest week, we can stop checking and just process from there
          if (earliestWeekWithData) {
            console.log(`🚀 Found start point! Processing all weeks from ${earliestWeekWithData} to current date...`);
            break;
          }
        } catch (error) {
          console.error(`Error checking week ${weekStartString}:`, error);
          weeksChecked++;
        }
    }
    
    console.log(`Found ${foundWeeks.length} weeks with scrobbles:`, foundWeeks);

    if (!earliestWeekWithData) {
      return NextResponse.json(
        { error: 'No scrobbles found for the user' },
        { status: 404 }
      );
    }

    console.log(`Found earliest week: ${earliestWeekWithData}`);

    // Process all weeks from earliest found week to current date
    const earliestDate = new Date(earliestWeekWithData!);
    const weeksToProcess = Math.ceil((currentDate.getTime() - earliestDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    console.log(`Processing ${weeksToProcess + 1} weeks from ${earliestWeekWithData} to current date...`);
    
    for (let i = 0; i <= weeksToProcess; i++) {
      const weekDate = new Date(earliestDate);
      weekDate.setDate(weekDate.getDate() + (i * 7));
      const weekStartString = lastfmService.formatWeekStart(weekDate);
      const weekStartDate = lastfmService.getWeekStartDate(weekDate);
      
      try {
        console.log(`📊 Processing week: ${weekStartString} (${i + 1}/${weeksToProcess + 1})`);
        
        // Get weekly scrobbles from Last.fm
        const weeklyTracks = await lastfmService.getWeeklyScrobbles(username, weekStartDate);
        
        if (weeklyTracks.length > 0) {
          console.log(`🔄 Applying algorithm to ${weeklyTracks.length} tracks...`);
          
          // Process the data with our algorithm
          const processedTracks = await ChartAlgorithm.processWeeklyData(weeklyTracks, weekStartString);
          
          // Get previous week data for position calculations
          const previousWeekStart = lastfmService.getPreviousWeekStart(weekStartDate);
          const previousWeekData = getChartData(lastfmService.formatWeekStart(previousWeekStart)) as any[];
          
          // Calculate positions
          const finalTracks = ChartAlgorithm.calculatePositions(processedTracks, previousWeekData);
          
          // Save to database
          saveChartData(weekStartString, finalTracks);
          
          results.push({
            week: weekStartString,
            tracks: finalTracks.length,
            success: true
          });
          
          console.log(`✅ Successfully processed week ${weekStartString} with ${finalTracks.length} tracks`);
        } else {
          results.push({
            week: weekStartString,
            tracks: 0,
            success: false,
            message: 'No scrobbles found'
          });
          console.log(`❌ No scrobbles found for week ${weekStartString}`);
        }
        
      } catch (error) {
        console.error(`Error processing week ${weekStartString}:`, error);
        results.push({
          week: weekStartString,
          tracks: 0,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successfulWeeks = results.filter(r => r.success).length;
    const totalTracks = results.reduce((sum, r) => sum + r.tracks, 0);
    
    return NextResponse.json({
      success: true,
      processedWeeks: successfulWeeks,
      totalWeeks: results.length,
      totalTracks,
      earliestWeek: earliestWeekWithData,
      latestWeek: latestWeekWithData,
      results
    });
    
  } catch (error) {
    console.error('Error processing all weeks:', error);
    return NextResponse.json(
      { error: 'Failed to process weeks' },
      { status: 500 }
    );
  }
} 