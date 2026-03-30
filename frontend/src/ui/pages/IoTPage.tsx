import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// --- HELPER: COUNT UP ANIMATION ---
const CountUp = ({ end, duration = 1500, decimals = 0 }: { end: number, duration?: number, decimals?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span>{count.toFixed(decimals)}</span>;
};

interface SensorData {
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  timestamp: string | null;
}

// --- HELPER: SKELETON CARD ---
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full" />
      <div className="w-20 h-6 bg-gray-200 rounded-full" />
    </div>
    <div className="w-24 h-10 bg-gray-200 rounded mb-2" />
    <div className="w-32 h-4 bg-gray-100 rounded mb-6" />
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-full h-2 bg-gray-100 rounded-full" />
      ))}
    </div>
    <div className="w-40 h-3 bg-gray-50 rounded" />
  </div>
);

// --- HELPER: DOT INDICATORS ---
const DotIndicators = ({ value, min, max, activeColor }: { value: number | null, min: number, max: number, activeColor: string }) => {
  if (value === null) return (
    <div className="flex gap-1.5 my-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex-1 h-1.5 bg-gray-100 rounded-full" />
      ))}
    </div>
  );

  // Calculate how many dots to fill based on a reasonable range
  // We'll normalize the value to 1-5 dots
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const activeDots = Math.ceil((percentage / 100) * 5);

  return (
    <div className="flex gap-1.5 my-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${i <= activeDots ? activeColor : 'bg-gray-100'}`}
        />
      ))}
    </div>
  );
};

