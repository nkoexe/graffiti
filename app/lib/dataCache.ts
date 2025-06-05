'use client';

// Global data cache
let graffitiDataCache: any[] = [];
let isInitialized = false;

// Immediately load data when this module is imported
const initializeData = async () => {
  if (isInitialized) return graffitiDataCache;

  try {
    // Only fetch if we're in the browser
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/graffiti');
      if (response.ok) {
        const data = await response.json();
        graffitiDataCache = data;
        isInitialized = true;
        return data;
      }
    }
  } catch (error) {
    console.error('Failed to initialize graffiti data:', error);
  }

  return [];
};

export { graffitiDataCache, isInitialized, initializeData };
