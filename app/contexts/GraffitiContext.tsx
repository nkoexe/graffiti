'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { graffitiDataCache, isInitialized, initializeData } from '../lib/dataCache';

interface GraffitiData {
  id: number;
  posix: [number, number];
  description: string;
  images: string[];
  uploadDate: string;
  author: string;
}

interface GraffitiContextType {
  graffitiData: GraffitiData[];
  refreshData: () => Promise<void>;
  addGraffiti: (graffiti: GraffitiData) => void;
  removeGraffiti: (id: number) => void;
}

const GraffitiContext = createContext<GraffitiContextType | undefined>(undefined);

interface GraffitiProviderProps {
  children: ReactNode;
}

export function GraffitiProvider({ children }: GraffitiProviderProps) {
  const [graffitiData, setGraffitiData] = useState<GraffitiData[]>(graffitiDataCache);

  const refreshData = async () => {
    try {
      const response = await fetch('/api/graffiti');
      if (response.ok) {
        const data = await response.json();
        // Update both local state and cache
        setGraffitiData(data);
        graffitiDataCache.length = 0;
        graffitiDataCache.push(...data);
      }
    } catch (error) {
      console.error('Error refreshing graffiti data:', error);
    }
  };

  const addGraffiti = (graffiti: GraffitiData) => {
    const newData = [...graffitiData, graffiti];
    setGraffitiData(newData);
    graffitiDataCache.push(graffiti);
  };

  const removeGraffiti = (id: number) => {
    const newData = graffitiData.filter(item => item.id !== id);
    setGraffitiData(newData);
    // Update cache
    const index = graffitiDataCache.findIndex(item => item.id === id);
    if (index > -1) {
      graffitiDataCache.splice(index, 1);
    }
  };

  useEffect(() => {
    // Load data if not already initialized
    if (!isInitialized) {
      initializeData().then(data => {
        if (data.length > 0) {
          setGraffitiData(data);
        }
      });
    }
  }, []);

  const value: GraffitiContextType = {
    graffitiData,
    refreshData,
    addGraffiti,
    removeGraffiti,
  };

  return (
    <GraffitiContext.Provider value={value}>
      {children}
    </GraffitiContext.Provider>
  );
}

export function useGraffiti() {
  const context = useContext(GraffitiContext);
  if (context === undefined) {
    throw new Error('useGraffiti must be used within a GraffitiProvider');
  }
  return context;
}
