import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'charts.db');
const db = new Database(dbPath);

// Initialize database tables
export function initializeDatabase() {
  // Create charts table to store weekly chart data
  db.exec(`
    CREATE TABLE IF NOT EXISTS charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      song_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      album_name TEXT,
      album_art TEXT,
      position INTEGER NOT NULL,
      previous_position INTEGER,
      peak_position INTEGER,
      points REAL NOT NULL,
      points_from_current_week REAL NOT NULL,
      points_from_previous_week REAL NOT NULL,
      scrobbles_this_week INTEGER NOT NULL,
      weeks_on_chart INTEGER DEFAULT 0,
      is_new_entry BOOLEAN DEFAULT FALSE,
      is_recurring BOOLEAN DEFAULT FALSE,
      last_on_chart TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(week_start, song_name, artist_name)
    )
  `);

  // Add new columns to existing table if they don't exist
  try {
    db.exec('ALTER TABLE charts ADD COLUMN weeks_on_chart INTEGER DEFAULT 0');
  } catch (error) {
    // Column already exists, ignore error
  }
  
  try {
    db.exec('ALTER TABLE charts ADD COLUMN is_new_entry BOOLEAN DEFAULT FALSE');
  } catch (error) {
    // Column already exists, ignore error
  }
  
  try {
    db.exec('ALTER TABLE charts ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE');
  } catch (error) {
    // Column already exists, ignore error
  }
  
  try {
    db.exec('ALTER TABLE charts ADD COLUMN last_on_chart TEXT');
  } catch (error) {
    // Column already exists, ignore error
  }
  
  try {
    db.exec('ALTER TABLE song_weeks ADD COLUMN points REAL DEFAULT 0');
  } catch (error) {
    // Column already exists, ignore error
  }

  try {
    db.exec('ALTER TABLE song_weeks ADD COLUMN album_name TEXT');
  } catch (error) {
    // Column already exists, ignore error
  }
  
  try {
    db.exec('ALTER TABLE song_weeks ADD COLUMN album_art TEXT');
  } catch (error) {
    // Column already exists, ignore error
  }

  // Create weeks table to track processed weeks
  db.exec(`
    CREATE TABLE IF NOT EXISTS weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT UNIQUE NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create raw_data table to store Last.fm scrobbles
  db.exec(`
    CREATE TABLE IF NOT EXISTS raw_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      track_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      album_name TEXT,
      album_art TEXT,
      scrobbles INTEGER NOT NULL,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(week_start, track_name, artist_name)
    )
  `);

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create song_weeks table to track weeks on chart for each song
  db.exec(`
    CREATE TABLE IF NOT EXISTS song_weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      album_name TEXT,
      album_art TEXT,
      week_start TEXT NOT NULL,
      position INTEGER,
      points REAL DEFAULT 0,
      was_in_top_100 BOOLEAN DEFAULT FALSE,
      weeks_on_chart INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(song_name, artist_name, week_start)
    )
  `);
}

// Get the most recent week data
export function getLatestWeek(): string | null {
  const stmt = db.prepare('SELECT week_start FROM weeks ORDER BY week_start DESC LIMIT 1');
  const result = stmt.get() as { week_start: string } | undefined;
  return result?.week_start || null;
}

// Get chart data for a specific week
export function getChartData(weekStart: string) {
  const stmt = db.prepare(`
    SELECT * FROM charts 
    WHERE week_start = ? 
    ORDER BY position ASC
  `);
  return stmt.all(weekStart);
}

// Get all available weeks
export function getAvailableWeeks() {
  const stmt = db.prepare('SELECT week_start FROM weeks ORDER BY week_start DESC');
  return stmt.all() as { week_start: string }[];
}

// Save chart data for a week (only top 100 for display)
export function saveChartData(weekStart: string, chartData: any[]) {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO charts (
      week_start, song_name, artist_name, album_name, album_art,
      position, previous_position, peak_position, points,
      points_from_current_week, points_from_previous_week, scrobbles_this_week,
      weeks_on_chart, is_new_entry, is_recurring, last_on_chart
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertWeekStmt = db.prepare(`
    INSERT OR IGNORE INTO weeks (week_start) VALUES (?)
  `);

  const transaction = db.transaction(() => {
    insertWeekStmt.run(weekStart);
    
    // Only save top 100 songs to the charts table for display
    const top100Songs = chartData.slice(0, 100);
    
    top100Songs.forEach((item, index) => {
      insertStmt.run(
        weekStart,
        item.song_name,
        item.artist_name,
        item.album_name || '',
        item.album_art || '',
        item.position || index + 1, // position
        item.previous_position !== null && item.previous_position !== undefined ? item.previous_position : null,
        item.peak_position || index + 1,
        item.points,
        item.points_from_current_week,
        item.points_from_previous_week,
        item.scrobbles_this_week,
        item.weeks_on_chart || 0,
        item.is_new_entry ? 1 : 0,
        item.is_recurring ? 1 : 0,
        item.last_on_chart || null
      );
    });
  });

  transaction();
}

// Get previous week's data for a song
export function getPreviousWeekData(songName: string, artistName: string, weekStart: string) {
  const stmt = db.prepare(`
    SELECT points FROM charts 
    WHERE song_name = ? AND artist_name = ? AND week_start < ?
    ORDER BY week_start DESC LIMIT 1
  `);
  const result = stmt.get(songName, artistName, weekStart) as { points: number } | undefined;
  return result?.points || 0;
}

// Save raw Last.fm data
export function saveRawData(weekStart: string, rawTracks: any[]) {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO raw_data (
      week_start, track_name, artist_name, album_name, album_art, scrobbles
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    rawTracks.forEach(track => {
      // Validate required fields before inserting
      const trackName = track.song_name || track.name || '';
      const artistName = track.artist_name || track.artist || '';
      const scrobbles = track.scrobbles || track.scrobbles_this_week || 0;
      
      // Skip tracks with empty required fields
      if (!trackName.trim() || !artistName.trim() || scrobbles <= 0) {
        console.warn(`Skipping track with missing data: ${JSON.stringify({trackName, artistName, scrobbles})}`);
        return;
      }
      
      insertStmt.run(
        weekStart,
        trackName.trim(),
        artistName.trim(),
        track.album_name || track.album || '',
        track.album_art || track.albumArt || '',
        scrobbles
      );
    });
  });

  transaction();
}

// Get raw data for a specific week
export function getRawData(weekStart: string) {
  const stmt = db.prepare(`
    SELECT * FROM raw_data 
    WHERE week_start = ? 
    ORDER BY scrobbles DESC
  `);
  return stmt.all(weekStart);
}

// Check if raw data exists for a week
export function hasRawData(weekStart: string): boolean {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM raw_data WHERE week_start = ?');
  const result = stmt.get(weekStart) as { count: number };
  return result.count > 0;
}

// Get all weeks with raw data
export function getWeeksWithRawData() {
  const stmt = db.prepare('SELECT DISTINCT week_start FROM raw_data ORDER BY week_start');
  return stmt.all() as { week_start: string }[];
}

// Save setting
export function saveSetting(key: string, value: string) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(key, value);
}

// Get setting
export function getSetting(key: string): string | null {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const result = stmt.get(key) as { value: string } | undefined;
  return result?.value || null;
}

// Save song week data
export function saveSongWeek(songName: string, artistName: string, weekStart: string, position: number, points: number, wasInTop100: boolean, weeksOnChart: number, albumName?: string, albumArt?: string) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO song_weeks (
      song_name, artist_name, week_start, position, points, was_in_top_100, weeks_on_chart, album_name, album_art
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(songName, artistName, weekStart, position, points, wasInTop100 ? 1 : 0, weeksOnChart, albumName || '', albumArt || '');
}

// Get song's previous week data
export function getSongPreviousWeek(songName: string, artistName: string, weekStart: string) {
  const stmt = db.prepare(`
    SELECT * FROM song_weeks 
    WHERE song_name = ? AND artist_name = ? AND week_start < ?
    ORDER BY week_start DESC LIMIT 1
  `);
  return stmt.get(songName, artistName, weekStart) as {
    position: number;
    was_in_top_100: boolean;
    weeks_on_chart: number;
  } | undefined;
}

// Get total cumulative weeks a song has been in top 100 throughout its chart history
export function getSongTotalWeeksInTop100(songName: string, artistName: string, weekStart: string): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as total_weeks FROM song_weeks 
    WHERE song_name = ? AND artist_name = ? AND week_start < ? AND was_in_top_100 = 1
  `);
  const result = stmt.get(songName, artistName, weekStart) as { total_weeks: number };
  return result.total_weeks || 0;
}

