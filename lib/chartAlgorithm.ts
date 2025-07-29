import { getPreviousWeekData, getSongPreviousWeek, saveSongWeek, getSongTotalWeeksInTop100, getSongLastWeekOnChart, getSongBestPositionEver, getSongPeakPosition } from './database';

interface ChartTrack {
  song_name: string;
  artist_name: string;
  album_name: string;
  album_art: string;
  scrobbles_this_week: number;
  points: number;
  points_from_current_week: number;
  points_from_previous_week: number;
  previous_position?: number | null;
  peak_position?: number;
  weeks_on_chart?: number;
  is_new_entry?: boolean;
  is_recurring?: boolean;
  last_on_chart?: string | null;
}

export class ChartAlgorithm {
  /**
   * Calculate points using the algorithm:
   * 1 point per stream this week
   * 0.5 points from previous week's total points
   */
  static calculatePoints(
    currentWeekScrobbles: number,
    previousWeekPoints: number
  ): { total: number; fromCurrent: number; fromPrevious: number } {
    const pointsFromCurrent = currentWeekScrobbles;
    const pointsFromPrevious = previousWeekPoints * 0.5;
    const totalPoints = pointsFromCurrent + pointsFromPrevious;

    return {
      total: totalPoints,
      fromCurrent: pointsFromCurrent,
      fromPrevious: pointsFromPrevious,
    };
  }

  /**
   * Process weekly chart data with the algorithm
   */
  static async processWeeklyData(
    weeklyTracks: ChartTrack[],
    weekStart: string
  ): Promise<ChartTrack[]> {
    const processedTracks: ChartTrack[] = [];

    for (const track of weeklyTracks) {
      // Get previous week's points for this track
      const previousWeekPoints = await getPreviousWeekData(
        track.song_name,
        track.artist_name,
        weekStart
      );

      // Calculate new points using the algorithm
      const pointsCalculation = this.calculatePoints(
        track.scrobbles_this_week,
        previousWeekPoints
      );

      // Get weeks on chart for tiebreaker
      const previousWeekData = getSongPreviousWeek(track.song_name, track.artist_name, weekStart);
      let weeksOnChart = 0;
      
      if (previousWeekData?.was_in_top_100) {
        // Song was in top 100 last week, continue counting
        weeksOnChart = previousWeekData.weeks_on_chart + 1;
      } else if (previousWeekData && !previousWeekData.was_in_top_100) {
        // Song existed before but wasn't in top 100 last week
        const totalPreviousWeeks = getSongTotalWeeksInTop100(track.song_name, track.artist_name, weekStart);
        if (totalPreviousWeeks > 0) {
          weeksOnChart = totalPreviousWeeks + 1;
        } else {
          weeksOnChart = 1; // First time in top 100
        }
      } else {
        // No previous data = First time ever
        weeksOnChart = 1;
      }

      processedTracks.push({
        ...track,
        points: pointsCalculation.total,
        points_from_current_week: pointsCalculation.fromCurrent,
        points_from_previous_week: pointsCalculation.fromPrevious,
        weeks_on_chart: weeksOnChart,
      });
    }

    // Sort by total points (descending) with tiebreaker based on weeks on chart
    return processedTracks.sort((a, b) => {
      // Primary sort: points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      // Tiebreaker: weeks on chart (descending) - songs with more weeks rank higher
      const aWeeks = a.weeks_on_chart || 0;
      const bWeeks = b.weeks_on_chart || 0;
      
      // Log tiebreaker decisions for debugging
      if (aWeeks !== bWeeks) {
        console.log(`Tiebreaker: "${a.song_name}" (${aWeeks} weeks) vs "${b.song_name}" (${bWeeks} weeks) - ${bWeeks > aWeeks ? b.song_name : a.song_name} wins`);
      }
      
      return bWeeks - aWeeks;
    });
  }

  /**
   * Calculate position changes and peak positions with proper weeks tracking
   * Now tracks ALL songs, not just top 100
   */
  static calculatePositions(
    tracks: ChartTrack[],
    weekStart: string
  ): ChartTrack[] {
    return tracks.map((track, index) => {
      const currentPosition = index + 1;
      const isInTop100 = currentPosition <= 100;
      // Process ALL songs regardless of points - we'll limit display later
      
      // Get previous week data from database
      const previousWeekData = getSongPreviousWeek(track.song_name, track.artist_name, weekStart);
      
      // Calculate position changes (only for top 100 display)
      const previousPosition = isInTop100 && previousWeekData?.was_in_top_100 ? previousWeekData.position : null;
      
      // Calculate peak position (only meaningful for top 100)
      // Get the best position this song has ever achieved
      const actualPeakPosition = getSongPeakPosition(track.song_name, track.artist_name, weekStart);
      const peakPosition = isInTop100 ? 
        (actualPeakPosition ? Math.min(currentPosition, actualPeakPosition) : currentPosition) : 
        currentPosition;
      
      // Use weeks on chart that was calculated during sorting, but adjust for current week
      let weeksOnChart = track.weeks_on_chart || 0;
      let isNewEntry = false;
      let isRecurring = false;
      let lastOnChart: string | null = null;
      
      if (isInTop100) {
        if (previousWeekData?.was_in_top_100) {
          // Song was in top 100 last week, continue counting
          // weeksOnChart is already correct from processWeeklyData
        } else if (previousWeekData && !previousWeekData.was_in_top_100) {
          // Song existed before but wasn't in top 100 last week = RECURRING
          // Only mark as recurring if it was in top 100 at some point before
          const totalPreviousWeeks = getSongTotalWeeksInTop100(track.song_name, track.artist_name, weekStart);
          if (totalPreviousWeeks > 0) {
            isRecurring = true;
            // weeksOnChart is already correct from processWeeklyData
            // Get the last week this song was on the chart
            lastOnChart = getSongLastWeekOnChart(track.song_name, track.artist_name, weekStart);
          } else {
            // Song existed before but was never in top 100 = NEW entry to top 100
            isNewEntry = true;
            weeksOnChart = 1;
          }
        } else {
          // No previous data = First time ever = NEW
          isNewEntry = true;
          weeksOnChart = 1;
        }
      } else {
        // Below 100 - don't count weeks, but track recurrence
        weeksOnChart = 0; // Reset weeks on chart when below 100
        if (previousWeekData?.was_in_top_100) {
          isRecurring = true;
          lastOnChart = getSongLastWeekOnChart(track.song_name, track.artist_name, weekStart);
        }
      }
      
      // Save this week's data to database for ALL songs (even those below 1 point)
      saveSongWeek(track.song_name, track.artist_name, weekStart, currentPosition, track.points, isInTop100, weeksOnChart, track.album_name, track.album_art);

      return {
        ...track,
        position: currentPosition,
        previous_position: previousPosition,
        peak_position: peakPosition,
        weeks_on_chart: weeksOnChart,
        is_new_entry: isNewEntry,
        is_recurring: isRecurring,
        last_on_chart: lastOnChart,
      };
    });
  }
} 