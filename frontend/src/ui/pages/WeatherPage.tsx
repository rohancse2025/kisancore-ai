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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "48px", animation: "spin 2s linear infinite" }}>🌿</div>
      <p style={{ color: "#6b7280", fontSize: "16px" }}>Detecting your location and fetching weather...</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "40px", textAlign: "center", maxWidth: "480px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ color: "#1f2937", marginBottom: "12px" }}>Weather Unavailable</h2>
        <p style={{ color: "#6b7280", lineHeight: "1.6" }}>{error}</p>
      </div>
    </div>
  );

  if (!weather) return null;

  const emoji = getWeatherEmoji(weather.condition);
  const tipEmoji = getTipEmoji(weather.farming_tip);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Header */}
      <div>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", color: "#111827", fontWeight: "700" }}>🌦️ Weather & Farm Advisor</h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>Live local weather with farming insights</p>
      </div>

      {/* Main Weather Card */}
      <div style={{
        background: "linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)",
        borderRadius: "20px",
        padding: "36px 40px",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 8px 32px rgba(22, 163, 74, 0.3)"
      }}>
        <div>
          <p style={{ margin: "0 0 6px 0", fontSize: "16px", opacity: 0.85, fontWeight: "500" }}>📍 {weather.city}</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
            <span style={{ fontSize: "72px", fontWeight: "700", lineHeight: 1 }}>{Math.round(weather.temperature)}°</span>
            <span style={{ fontSize: "22px", marginBottom: "10px", opacity: 0.9 }}>C</span>
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: "20px", opacity: 0.95, fontWeight: "500", textTransform: "capitalize" }}>
            {emoji} {weather.condition}
          </p>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "16px 24px", backdropFilter: "blur(4px)" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px", opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.05em" }}>Humidity</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>💧 {weather.humidity}%</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "16px 24px", backdropFilter: "blur(4px)" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px", opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.05em" }}>Wind Speed</p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>💨 {weather.wind_speed} m/s</p>
          </div>
        </div>
      </div>

      {/* Farming Tip Card */}
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "28px 32px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        borderLeft: "5px solid #16a34a"
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
          <span style={{ fontSize: "36px", lineHeight: 1 }}>{tipEmoji}</span>
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#16a34a", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Today's Farming Tip
            </h3>
            <p style={{ margin: 0, fontSize: "17px", color: "#1f2937", lineHeight: "1.6" }}>{weather.farming_tip}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {[
          { label: "Temperature", value: `${Math.round(weather.temperature)}°C`, icon: "🌡️", sub: weather.temperature > 30 ? "Hot" : weather.temperature < 15 ? "Cool" : "Comfortable" },
          { label: "Humidity", value: `${weather.humidity}%`, icon: "💧", sub: weather.humidity > 80 ? "High — risk of fungal issues" : weather.humidity < 40 ? "Low — monitor soil moisture" : "Moderate" },
          { label: "Wind Speed", value: `${weather.wind_speed} m/s`, icon: "💨", sub: weather.wind_speed > 10 ? "Strong — delay spraying" : weather.wind_speed > 5 ? "Breezy" : "Calm" }
        ].map(({ label, value, icon, sub }) => (
          <div key={label} style={{
            background: "white",
            borderRadius: "14px",
            padding: "20px 24px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
          }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600" }}>{icon} {label}</p>
            <p style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "700", color: "#111827" }}>{value}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#16a34a", fontWeight: "500" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Ask AI Button */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: "8px" }}>
        <button
          onClick={handleAskAI}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            background: "#16a34a", color: "white",
            border: "none", borderRadius: "12px",
            padding: "16px 32px", fontSize: "16px",
            fontWeight: "600", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(22, 163, 74, 0.35)",
            transition: "all 0.2s",
            fontFamily: "inherit"
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(22, 163, 74, 0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(22, 163, 74, 0.35)"; }}
        >
          🤖 Ask AI about this weather
        </button>
      </div>
    </div>
  );
}
