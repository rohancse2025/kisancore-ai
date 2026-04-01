import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSensor } from '../../context/SensorContext';

// Interfaces for fetched data
interface SensorData {
  temperature: number;
  humidity: number;
  soil_moisture: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  city: string;
  farming_tip: string;
}

interface IrrigationSuggestion {
  status: string;
  message: string;
}

interface CropRecommendation {
  crop: string;
}

// Skeleton Loader Component
const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
);

// Helper for dynamic tips
const getDynamicTips = (temp: number, humidity: number, moisture: number, condition: string) => {
  const conditionTips: { text: string; type: 'warning' | 'good' | 'info'; icon: string }[] = [];
  
  if (temp > 35) conditionTips.push({ text: "High heat alert — water your crops early morning before 7 AM to reduce evaporation", type: 'warning', icon: "🌡️" });
  if (temp < 15) conditionTips.push({ text: "Cool weather — protect sensitive seedlings from cold stress with mulching", type: 'warning', icon: "🥶" });
  if (humidity > 80) conditionTips.push({ text: "High humidity detected — watch for fungal diseases, avoid overhead watering today", type: 'warning', icon: "🍄" });
  if (humidity < 40) conditionTips.push({ text: "Low humidity — increase irrigation frequency and mulch soil to retain moisture", type: 'warning', icon: "💧" });
  if (moisture < 30) conditionTips.push({ text: "Soil is dry — irrigate your crops today, focus on root zone watering", type: 'warning', icon: "🚰" });
  if (moisture > 70) conditionTips.push({ text: "Soil is too wet — stop irrigation, improve field drainage to avoid root rot", type: 'warning', icon: "⚠️" });
  
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes("rain")) conditionTips.push({ text: "Rain expected — skip irrigation today and delay fertilizer application", type: 'warning', icon: "🌧️" });
  if (lowerCondition.includes("cloud")) conditionTips.push({ text: "Cloudy day — good time to transplant seedlings or apply foliar spray", type: 'good', icon: "☁️" });

  const generalTips: { text: string; type: 'warning' | 'good' | 'info'; icon: string }[] = [
    { text: "Soil moisture is optimal — maintain current irrigation schedule", type: 'good', icon: "✅" },
    { text: "Good conditions — ideal time to apply fertilizers for better absorption", type: 'good', icon: "🌱" },
    { text: "Check your crop growth stage and adjust nutrients accordingly", type: 'info', icon: "📊" },
    { text: "Inspect crops for pest activity during early morning hours", type: 'info', icon: "🐛" },
    { text: "Consider inter-cropping to maximize yield and soil health", type: 'info', icon: "🌾" }
  ];

  // Always show exactly 3 tips. Prioritize condition-based.
  let selected = [...conditionTips];
  if (selected.length < 3) {
    const dailyOffset = new Date().getDate() % generalTips.length;
    for (let i = 0; i < generalTips.length && selected.length < 3; i++) {
      const tip = generalTips[(dailyOffset + i) % generalTips.length];
      if (!selected.find(s => s.text === tip.text)) {
        selected.push(tip);
      }
    }
  }

  return selected.slice(0, 3);
};

// No-op for removed helpers

