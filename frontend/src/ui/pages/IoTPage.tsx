import { useState, useEffect } from 'react';

interface SensorData {
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  irrigation_needed: boolean;
  suggestion: string;
  timestamp: string | null;
}

export default function IoTPage() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<number | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/iot/latest');
      if (!res.ok) throw new Error("Backend offline");
      const data: SensorData = await res.json();
      
      if (data.temperature !== null) {
        setSensorData(data);
        setLastUpdateDate(Date.now());
        setSecondsSinceUpdate(0);
        setError(null);
      }
    } catch (err) {
      console.error("IoT Fetch Error:", err);
      setError("Backend offline");
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  useEffect(() => {
    fetchData();
    const pollInterval = setInterval(fetchData, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdateDate) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdateDate) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdateDate]);

  const isConnected = lastUpdateDate && secondsSinceUpdate < 30 && !error;

  const getMoistureColor = (val: number | null) => {
    if (val === null) return "border-l-gray-400";
    if (val < 30) return "border-l-red-500";
    if (val <= 60) return "border-l-amber-500";
    return "border-l-green-600";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] text-green-600">
        <div className="w-10 h-10 border-4 border-gray-100 border-t-green-600 rounded-full animate-spin mb-4" />
        <p className="font-semibold">Connecting to ESP32...</p>
      </div>
    );
  }

  return (
    <div className="pb-[60px] font-sans">
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
          .pulse-dot {
            animation: pulse 2s infinite ease-in-out;
          }
          @keyframes drip {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            70% { transform: translateY(15px) scale(0.8); opacity: 0.5; }
            100% { transform: translateY(20px) scale(0.5); opacity: 0; }
          }
          .water-drop {
            display: inline-block;
            animation: drip 1.5s infinite;
          }
        `}
      </style>

      {/* Hero Header */}
      <section className={`bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-8 md:p-10 text-white mb-5 shadow-lg shadow-green-700/20 ${isMobile ? 'text-center' : 'text-left'}`}>
        <div className={`flex justify-between items-center ${isMobile ? 'flex-col gap-5' : 'flex-row'}`}>
          <div>
            <h1 className={`m-0 mb-2.5 ${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold tracking-tight`}>📡 IoT Smart Farm</h1>
            <p className={`m-0 ${isMobile ? 'text-base' : 'text-lg'} opacity-90`}>
              Live ESP32 sensor values & Smart Irrigation
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/20 py-2 px-3.5 rounded-full text-sm font-bold backdrop-blur-md">
            {isConnected && <span className="pulse-dot w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_8px_#4ade80]" />}
            {isConnected ? "LIVE" : "OFFLINE"}
          </div>
        </div>
      </section>

      {/* Connection Status Bar & Irrigation Alert */}
      <div className="flex flex-col gap-4 mb-8">
        <div className={`flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 ${isMobile ? 'flex-col gap-3' : 'flex-row'}`}>
          <div className="flex items-center gap-3">
            <div className={`py-1.5 px-3.5 rounded-full text-xs font-bold flex items-center gap-2 border 
              ${isConnected ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
              {isConnected ? "ESP32 Connected" : "ESP32 Disconnected"}
            </div>
            {error && <span className="text-red-500 text-sm font-semibold">⚠️ {error}</span>}
            {isRefreshing && !error && <span className="text-xs text-green-600 opacity-70 italic">Polling...</span>}
          </div>
          <div className="text-sm text-gray-500">
            {lastUpdateDate ? (
              <>Last updated: <strong>{sensorData?.timestamp}</strong> ({secondsSinceUpdate}s ago)</>
            ) : (
              "Waiting for initial data..."
            )}
          </div>
        </div>

        {/* IRRIGATION RECOMMENDATION BADGE */}
        {isConnected && sensorData?.suggestion && (
          <div className={`flex items-center justify-between p-3 px-5 rounded-xl border transition-colors
            ${sensorData?.irrigation_needed ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{sensorData?.irrigation_needed ? "🚨" : "✅"}</span>
              <span className="font-bold">Recommendation: {sensorData?.suggestion}</span>
            </div>
            {sensorData?.irrigation_needed && (
              <span className="water-drop text-2xl">💧</span>
            )}
          </div>
        )}
      </div>

      {/* Sensor Cards */}
      <div className={`grid gap-5 mb-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {/* TEMPERATURE CARD */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-l-6 border-l-green-600">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">🌡️</span>
            <span className="text-gray-500 font-bold text-lg">Temperature</span>
          </div>
          <h3 className="m-0 mb-2.5 text-4xl font-black text-gray-900 leading-tight">
            {sensorData?.temperature !== null ? `${sensorData?.temperature}°C` : "—"}
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 italic">Optimal: 15-35°C</span>
            {sensorData?.temperature !== null && (
              <span className={`text-xs py-1 px-2.5 rounded-full font-bold
                ${(sensorData?.temperature ?? 0) > 15 && (sensorData?.temperature ?? 0) < 35 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {(sensorData?.temperature ?? 0) > 15 && (sensorData?.temperature ?? 0) < 35 ? "Normal" : "Alert"}
              </span>
            )}
          </div>
        </div>

        {/* HUMIDITY CARD */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-l-6 border-l-blue-500">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">☁️</span>
            <span className="text-gray-500 font-bold text-lg">Humidity</span>
          </div>
          <h3 className="m-0 mb-2.5 text-4xl font-black text-gray-900 leading-tight">
            {sensorData?.humidity !== null ? `${sensorData?.humidity}%` : "—"}
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 italic">Optimal: 30-70%</span>
            {sensorData?.humidity !== null && (
              <span className={`text-xs py-1 px-2.5 rounded-full font-bold
                ${(sensorData?.humidity ?? 0) > 30 && (sensorData?.humidity ?? 0) < 70 ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'}`}>
                {(sensorData?.humidity ?? 0) > 30 && (sensorData?.humidity ?? 0) < 70 ? "Normal" : "Alert"}
              </span>
            )}
          </div>
        </div>

        {/* SOIL MOISTURE CARD */}
        <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-l-6 ${getMoistureColor(sensorData?.soil_moisture || null)}`}>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">🌱</span>
            <span className="text-gray-500 font-bold text-lg">Soil Moisture</span>
          </div>
          <h3 className="m-0 mb-2.5 text-4xl font-black text-gray-900 leading-tight">
            {sensorData?.soil_moisture !== null ? `${sensorData?.soil_moisture}%` : "—"}
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 italic">{(sensorData?.soil_moisture ?? 0) < 30 ? "Dry" : (sensorData?.soil_moisture ?? 0) <= 60 ? "Optimal" : "Wet"}</span>
            {sensorData?.soil_moisture !== null && (
              <span className={`text-xs py-1 px-2.5 rounded-full font-bold
                ${(sensorData?.soil_moisture ?? 0) < 30 ? 'bg-red-50 text-red-500' : (sensorData?.soil_moisture ?? 0) <= 60 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                {(sensorData?.soil_moisture ?? 0) < 30 ? "Dry" : (sensorData?.soil_moisture ?? 0) <= 60 ? "Healthy" : "Wet"}
              </span>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center mt-10">
        <p className="text-gray-400 italic text-sm">
          Auto-polling active every 5 seconds • KisanCore AI Smart Gateway
        </p>
      </footer>
    </div>
  );
}
