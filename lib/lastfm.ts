import axios from 'axios';
import { format, subWeeks, startOfWeek } from 'date-fns';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_SECRET = process.env.LASTFM_SECRET;
const EXAMPLE_USER = process.env.EXAMPLE_USER;

interface LastFmTrack {
  name: string;
  artist: {
    '#text': string;
  };
  album: {
    '#text': string;
  };
  image: Array<{
    size: string;
    '#text': string;
  }>;
  date: {
    '#text': string;
  };
}

interface LastFmResponse {
  recenttracks: {
    track: LastFmTrack[];
    '@attr': {
      total: string;
      page: string;
      perPage: string;
      totalPages: string;
      user: string;
    };
  };
}

interface ProcessedTrack {
  song_name: string;
  artist_name: string;
  album_name: string;
  album_art: string;
  scrobbles_this_week: number;
  points: number;
  points_from_current_week: number;
  points_from_previous_week: number;
}

export class LastFmService {
  private static instance: LastFmService;

  private constructor() {}

  static getInstance(): LastFmService {
    if (!LastFmService.instance) {
      LastFmService.instance = new LastFmService();
    }
    return LastFmService.instance;
  }

  async getUserScrobbles(username: string, from?: Date, to?: Date): Promise<LastFmTrack[]> {
    const params = new URLSearchParams({
      method: 'user.getrecenttracks',
      user: username,
      api_key: LASTFM_API_KEY!,
      format: 'json',
      limit: '1000', // Maximum allowed
    });

    if (from) {
      params.append('from', Math.floor(from.getTime() / 1000).toString());
    }
    if (to) {
      params.append('to', Math.floor(to.getTime() / 1000).toString());
    }

    try {
      const response = await axios.get<LastFmResponse>(
        `https://ws.audioscrobbler.com/2.0/?${params.toString()}`
      );

      return response.data.recenttracks.track || [];
    } catch (error) {
      console.error('Error fetching Last.fm data:', error);
      throw new Error('Failed to fetch Last.fm data');
    }
  }

  async getWeeklyScrobbles(username: string, weekStart: Date): Promise<ProcessedTrack[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const tracks = await this.getUserScrobbles(username, weekStart, weekEnd);

    // Group tracks by song and artist
    const trackCounts = new Map<string, {
      song_name: string;
      artist_name: string;
      album_name: string;
      album_art: string;
      scrobbles: number;
    }>();

    tracks.forEach(track => {
      if (track.name && track.artist['#text']) {
        const key = `${track.name}-${track.artist['#text']}`;
        const albumArt = track.image.find(img => img.size === 'medium')?.['#text'] || 
                        track.image.find(img => img.size === 'small')?.['#text'] || '';

        if (trackCounts.has(key)) {
          trackCounts.get(key)!.scrobbles++;
        } else {
          trackCounts.set(key, {
            song_name: track.name,
            artist_name: track.artist['#text'],
            album_name: track.album['#text'] || '',
            album_art: albumArt,
            scrobbles: 1,
          });
        }
      }
    });

    // Convert to array and sort by scrobbles
    const sortedTracks = Array.from(trackCounts.values())
      .sort((a, b) => b.scrobbles - a.scrobbles);

    return sortedTracks.map(track => ({
      ...track,
      scrobbles_this_week: track.scrobbles,
      points: track.scrobbles, // Initial points (will be calculated by algorithm)
      points_from_current_week: track.scrobbles,
      points_from_previous_week: 0,
    }));
  }

  getWeekStartDate(date: Date = new Date()): Date {
    return startOfWeek(date, { weekStartsOn: 1 }); // Monday start
  }

  formatWeekStart(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  getPreviousWeekStart(currentWeekStart: Date): Date {
    return subWeeks(currentWeekStart, 1);
  }
} 