// Get the last week a song was in the top 100 (for recurring songs)
export function getSongLastWeekOnChart(songName: string, artistName: string, weekStart: string): string | null {
  const stmt = db.prepare(`
    SELECT week_start FROM song_weeks 
    WHERE song_name = ? AND artist_name = ? AND week_start < ? AND was_in_top_100 = 1
    ORDER BY week_start DESC LIMIT 1
  `);
  const result = stmt.get(songName, artistName, weekStart) as { week_start: string } | undefined;
  return result?.week_start || null;
}

// Get the best position a song has ever achieved
export function getSongBestPositionEver(songName: string, artistName: string, weekStart: string): number | null {
  const stmt = db.prepare(`
    SELECT MIN(position) as best_position FROM song_weeks 
    WHERE song_name = ? AND artist_name = ? AND week_start < ? AND was_in_top_100 = 1
  `);
  const result = stmt.get(songName, artistName, weekStart) as { best_position: number } | undefined;
  return result?.best_position || null;
}

// Get the actual peak position for a song (best position ever achieved)
export function getSongPeakPosition(songName: string, artistName: string, weekStart: string): number | null {
  const stmt = db.prepare(`
    SELECT MIN(position) as peak_position FROM song_weeks 
    WHERE song_name = ? AND artist_name = ? AND week_start <= ? AND was_in_top_100 = 1
  `);
  const result = stmt.get(songName, artistName, weekStart) as { peak_position: number } | undefined;
  return result?.peak_position || null;
}