export default function HomePage() {
  const navigate = useNavigate();
  
  const { temperature, humidity, soil_moisture, isOnline } = useSensor();
  const sensorData = { temperature, humidity, soil_moisture };
  
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [recommendedCrop, setRecommendedCrop] = useState<string | null>(null);
  const [hasFetchedCrop, setHasFetchedCrop] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Only compute irrigation when ESP is actually live and soil_moisture is a real reading
  let irrigation: IrrigationSuggestion | null = null;
  if (isOnline && soil_moisture !== null && soil_moisture !== -999) {
    let irrStatus = "OFF";
    let irrMessage = "No irrigation needed";
    if (soil_moisture < 30) {
      irrStatus = "ON";
      irrMessage = "Soil is dry — irrigate now";
    } else if (soil_moisture <= 60) {
      irrStatus = "MODERATE";
      irrMessage = "Moderate irrigation recommended";
    }
    irrigation = { status: irrStatus, message: irrMessage };
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [soilInputs, setSoilInputs] = useState({ ph: "", nitrogen: "", moisture: "" });
  const [soilAnalysisResult, setSoilAnalysisResult] = useState<{
    tips: string[];
    score: number;
    status: {
      ph: { label: string; color: string; border: string; };
      n: { label: string; color: string; border: string; };
      m: { label: string; color: string; border: string; };
    };
  } | null>(null);
  const [soilAiVerdict, setSoilAiVerdict] = useState<string | null>(null);
  const [isSoilAiLoading, setIsSoilAiLoading] = useState(false);

  const analyzeSoil = async () => {
    const ph = parseFloat(soilInputs.ph);
    const n = parseFloat(soilInputs.nitrogen);
    const m = parseFloat(soilInputs.moisture);
    if (isNaN(ph) || isNaN(n) || isNaN(m)) return;
    
    // Status badges logic
    const phStatus = ph < 6.0 ? { label: "Acidic", color: "text-amber-700 bg-amber-50", border: "border-amber-200" } : ph > 7.5 ? { label: "Alkaline", color: "text-amber-700 bg-amber-50", border: "border-amber-200" } : { label: "Optimal", color: "text-green-700 bg-green-50", border: "border-green-200" };
    const nStatus = n < 30 ? { label: "Low", color: "text-red-700 bg-red-50", border: "border-red-200" } : n > 80 ? { label: "High", color: "text-amber-700 bg-amber-50", border: "border-amber-200" } : { label: "Optimal", color: "text-green-700 bg-green-50", border: "border-green-200" };
    const mStatus = m < 30 ? { label: "Dry", color: "text-red-700 bg-red-50", border: "border-red-200" } : m > 60 ? { label: "Wet", color: "text-amber-700 bg-amber-50", border: "border-amber-200" } : { label: "Optimal", color: "text-green-700 bg-green-50", border: "border-green-200" };

    const tips: string[] = [];
    let score = 10;

    if (ph < 5.5) { tips.push("Add lime to increase soil pH"); score -= 2; }
    else if (ph > 7.5) { tips.push("Add sulfur to reduce soil pH"); score -= 2; }
    else { tips.push("Soil pH is in good range (6.0-7.5)"); }
    
    if (n < 40) { tips.push("Apply urea fertilizer to boost nitrogen"); score -= 3; }
    else if (n > 100) { tips.push("Reduce nitrogen fertilizer application"); score -= 2; }
    else { tips.push("Nitrogen levels are adequate"); }
    
    if (m < 30) { tips.push("Increase irrigation — soil is too dry"); score -= 2; }
    else if (m > 70) { tips.push("Improve drainage — soil is too wet"); score -= 2; }
    else { tips.push("Soil moisture is at optimal level"); }

    score = Math.max(1, score);
    
    setSoilAnalysisResult({ tips, score, status: { ph: phStatus, n: nStatus, m: mStatus } });

    // AI Fetch Logic
    setSoilAiVerdict(null);
    setIsSoilAiLoading(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const prompt = `Soil pH: ${ph}, Nitrogen: ${n} mg/kg, Moisture: ${m}%. Give ONE sentence expert verdict on this soil in simple English. Max 20 words only.`;
      const res = await fetch("http://127.0.0.1:8000/api/v1/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        setSoilAiVerdict(data.reply);
      }
    } catch (err) {
      console.error("AI Verdict Error:", err);
    } finally {
      clearTimeout(timeoutId);
      setIsSoilAiLoading(false);
    }
  };

  useEffect(() => {
    if (temperature !== null && humidity !== null && !hasFetchedCrop) {
      setHasFetchedCrop(true);
      const fetchCrop = async () => {
        try {
          const cropRes = await fetch(`http://127.0.0.1:8000/api/v1/recommend-crop?temperature=${temperature}&humidity=${humidity}&ph=6.5&rainfall=100`);
          const cropJson = await cropRes.json();
          setRecommendedCrop(cropJson.crop);
        } catch (error) {
          console.error("Error fetching crop recommendation:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCrop();
    } else if (temperature === null && !hasFetchedCrop) {
      const timeout = setTimeout(() => setIsLoading(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [temperature, humidity, hasFetchedCrop]);

  useEffect(() => {
    const fetchWeather = async () => {
      // 10-minute weather cache logic
      const CACHE_KEY = 'weather_cache_v2';
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 2 * 60 * 1000) {
          setWeatherData(data);
          setWeatherLoading(false);
          return;
        }
      }

      setWeatherLoading(true);
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        );
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`http://127.0.0.1:8000/api/v1/weather?lat=${latitude}&lon=${longitude}`);
        if (!res.ok) throw new Error('Weather API failed');
        const data: WeatherData = await res.json();
        setWeatherData(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (err) {
        console.error("Weather Fetch Error:", err);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
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

  return (
    <div className="font-sans">
      
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
          {isOnline ? (
            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-green-200 animate-pulse tracking-widest">LIVE</span>
          ) : sensorData.temperature !== null ? (
            <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-orange-200 tracking-widest">OFFLINE - LAST DATA</span>
          ) : null}
        </div>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#ef4444] flex flex-col justify-between hover-lift">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex justify-center items-center">
              <span className="text-2xl">🌡️</span>
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-2">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-[36px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
                      {sensorData?.temperature || 0}°C
                    </h3>
                    <span className={`text-xl font-bold ${getTrend(sensorData?.temperature || 25, 'temp') === '↑' ? 'text-red-500' : 'text-blue-500'}`}>
                      {getTrend(sensorData?.temperature || 25, 'temp')}
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
                      {sensorData?.humidity || 0}%
                    </h3>
                    <span className="text-xl font-bold text-blue-500">{getTrend(sensorData?.humidity || 50, 'hum')}</span>
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
                      {sensorData?.soil_moisture || 0}%
                    </h3>
                    <span className="text-xl font-bold text-green-500">{getTrend(sensorData?.soil_moisture || 50, 'moist')}</span>
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
                    !isOnline ? 'text-gray-400' :
                    irrigation?.status === "ON" ? "text-red-500" :
                    irrigation?.status === "MODERATE" ? "text-orange-500" :
                    "text-green-600"
                  }`}>
                    {!isOnline ? "---" : (irrigation?.status || "---")}
                  </h3>
                )}
              </div>
              <p className="m-0 text-[14px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 mt-1">
                {!isOnline ? "Irrigation (Offline)" : "Irrigation"}
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
                const borderColors = { warning: "border-l-amber-500", good: "border-l-green-600", info: "border-l-blue-500" };
                const bgIcons = { warning: "bg-orange-50 dark:bg-orange-900/20", good: "bg-green-50 dark:bg-green-900/20", info: "bg-blue-50 dark:bg-blue-900/20" };
                
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
                {soilAnalysisResult.tips.map((tip, i) => {
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
