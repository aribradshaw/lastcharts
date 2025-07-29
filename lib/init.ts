import { initializeDatabase } from './database';

// Initialize database on app startup
export function initializeApp() {
  try {
    initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
} 