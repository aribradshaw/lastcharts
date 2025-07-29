import { NextRequest, NextResponse } from 'next/server';
import { getChartData, getAvailableWeeks, initializeDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Initialize database if needed
    initializeDatabase();
    
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('week');
    
    if (!weekStart) {
      // Return available weeks if no specific week requested
      const weeks = getAvailableWeeks();
      return NextResponse.json({ weeks });
    }

    const chartData = getChartData(weekStart);
    return NextResponse.json({ 
      weekStart, 
      chartData,
      total: chartData.length 
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
} 