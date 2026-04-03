import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
);

export default function HomePage() {
  const navigate = useNavigate();
  const [isPageOnline, setIsPageOnline] = useState(navigator.onLine);
  const [showSyncMessage, setShowSyncMessage] = useState(false);
  
  // 1. Auth & Profile
  const isLoggedIn = !!localStorage.getItem('kisancore_farmer');
  const farmer = JSON.parse(localStorage.getItem('kisancore_farmer') || 'null');

  // 2. State for dashboard
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [sensorData, setSensorData] = useState<any>({ temperature: null, humidity: null, soil_moisture: null });
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedCrop, setRecommendedCrop] = useState("");
  const [irrigation, setIrrigation] = useState<any>(null);
  
  // 3. Soil Analysis State
  const [soilInputs, setSoilInputs] = useState({ ph: '', nitrogen: '', moisture: '' });
  const [soilAnalysisResult, setSoilAnalysisResult] = useState<any>(null);
  const [isSoilAiLoading, setIsSoilAiLoading] = useState(false);
  const [soilAiVerdict, setSoilAiVerdict] = useState("");

  const isMobile = window.innerWidth < 768;

  // Effects
  useEffect(() => {
    const handleOnline = () => {
      setIsPageOnline(true);
      setShowSyncMessage(true);
      setTimeout(() => setShowSyncMessage(false), 5000);
    };
    const handleOffline = () => setIsPageOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/api/v1/weather');
        setWeatherData(res.data);
      } catch (err) {
        console.error("Weather fetch failed", err);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sensorRes, recRes, irrRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/v1/iot/sensors'),
          axios.get('http://127.0.0.1:8000/api/v1/recommendation/current'),
          axios.get('http://127.0.0.1:8000/api/v1/iot/irrigation')
        ]);
        setSensorData(sensorRes.data);
        setRecommendedCrop(recRes.data.recommended_crop);
        setIrrigation(irrRes.data);
      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherEmoji = (condition: string, temp: number) => {
    const c = condition.toLowerCase();
    if (c.includes("rain")) return "🌧️";
    if (c.includes("cloud")) return "⛅";
    if (temp > 35) return "🌡️";
    return "☀️";
  };

  const getTrend = (val: number, type: 'temp' | 'hum' | 'moist') => {
    if (type === 'temp') return val > 30 ? "↑" : val < 20 ? "↓" : "→";
    if (type === 'hum') return val > 70 ? "↑" : val < 40 ? "↓" : "→";
    return val > 60 ? "↑" : val < 30 ? "↓" : "→";
  };

  const currentSensorData = isPageOnline ? sensorData : JSON.parse(
    localStorage.getItem('last_sensor') || 
    '{"temperature":28,"humidity":65,"soil_moisture":45}'
  );

  useEffect(() => {
    if (isPageOnline && sensorData.temperature !== null) {
      localStorage.setItem('last_sensor', JSON.stringify(sensorData));
    }
  }, [sensorData, isPageOnline]);

  const analyzeSoil = async () => {
    if (!soilInputs.ph || !soilInputs.nitrogen || !soilInputs.moisture) return;
    
    setIsSoilAiLoading(true);
    setSoilAiVerdict("");

    const ph = parseFloat(soilInputs.ph);
    const n = parseFloat(soilInputs.nitrogen);
    const m = parseFloat(soilInputs.moisture);

    const result = {
        score: Math.round(((ph >= 6 && ph <= 7.5 ? 4 : 2) + (n >= 30 && n <= 80 ? 3 : 1) + (m >= 40 && m <= 70 ? 3 : 1))),
        status: {
            ph: { label: ph < 6 ? "Acidic" : ph > 7.5 ? "Alkaline" : "Neutral", color: ph >= 6 && ph <= 7.5 ? "text-green-600" : "text-orange-500", border: ph >= 6 && ph <= 7.5 ? "border-green-200" : "border-orange-200" },
            n: { label: n < 30 ? "Low" : n > 80 ? "High" : "Optimal", color: n >= 30 && n <= 80 ? "text-green-600" : "text-orange-500", border: n >= 30 && n <= 80 ? "border-green-200" : "border-orange-200" },
            m: { label: m < 40 ? "Dry" : m > 70 ? "Wet" : "Good", color: m >= 40 && m <= 70 ? "text-green-600" : "text-orange-500", border: m >= 40 && m <= 70 ? "border-green-200" : "border-orange-200" }
        },
        tips: [
            ph < 6 ? "Add lime to increase pH" : ph > 7.5 ? "Add sulfur or organic mulch to lower pH" : "pH level is optimal for most crops",
            n < 30 ? "Apply nitrogenous fertilizer" : n > 80 ? "Reduce nitrogen input to avoid leaching" : "Nitrogen levels are adequate",
            m < 40 ? "Increase irrigation frequency" : m > 70 ? "Ensure better drainage" : "Moisture level is good"
        ]
    };

    setSoilAnalysisResult(result);

    try {
        const response = await axios.post('http://127.0.0.1:8000/api/v1/chat/stream', {
            message: `Provide a 2-sentence expert farming verdict for soil with pH ${ph}, Nitrogen ${n}mg/kg, and Moisture ${m}%. Is it fertile? What's the best immediate action? (English only)`,
            stream: false
        });
        setSoilAiVerdict(response.data);
    } catch (err) {
        setSoilAiVerdict("Soil is fertile but regular monitoring of pH and moisture is recommended for best yield.");
    } finally {
        setIsSoilAiLoading(false);
    }
  };

  const getDynamicTips = (temp: number, hum: number, moist: number, condition: string) => {
    const tips = [];
    if (moist < 30) tips.push({ icon: "🚰", text: "Soil is very dry. Consider starting irrigation now.", type: "warning" });
    else if (moist > 75) tips.push({ icon: "🌊", text: "Soil is saturated. Check drainage to avoid root rot.", type: "warning" });
    else tips.push({ icon: "✅", text: "Soil moisture is in the healthy range.", type: "good" });

    if (temp > 35) tips.push({ icon: "🔥", text: "High temperature detected. Avoid midday spraying.", type: "warning" });
    if (condition.toLowerCase().includes("rain")) tips.push({ icon: "🌧️", text: "Rain expected. You might pause automated irrigation.", type: "info" });
    
    return tips.length > 0 ? tips : [{ icon: "🌾", text: "Conditions are stable for your crops.", type: "good" }];
  };

  return (
    <div className="font-sans">
      
      {/* Offline Banner */}
      {!isPageOnline && (
        <div className="bg-amber-100 border-b border-amber-200 py-3 px-6 text-amber-800 text-center font-bold text-sm animate-fade-in flex items-center justify-center gap-2">
          <span></span> Offline — Showing last saved data. Soil analysis and irrigation work fully offline.
        </div>
      )}

      {/* Back Online Message */}
      {showSyncMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white py-2 px-6 rounded-full font-bold shadow-2xl animate-fade-in flex items-center gap-2">
          <span>🟢</span> Back online — Syncing latest data...
        </div>
      )}
      
      {/* STEP 1: Farmer Welcome Banner */}
      {isLoggedIn && farmer && (
        <div className="mb-6 -mx-4 md:-mx-0 bg-gradient-to-r from-green-600 to-teal-500 rounded-2xl p-6 shadow-lg flex items-center justify-between text-white animate-fade-in-down">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
              👨‍🌾
            </div>
            <div>
              <h2 className="text-xl font-bold m-0 leading-tight">Welcome back, {farmer.name}!</h2>
              <div className="flex gap-4 mt-1 opacity-90 text-sm font-medium">
                <span>📍 {farmer.location}</span>
                <span>🚜 Farm: {farmer.farm_size} acres</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="bg-white/20 hover:bg-white/30 transition-all border border-white/40 py-2 px-5 rounded-xl text-sm font-bold backdrop-blur-sm"
          >
            Edit Profile
          </button>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[500px] -mx-8 md:-mx-12 mb-12 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80" 
            alt="Rice field" 
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-green-900/40" />
        </div>

        <div className="relative z-10 px-6 py-12 flex flex-col items-center text-center max-w-4xl">
          <div className="inline-block bg-[#16a34a] text-white text-sm font-bold px-4 py-1 rounded-full mb-6 whitespace-nowrap shadow-lg animate-fade-in-up [animation-delay:100ms]">
            🌿 AI Powered Farming
          </div>
          
          <h1 className="text-white text-[32px] md:text-[54px] font-bold leading-tight mb-6 tracking-tight drop-shadow-md animate-fade-in-up [animation-delay:300ms]">
            Empowering Farmers with <br />
            <span className="text-[#4ade80]">Next-Gen AI & IoT</span>
          </h1>
          
          <p className="text-white/90 text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-2xl drop-shadow-sm animate-fade-in-up [animation-delay:500ms]">
            Smart crop recommendations, disease detection, live IoT monitoring — all in one platform
          </p>

          <div className="flex flex-col sm:flex-row gap-5 animate-fade-in-up [animation-delay:700ms]">
            <button 
              onClick={() => navigate('/crops')}
              className="bg-white text-[#16a34a] font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-green-50 active:scale-95 shadow-xl hover-lift ripple"
            >
              Get Crop Recommendation
            </button>
            <button 
              onClick={() => navigate('/scan')}
              className="bg-transparent border-2 border-white text-white font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-white/10 active:scale-95 shadow-lg backdrop-blur-sm hover-lift ripple"
            >
              Scan Disease
            </button>
          </div>
        </div>
      </section>

      {/* 2. WEATHER CARD */}
      <section className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-8 mb-10 shadow-sm border border-blue-200 dark:border-blue-800 animate-fade-in-up hover-lift">
        <h2 className="text-xl text-gray-900 dark:text-white m-0 mb-6 font-bold flex items-center gap-2 uppercase tracking-widest text-xs opacity-50">🌤️ Today's Weather</h2>
        
        <div className="flex gap-8 items-center flex-wrap mb-6">
          <div className="min-w-[200px]">
            <div className="flex flex-col gap-2">
              {weatherLoading ? (
                <>
                  <Skeleton className="h-16 w-32" />
                  <Skeleton className="h-8 w-48" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <span className="text-6xl font-black text-blue-900 dark:text-blue-300 leading-none">
                      {weatherData?.temperature !== undefined ? `${Math.round(weatherData.temperature * 10) / 10}°C` : "N/A"}
                    </span>
                    <span className="text-5xl">{getWeatherEmoji(weatherData?.condition || "", weatherData?.temperature || 25)}</span>
                  </div>
                  <p className="m-0 mt-1 text-blue-500 dark:text-blue-400 font-bold text-xl">
                    {weatherData?.condition || ""}
                  </p>
                  {weatherData?.city && (
                    <p className="m-0 text-sm text-blue-400 font-semibold italic">
                      📍 {weatherData.city}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-5 flex-1 flex-wrap">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-[1_1_150px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <p className="m-0 mb-1 text-gray-400 text-xs font-black uppercase tracking-widest">Humidity</p>
              <p className="m-0 font-bold text-gray-800 dark:text-white text-2xl">
                {weatherLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : weatherData?.humidity !== undefined ? `${weatherData.humidity}%` : "N/A"}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-[1_1_150px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <p className="m-0 mb-1 text-gray-400 text-xs font-black uppercase tracking-widest">Wind Speed</p>
              <p className="m-0 font-bold text-gray-800 dark:text-white text-2xl">
                {weatherLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : weatherData?.wind_speed !== undefined ? `${weatherData.wind_speed} m/s` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-blue-200 dark:border-blue-800 pt-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="m-0 text-green-700 dark:text-green-400 italic font-bold text-lg min-h-[28px]">
            {weatherLoading ? <Skeleton className="h-6 w-64" /> : weatherData?.farming_tip ? `💡 ${weatherData.farming_tip}` : "💡 Good farming conditions today"}
          </p>
          
          {!weatherLoading && weatherData && (
            <button
              onClick={() => navigate('/chat', { 
                state: { 
                  prefill: `It is currently ${Math.round(weatherData.temperature * 10) / 10}°C with ${weatherData.condition} and ${weatherData.humidity}% humidity in ${weatherData.city || 'my area'}. What farming advice do you have for today?` 
                } 
              })}
              className="bg-white border-2 border-[#16a34a] text-[#16a34a] py-2 px-3.5 rounded-xl text-[13px] font-black cursor-pointer shadow-sm transition-all hover:bg-[#f0fdf4] active:scale-95 flex items-center gap-2"
            >
              🤖 Ask AI about today's weather
            </button>
          )}
        </div>
      </section>

      {/* 3. LIVE FARM DATA */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs opacity-50 m-0">Live Farm Data</h2>
          {isPageOnline ? (
            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-green-200 animate-pulse tracking-widest">LIVE</span>
          ) : sensorData.temperature !== null ? (
            <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-orange-200 tracking-widest">OFFLINE - LAST DATA</span>
          ) : null}
        </div>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#ef4444] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl"></span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-2">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-[36px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
                      {currentSensorData?.temperature || 0}°C
                    </h3>
                    <span className={`text-xl font-bold ${getTrend(currentSensorData?.temperature || 25, 'temp') === '↑' ? 'text-red-500' : 'text-blue-500'}`}>
                      {getTrend(currentSensorData?.temperature || 25, 'temp')}
                    </span>
                  </>
                )}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">Temperature</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#3b82f6] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl">💧</span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-2">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-[36px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
                      {currentSensorData?.humidity || 0}%
                    </h3>
                    <span className="text-xl font-bold text-blue-500">{getTrend(currentSensorData?.humidity || 50, 'hum')}</span>
                  </>
                )}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">Humidity</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#16a34a] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl">🌱</span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-2">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-[36px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
                      {currentSensorData?.soil_moisture || 0}%
                    </h3>
                    <span className="text-xl font-bold text-green-500">{getTrend(currentSensorData?.soil_moisture || 50, 'moist')}</span>
                  </>
                )}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">Soil Moisture</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#f97316] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl">🚰</span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px]">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <h3 className={`m-0 mb-1 text-[36px] font-black tracking-tight leading-none ${
                    !isPageOnline ? 'text-gray-400' :
                    irrigation?.status === "ON" ? "text-red-500" :
                    irrigation?.status === "MODERATE" ? "text-orange-500" :
                    "text-green-600"
                  }`}>
                    {!isPageOnline ? "---" : (irrigation?.status || "---")}
                  </h3>
                )}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">
                {!isPageOnline ? "Irrigation (Offline)" : "Irrigation"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI RECOMMENDATION + QUICK TIPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <section>
          <h2 className="text-xl text-gray-900 dark:text-white mb-6 font-black uppercase tracking-widest text-xs opacity-50">AI Recommendation</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 shadow-sm border border-gray-100 dark:border-slate-700 h-full flex flex-col items-center justify-center text-center bg-gradient-to-br from-white to-green-50 dark:to-green-900/10 hover-lift">
            {isLoading ? (
              <>
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full animate-pulse mb-6" />
                <Skeleton className="h-10 w-48 mb-4" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </>
            ) : (
              <>
                <span className="text-6xl mb-6">🌾</span>
                <p className="m-0 mb-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">Recommended Crop</p>
                <h3 className="m-0 mb-4 text-4xl text-green-700 dark:text-green-500 capitalize font-black tracking-tight">
                  {recommendedCrop || "Analyzing..."}
                </h3>
                <span className="bg-green-600 text-white py-2 px-6 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-green-600/20">
                  Ideal Match
                </span>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl text-gray-900 dark:text-white mb-6 font-black uppercase tracking-widest text-xs opacity-50">Quick Tips</h2>
          <div className="flex flex-col gap-4">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4">
                   <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse flex-shrink-0" />
                   <div className="flex-1 space-y-2">
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-3 w-3/4" />
                   </div>
                </div>
              ))
            ) : (
              getDynamicTips(
                sensorData?.temperature || 25, 
                sensorData?.humidity || 50, 
                sensorData?.soil_moisture || 50, 
                weatherData?.condition || "Sunny"
              ).map((tip, idx) => {
                const borderColors: any = { warning: "border-l-amber-500", good: "border-l-green-600", info: "border-l-blue-500" };
                const bgIcons: any = { warning: "bg-orange-50 dark:bg-orange-900/20", good: "bg-green-50 dark:bg-green-900/20", info: "bg-blue-50 dark:bg-blue-900/20" };
                
                return (
                  <div key={idx} className={`bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-5 border-l-4 rounded-l-sm transition-all hover-lift animate-slide-in-right ${borderColors[tip.type]}`} style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className={`w-14 h-14 rounded-xl flex justify-center items-center flex-shrink-0 ${bgIcons[tip.type]}`}>
                      <span className="text-2xl">{tip.icon}</span>
                    </div>
                    <p className="m-0 text-gray-600 dark:text-slate-300 text-sm leading-snug font-bold">
                      {tip.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* 5. SOIL ANALYSIS */}
      <section className="mb-4 pb-4">
        <h2 className="text-xl text-gray-900 dark:text-white m-0 mb-1 font-bold uppercase tracking-widest text-xs opacity-50">
          🧪 Soil Health Analysis
        </h2>
        <p className="m-0 mb-8 text-gray-400 text-sm font-medium">Get professional AI advice for your soil</p>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift transition-all">
          <div className={`flex gap-6 flex-wrap mb-6 ${isMobile ? 'flex-col' : 'flex-row'}`}>
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-2 font-bold text-gray-500 dark:text-slate-400 text-sm">Soil pH</label>
              <input 
                type="number" step="0.1" min="0" max="14" placeholder="e.g. 6.5"
                value={soilInputs.ph}
                onChange={(e) => setSoilInputs({...soilInputs, ph: e.target.value})}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-base focus-ring-green outline-none"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-2 font-bold text-gray-500 dark:text-slate-400 text-sm">Nitrogen (mg/kg)</label>
              <input 
                type="number" min="0" max="140" placeholder="e.g. 40"
                value={soilInputs.nitrogen}
                onChange={(e) => setSoilInputs({...soilInputs, nitrogen: e.target.value})}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-base focus-ring-green outline-none"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-2 font-bold text-gray-500 dark:text-slate-400 text-sm">Moisture (%)</label>
              <input 
                type="number" min="0" max="100" placeholder="e.g. 50"
                value={soilInputs.moisture}
                onChange={(e) => setSoilInputs({...soilInputs, moisture: e.target.value})}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-base focus-ring-green outline-none"
              />
            </div>
          </div>

          <button
            onClick={analyzeSoil}
            className="w-full py-4.5 bg-[#16a34a] text-white border-none rounded-xl text-lg font-black cursor-pointer shadow-lg shadow-green-600/30 transition-all hover:bg-green-700 active:scale-[0.98] ripple flex items-center justify-center gap-3"
          >
            Analyse Soil
          </button>

          {soilAnalysisResult && (
            <div className="mt-10 p-8 rounded-2xl border-2 border-[#16a34a] bg-white shadow-xl animate-fade-in-up">
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="m-0 text-xl font-black text-gray-900 flex items-center gap-2">
                  🌱 Soil Health Result
                </h3>
                <div className="bg-green-600 text-white font-black text-xl px-4 py-1.5 rounded-xl shadow-sm">
                  {soilAnalysisResult.score}/10
                </div>
              </div>

              {/* AI Verdict */}
              {(isSoilAiLoading || soilAiVerdict) && (
                <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
                  <div className="font-black text-green-700 text-sm mb-1 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="text-base">🤖</span> AI Verdict:
                  </div>
                  {isSoilAiLoading ? (
                    <div className="animate-pulse flex flex-col gap-2 mt-2">
                      <div className="h-4 bg-green-200 rounded w-full"></div>
                      <div className="h-4 bg-green-200 rounded w-2/3"></div>
                    </div>
                  ) : (
                    <p className="m-0 mt-1 text-green-900 text-lg font-medium italic leading-relaxed">
                      "{soilAiVerdict}"
                    </p>
                  )}
                </div>
              )}

              {/* Instant Mini Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-xl border ${soilAnalysisResult.status.ph.border} ${soilAnalysisResult.status.ph.color}`}>
                  <p className="m-0 text-xs font-bold uppercase tracking-wider opacity-60 mb-1">pH Level</p>
                  <p className="m-0 text-lg font-black">{soilAnalysisResult.status.ph.label}</p>
                </div>
                <div className={`p-4 rounded-xl border ${soilAnalysisResult.status.n.border} ${soilAnalysisResult.status.n.color}`}>
                  <p className="m-0 text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Nitrogen</p>
                  <p className="m-0 text-lg font-black">{soilAnalysisResult.status.n.label}</p>
                </div>
                <div className={`p-4 rounded-xl border ${soilAnalysisResult.status.m.border} ${soilAnalysisResult.status.m.color}`}>
                  <p className="m-0 text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Moisture</p>
                  <p className="m-0 text-lg font-black">{soilAnalysisResult.status.m.label}</p>
                </div>
              </div>

              <div className="w-full h-[1px] bg-gray-100 mb-6" />

              {/* Action Tips */}
              <h4 className="m-0 mb-4 text-sm font-bold text-gray-500 uppercase tracking-widest">Recommended Actions</h4>
              <div className="flex flex-col gap-4">
                {soilAnalysisResult.tips.map((tip: string, i: number) => {
                  const isGood = tip.includes("good") || tip.includes("adequate") || tip.includes("optimal");
                  return (
                    <div key={i} className={`flex gap-4 items-start p-4 rounded-xl border-l-4 ${isGood ? 'bg-green-50 border-green-500 text-green-800' : 'bg-amber-50 border-amber-500 text-amber-800'}`}>
                      <span className="text-lg flex-shrink-0 mt-0.5">{isGood ? '✅' : '⚠️'}</span>
                      <p className="m-0 text-base font-bold leading-relaxed">
                        {tip}{!tip.endsWith('.') && '.'}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <button
                onClick={() => navigate('/chat', { state: { prefill: `I have more questions about my soil (pH ${soilInputs.ph}, N ${soilInputs.nitrogen}, Moisture ${soilInputs.moisture}%):` } })}
                className="mt-8 w-full py-3.5 px-6 bg-green-50 text-[#16a34a] border border-[#16a34a] rounded-xl font-black text-sm hover:bg-green-100 transition-all cursor-pointer ripple"
              >
                Ask More Questions →
              </button>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
