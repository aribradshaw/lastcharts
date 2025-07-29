# Last.fm Billboard Clone

A personal music chart application that creates Billboard-style charts from your Last.fm scrobbles using a custom algorithm for natural chart flow.

## Features

- **Three Chart Types**: Songs, Artists, and Albums charts
- **Custom Algorithm**: 1 point per stream + 0.5 points from previous week
- **Position Tracking**: Shows position changes, peak positions, and trends
- **Points Breakdown**: Hover over points to see current week vs. previous week breakdown
- **Local Database**: Stores processed data to avoid repeated API calls
- **Modern UI**: Beautiful, responsive interface with album art display

## Algorithm

The chart uses a unique algorithm to create more natural chart flow:

- **1 point per stream** in the current week
- **0.5 points** from the previous week's total points

This creates a "momentum" effect where songs that were popular in previous weeks maintain some presence in the charts, similar to how Billboard charts work.

### Example:
- Week 1: "Song" gets 50 scrobbles = 50 points
- Week 2: "Song" gets 1 scrobble = 1 + (50 × 0.5) = 26 points
- Week 3: "Song" gets 0 scrobbles = 0 + (26 × 0.5) = 13 points

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Last.fm API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lastfm-billboard-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   LASTFM_API_KEY=your_lastfm_api_key
   LASTFM_SECRET=your_lastfm_secret
   EXAMPLE_USER=your_lastfm_username
   ```

   To get Last.fm API credentials:
   1. Go to [Last.fm API](https://www.last.fm/api/account/create)
   2. Create an application
   3. Copy your API key and secret

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Processing Your Chart History

1. **Enter your Last.fm username** in the "Process All Weeks" section
2. **Click "Process All Weeks"** to automatically find and process ALL your scrobbles
3. **Wait for processing** - this may take several minutes as it processes your entire scrobble history chronologically
4. **Browse your charts freely** once processing is complete

### Viewing Charts

- **Songs Chart**: Individual tracks ranked by points
- **Artists Chart**: Artists grouped and ranked by total points
- **Albums Chart**: Albums grouped and ranked by total points

### Chart Features

- **Position Changes**: Arrows show if a song moved up, down, or stayed the same
- **Peak Position**: Yellow badge shows if this is the song's highest position
- **Points Breakdown**: Hover over points to see the breakdown between current week and previous week
- **Album Art**: Displays album artwork when available

### Bulk Processing Benefits

- **Automatic discovery**: Automatically finds your earliest scrobbles (goes back as far as possible)
- **Chronological processing**: Processes weeks from oldest to newest for accurate algorithm calculations
- **Complete history**: Processes ALL available weeks, not just a subset
- **Efficient browsing**: Once processed, you can browse any week instantly
- **Respectful to APIs**: Includes delays between API calls to be respectful to Last.fm

## Technical Details

### Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite with better-sqlite3
- **API**: Last.fm API for scrobble data

### Database Schema

The application uses two main tables:

- **charts**: Stores processed chart data with points and positions
- **weeks**: Tracks which weeks have been processed

### API Endpoints

- `GET /api/charts` - Fetch chart data for a specific week
- `POST /api/process-all-weeks` - Process and store multiple weeks of data

## Customization

### Modifying the Algorithm

Edit `lib/chartAlgorithm.ts` to change how points are calculated:

```typescript
static calculatePoints(
  currentWeekScrobbles: number,
  previousWeekPoints: number
): { total: number; fromCurrent: number; fromPrevious: number } {
  const pointsFromCurrent = currentWeekScrobbles;
  const pointsFromPrevious = previousWeekPoints * 0.5; // Change this multiplier
  const totalPoints = pointsFromCurrent + pointsFromPrevious;
  
  return {
    total: totalPoints,
    fromCurrent: pointsFromCurrent,
    fromPrevious: pointsFromPrevious,
  };
}
```

### Adding New Chart Types

1. Add the new type to the main page component
2. Create filtering logic in `getFilteredData()`
3. Update the `ChartTab` component to handle the new type

## Troubleshooting

### Common Issues

1. **"Failed to fetch Last.fm data"**
   - Check your API credentials in `.env.local`
   - Verify your Last.fm username is correct
   - Ensure you have scrobbles for the selected week

2. **"No data available for this week"**
   - Try processing a different week
   - Check if you have any scrobbles for the selected period

3. **Database errors**
   - Delete `charts.db` and restart the application
   - The database will be recreated automatically

### Performance

- The application stores data locally to minimize API calls
- Processing large amounts of scrobbles may take a few moments
- Consider processing weeks in chronological order for best results

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License. 