// Get all songs for a specific week
export function getSongsForWeek(weekStart: string) {
  const stmt = db.prepare(`
    SELECT * FROM song_weeks 
    WHERE week_start = ? 
    ORDER BY position ASC
  `);
  return stmt.all(weekStart) as {
    song_name: string;
    artist_name: string;
    position: number;
    was_in_top_100: boolean;
    weeks_on_chart: number;
  }[];
}

// Get all songs that should be considered for a week (current scrobbles + carryover candidates)
export function getAllSongsForWeek(weekStart: string) {
  const stmt = db.prepare(`
    WITH latest_points AS (
      SELECT song_name, artist_name, points, album_name, album_art,
             ROW_NUMBER() OVER (PARTITION BY song_name, artist_name ORDER BY week_start DESC) as rn
      FROM song_weeks 
      WHERE week_start < ? AND points > 0
    )
    SELECT lp.song_name, lp.artist_name, lp.points as previous_points,
           COALESCE(rd.scrobbles, 0) as current_scrobbles,
           COALESCE(rd.album_name, lp.album_name, '') as album_name,
           COALESCE(rd.album_art, lp.album_art, '') as album_art
    FROM latest_points lp
    LEFT JOIN raw_data rd ON lp.song_name = rd.track_name 
                         AND lp.artist_name = rd.artist_name 
                         AND rd.week_start = ?
    WHERE lp.rn = 1
    
    UNION
    
    SELECT rd.track_name as song_name, rd.artist_name, 0 as previous_points,
           rd.scrobbles as current_scrobbles, rd.album_name, rd.album_art
    FROM raw_data rd
    WHERE rd.week_start = ? 
      AND NOT EXISTS (
        SELECT 1 FROM song_weeks sw 
        WHERE sw.song_name = rd.track_name 
          AND sw.artist_name = rd.artist_name 
          AND sw.week_start < ?
          AND sw.points > 0
      )
    
    ORDER BY song_name, artist_name
  `);
  return stmt.all(weekStart, weekStart, weekStart, weekStart) as {
    song_name: string;
    artist_name: string;
    previous_points: number;
    current_scrobbles: number;
    album_name: string;
    album_art: string;
  }[];
}

// Clear all chart data (for recalculation)
export function clearChartData() {
  db.exec('DELETE FROM charts');
  db.exec('DELETE FROM weeks');
  db.exec('DELETE FROM song_weeks');
}

// Close database connection
export function closeDatabase() {
  db.close();
} 