import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type WeatherData = {
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  city: string;
  farming_tip: string;
};

function getWeatherEmoji(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny')) return '☀️';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧️';
  if (c.includes('storm') || c.includes('thunder')) return '⛈️';
  if (c.includes('snow') || c.includes('sleet')) return '❄️';
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return '🌫️';
  if (c.includes('wind')) return '💨';
  return '🌤️';
}

function getTipEmoji(tip: string): string {
  const t = tip.toLowerCase();
  if (t.includes('rain') || t.includes('drainage')) return '🌧️';
  if (t.includes('wind') || t.includes('storm')) return '💨';
  if (t.includes('fungal') || t.includes('humidity')) return '🍄';
  if (t.includes('high temp') || t.includes('irrigation')) return '🌡️';
  if (t.includes('frost') || t.includes('low temp')) return '🥶';
  return '🌿';
}

export default function WeatherPage() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location access. Please allow location to see weather.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/v1/weather?lat=${latitude}&lon=${longitude}`);
          if (!res.ok) throw new Error("Weather fetch failed");
          const data: WeatherData = await res.json();
          setWeather(data);
        } catch (e) {
          setError("Could not fetch weather data. Please check that the backend is running and OPENWEATHER_API_KEY is set.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Location access denied. Please allow location in your browser to see weather.");
        setLoading(false);
      }
    );
  }, []);

  const handleAskAI = () => {
    if (!weather) return;
    const msg = `It is currently ${weather.temperature}°C with ${weather.condition} and ${weather.humidity}% humidity in ${weather.city}. What farming advice do you have for today?`;
    navigate('/chat', { state: { prefill: msg } });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="text-5xl animate-spin text-green-600">🌿</div>
      <p className="text-gray-500 text-base italic">Detecting your location and fetching weather...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="bg-white rounded-2xl p-10 text-center max-w-[480px] shadow-xl shadow-gray-200/50 border border-gray-200">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-gray-900 mb-3 text-2xl font-bold">Weather Unavailable</h2>
        <p className="text-gray-500 leading-relaxed">{error}</p>
      </div>
    </div>
  );

  if (!weather) return null;

  const emoji = getWeatherEmoji(weather.condition);
  const tipEmoji = getTipEmoji(weather.farming_tip);

  return (
    <div className="max-w-[900px] mx-auto flex flex-col gap-6 font-sans">

      {/* Header */}
      <div>
        <h1 className="m-0 mb-1 text-2xl text-gray-900 font-bold">🌦️ Weather & Farm Advisor</h1>
        <p className="m-0 text-gray-500 text-sm">Live local weather with farming insights</p>
      </div>

      {/* Main Weather Card */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-2xl p-9 md:p-10 text-white flex flex-col md:flex-row justify-between items-center shadow-lg shadow-green-600/30">
        <div className="text-center md:text-left mb-8 md:mb-0">
          <p className="m-0 mb-1.5 text-base opacity-85 font-semibold">📍 {weather.city}</p>
          <div className="flex items-baseline justify-center md:justify-start gap-3">
            <span className="text-[72px] font-bold leading-none">{Math.round(weather.temperature)}°</span>
            <span className="text-2xl mb-2.5 opacity-90">C</span>
          </div>
          <p className="m-0 mt-2 text-xl opacity-95 font-semibold capitalize">
            {emoji} {weather.condition}
          </p>
        </div>
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="bg-white/15 rounded-xl p-4 md:px-6 backdrop-blur-md shadow-inner border border-white/10">
            <p className="m-0 mb-1 text-xs opacity-75 uppercase tracking-widest font-bold">Humidity</p>
            <p className="m-0 text-2xl font-black">💧 {weather.humidity}%</p>
          </div>
          <div className="bg-white/15 rounded-xl p-4 md:px-6 backdrop-blur-md shadow-inner border border-white/10">
            <p className="m-0 mb-1 text-xs opacity-75 uppercase tracking-widest font-bold">Wind Speed</p>
            <p className="m-0 text-2xl font-black">💨 {weather.wind_speed} m/s</p>
          </div>
        </div>
      </div>

      {/* Farming Tip Card */}
      <div className="bg-white rounded-2xl p-7 px-8 border border-gray-200 shadow-sm border-l-[6px] border-l-green-600 md:animate-fade-in">
        <div className="flex items-start gap-4">
          <span className="text-4xl leading-none flex-shrink-0">{tipEmoji}</span>
          <div>
            <h3 className="m-0 mb-2 text-xs text-green-600 font-black uppercase tracking-widest">
              Today's Farming Tip
            </h3>
            <p className="m-0 text-lg text-gray-800 leading-relaxed font-medium">{weather.farming_tip}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Temperature", value: `${Math.round(weather.temperature)}°C`, icon: "🌡️", sub: weather.temperature > 30 ? "Hot" : weather.temperature < 15 ? "Cool" : "Comfortable" },
          { label: "Humidity", value: `${weather.humidity}%`, icon: "💧", sub: weather.humidity > 80 ? "High — fungal risk" : weather.humidity < 40 ? "Low — dry stress" : "Moderate" },
          { label: "Wind Speed", value: `${weather.wind_speed} m/s`, icon: "💨", sub: weather.wind_speed > 10 ? "Strong winds" : weather.wind_speed > 5 ? "Breezy" : "Calm" }
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all hover:bg-gray-50/50">
            <p className="m-0 mb-2 text-[11px] text-gray-400 uppercase font-black">{icon} {label}</p>
            <p className="m-0 mb-1 text-2xl font-black text-gray-900">{value}</p>
            <p className="m-0 text-xs text-green-600 font-bold italic">{sub}</p>
          </div>
        ))}
      </div>

      {/* Ask AI Button */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          onClick={handleAskAI}
          className="flex items-center gap-2.5 bg-green-600 text-white border-none rounded-xl py-4 px-10 text-base font-bold cursor-pointer shadow-lg shadow-green-600/30 transition-all hover:-translate-y-0.5 hover:shadow-green-600/40 active:scale-95"
        >
          🤖 Ask AI about this weather
        </button>
      </div>
    </div>
  );
}
