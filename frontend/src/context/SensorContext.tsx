import React, { createContext, useContext, useState, useEffect } from 'react';

interface SensorData {
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  timestamp: string | null;
  isOnline: boolean;
  lastUpdateDate: number | null;
  clearSensorData: () => Promise<void>;
  refreshSensorData: () => Promise<void>;
}

const SensorContext = createContext<SensorData | undefined>(undefined);

export const SensorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sensorData, setSensorData] = useState<Omit<SensorData, 'clearSensorData' | 'refreshSensorData'>>({
    temperature: null,
    humidity: null,
    soil_moisture: null,
    timestamp: null,
    isOnline: false,
    lastUpdateDate: null,
  });

  const clearSensorData = async () => {
    try {
      // Wipe the backend cache first so the poller doesn't immediately refill
      await fetch('http://127.0.0.1:8000/api/v1/iot/clear', { method: 'DELETE' });
    } catch (err) {
      console.error("Clear IoT cache error:", err);
    }
    setSensorData({
      temperature: null,
      humidity: null,
      soil_moisture: null,
      timestamp: null,
      isOnline: false,
      lastUpdateDate: null,
    });
  };

  const refreshSensorData = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/iot/latest');
      if (res.ok) {
        const data = await res.json();
        if (data.temperature !== undefined) {
          setSensorData(prev => ({
            ...prev,
            temperature: data.temperature,
            humidity: data.humidity,
            soil_moisture: data.soil_moisture,
            timestamp: data.timestamp,
            lastUpdateDate: data.unix_timestamp > 0 ? data.unix_timestamp : null,
          }));
        }
      }
    } catch (err) {
      console.error("IoT Fetch Error:", err);
    }
  };

  useEffect(() => {
    refreshSensorData();
    const interval = setInterval(refreshSensorData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkOnlineStatus = () => {
      setSensorData(prev => {
        const isOnline = prev.lastUpdateDate !== null && (Date.now() - prev.lastUpdateDate < 30000);
        if (prev.isOnline !== isOnline) {
          return { ...prev, isOnline };
        }
        return prev;
      });
    };

    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SensorContext.Provider value={{ ...sensorData, clearSensorData, refreshSensorData }}>
      {children}
    </SensorContext.Provider>
  );
};

export const useSensor = () => {
  const context = useContext(SensorContext);
  if (context === undefined) {
    throw new Error('useSensor must be used within a SensorProvider');
  }
  return context;
};