export default function IoTPage() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [aiIrrigation, setAiIrrigation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const lastAiFetch = useRef<number>(0);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/iot/latest');
      if (!res.ok) throw new Error("Backend unreachable");
      const data: SensorData = await res.json();
      
      if (data.temperature !== undefined) {
        setSensorData(data);
        setLastUpdateDate(Date.now());
        setError(null);
      }
    } catch (err) {
      console.error("IoT Fetch Error:", err);
      // We don't set error here to keep the last known values visible, 
      // but the "Offline" status will handle it visually.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Connectivity logic
  const isOnline = lastUpdateDate && (Date.now() - lastUpdateDate < 30000);
  const lastUpdateStr = sensorData?.timestamp || "Never";

  // --- LOGIC: TEMPERATURE ---
  const getTempBadge = (temp: number | null) => {
    if (temp === null) return null;
    if (temp < 15) return <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">Too Cold</span>;
    if (temp > 35) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">Too Hot</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">Optimal</span>;
  };

  // --- LOGIC: HUMIDITY ---
  const getHumidityBadge = (hum: number | null) => {
    if (hum === null) return null;
    if (hum < 30) return <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-100">Too Dry</span>;
    if (hum > 70) return <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">Too Humid</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">Optimal</span>;
  };

  // --- LOGIC: SOIL MOISTURE ---
  const getMoistureBadge = (moist: number | null) => {
    if (moist === null) return null;
    if (moist < 30) return <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-100">Too Dry</span>;
    if (moist > 60) return <span className="bg-teal-50 text-teal-600 text-xs font-bold px-2.5 py-1 rounded-full border border-teal-100">Waterlogged</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">Optimal</span>;
  };

  // --- LOGIC: AI IRRIGATION ANALYSIS ---
  useEffect(() => {
    const fetchAiIrrigation = async () => {
      if (!sensorData?.soil_moisture || Date.now() - lastAiFetch.current < 300000) return; // 5 min cache
      
      setIsAiLoading(true);
      try {
        const prompt = `Current soil moisture is ${sensorData.soil_moisture}%. Status: ${sensorData.soil_moisture < 30 ? 'Low' : sensorData.soil_moisture > 60 ? 'Waterlogged' : 'Optimal'}. Give a 2-sentence summary of irrigation status and advice. Reply in English only.`;
        const res = await fetch("http://127.0.0.1:8000/api/v1/chat/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt, history: [] })
        });
        if (res.ok) {
          const data = await res.json();
          setAiIrrigation(data.reply);
          lastAiFetch.current = Date.now();
        }
      } catch (err) {
        console.error("AI Irrigation error:", err);
      } finally {
        setIsAiLoading(false);
      }
    };

    if (sensorData) fetchAiIrrigation();
  }, [sensorData]);

  const renderIrrigationCard = () => {
    const moist = sensorData?.soil_moisture;
    if (moist === null || moist === undefined) return null;

    let bg = "bg-white border-gray-100";
    let status = "Irrigation Status";
    let icon = "🚿";

    if (moist < 30) {
      bg = "bg-orange-50 border-orange-200 text-orange-900";
      status = "⚠️ Irrigation Required";
    } else if (moist >= 30 && moist <= 60) {
      bg = "bg-green-50 border-green-200 text-green-800";
      status = "✅ No Irrigation Needed";
      icon = "🌿";
    } else {
      bg = "bg-blue-50 border-blue-200 text-blue-900";
      status = "💧 Soil is Waterlogged";
      icon = "🌊";
    }

    return (
      <div className={`mt-4 p-8 rounded-3xl border-2 transition-all duration-500 shadow-sm animate-fade-in-up hover-lift ${bg}`}>
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{icon}</span>
            <div>
              <h2 className="text-2xl font-black mb-1 m-0">{status}</h2>
              <p className="m-0 text-sm opacity-70 font-bold uppercase tracking-widest">AI Analysis Engine</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/chat', { state: { prefill: `Soil moisture is ${moist}%. Should I change my irrigation schedule?` } })}
            className="bg-white/50 backdrop-blur-sm border-2 border-current px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:bg-white hover:shadow-md ripple"
          >
            🤖 Professional Advice →
          </button>
        </div>

        <div className="mt-6 p-5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 text-lg font-medium leading-relaxed italic">
          {isAiLoading ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              <span className="ml-2 font-bold uppercase tracking-tighter">AI is thinking...</span>
            </div>
          ) : (
            aiIrrigation || `The current moisture level is ${moist}%. ${moist < 30 ? 'Soil is dry, consider turning on the water.' : 'Moisture is adequate.'}`
          )}
        </div>
      </div>
    );
  };

  if (isLoading && !sensorData) {
    return (
      <div className="pb-20 space-y-8">
        <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 font-sans text-gray-900">
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        .pulse-dot {
          animation: pulse-green 2s infinite;
        }
      `}</style>

      {/* HEADER */}
      <section className="bg-[#15803d] rounded-2xl p-8 md:p-10 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold m-0">📡 IoT Dashboard</h1>
            {isOnline && (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full pulse-dot" />
                <span>LIVE</span>
              </div>
            )}
          </div>
          <p className="text-white/80 text-lg m-0">Real-time sensor data from your farm</p>
        </div>
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      </section>

      {/* SENSOR CARDS */}
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span className="text-green-600">📊</span> Live Sensor Readings
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* TEMPERATURE CARD */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 border-t-red-500 relative hover-lift animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
              🌡️
            </div>
            {getTempBadge(sensorData?.temperature || null)}
          </div>
          <h3 className="m-0 text-4xl font-black text-gray-900">
            {sensorData?.temperature !== undefined && sensorData?.temperature !== null ? <CountUp end={sensorData.temperature} decimals={1} /> : "--"}°C
          </h3>
          <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">Soil Temp</p>
          
          <DotIndicators value={sensorData?.temperature || null} min={0} max={50} activeColor="bg-red-500" />
          
          <p className="text-xs text-gray-400 m-0 italic">Optimal range: 15-35°C</p>
        </div>

        {/* HUMIDITY CARD */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 border-t-blue-500 relative hover-lift animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
              💧
            </div>
            {getHumidityBadge(sensorData?.humidity || null)}
          </div>
          <h3 className="m-0 text-4xl font-black text-gray-900">
            {sensorData?.humidity !== undefined && sensorData?.humidity !== null ? <CountUp end={sensorData.humidity} /> : "--"}%
          </h3>
          <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">Air Humidity</p>
          
          <DotIndicators value={sensorData?.humidity || null} min={0} max={100} activeColor="bg-blue-500" />
          
          <p className="text-xs text-gray-400 m-0 italic">Optimal range: 30-70%</p>
        </div>

        {/* SOIL MOISTURE CARD */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 border-t-green-500 relative hover-lift animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
              🌱
            </div>
            {getMoistureBadge(sensorData?.soil_moisture || null)}
          </div>
          <h3 className="m-0 text-4xl font-black text-gray-900">
            {sensorData?.soil_moisture !== undefined && sensorData?.soil_moisture !== null ? <CountUp end={sensorData.soil_moisture} /> : "--"}%
          </h3>
          <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">Soil Moisture</p>
          
          <DotIndicators value={sensorData?.soil_moisture || null} min={0} max={100} activeColor="bg-green-500" />
          
          <p className="text-xs text-gray-400 m-0 italic">Optimal range: 30-60%</p>
        </div>
      </div>

      <div className="text-sm text-gray-400 mb-10 flex items-center justify-center gap-2 bg-gray-50 py-2 rounded-full border border-gray-100 max-w-fit mx-auto px-6">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        Last updated: <strong className="text-gray-600 ml-1">{lastUpdateStr}</strong>
      </div>

      {/* IRRIGATION STATUS */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🚿</span> Irrigation Status
      </h2>
      {renderIrrigationCard()}

      {/* SENSOR HEALTH */}
      <h2 className="text-xl font-bold mb-6 mt-12 flex items-center gap-2">
        <span>🔧</span> Sensor Health
      </h2>
      <div className="flex flex-wrap gap-4">
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600 opacity-60'}`}>
          <span>🌡️</span> Temp Sensor: {isOnline ? 'Online' : 'Offline'}
        </div>
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600 opacity-60'}`}>
          <span>💧</span> Humidity Sensor: {isOnline ? 'Online' : 'Offline'}
        </div>
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600 opacity-60'}`}>
          <span>🌱</span> Soil Sensor: {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <footer className="mt-16 text-center border-t border-gray-100 pt-8">
        <p className="text-gray-400 italic text-sm">
          Connect ESP32 hardware to get real sensor readings from your farm.
        </p>
      </footer>
    </div>
  );
}
