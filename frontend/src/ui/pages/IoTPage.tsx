import { useState, useEffect } from 'react';

interface SensorData {
  temperature: number | null;
  humidity: number | null;
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

  // Poll for data every 5 seconds
  useEffect(() => {
    fetchData();
    const pollInterval = setInterval(fetchData, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // Update "seconds ago" counter
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdateDate) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdateDate) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdateDate]);

  const isConnected = lastUpdateDate && secondsSinceUpdate < 30 && !error;

  if (isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        height: "60vh",
        color: "#16a34a"
      }}>
        <div style={{ 
          width: "40px", 
          height: "40px", 
          border: "4px solid #f3f3f3", 
          borderTop: "4px solid #16a34a", 
          borderRadius: "50%", 
          animation: "spin 1s linear infinite",
          marginBottom: "15px"
        }} />
        <p style={{ fontWeight: "600" }}>Connecting to ESP32...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "60px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.5; shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
            50% { transform: scale(1.05); opacity: 1; shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
            100% { transform: scale(0.95); opacity: 0.5; shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
          }
          .pulse-dot {
            animation: pulse 2s infinite ease-in-out;
          }
        `}
      </style>

      {/* Hero Header */}
      <section style={{
        background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
        borderRadius: "16px",
        padding: isMobile ? "30px 20px" : "40px",
        color: "white",
        marginBottom: "20px",
        boxShadow: "0 10px 25px rgba(21, 128, 61, 0.2)",
        textAlign: isMobile ? "center" : "left"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "center" : "flex-start", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "20px" : "0" }}>
          <div>
            <h1 style={{ margin: "0 0 10px 0", fontSize: isMobile ? "24px" : "32px", fontWeight: "800" }}>📡 IoT Smart Farm</h1>
            <p style={{ margin: 0, fontSize: isMobile ? "16px" : "18px", opacity: 0.9 }}>
              Live ESP32 sensor values
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(255,255,255,0.2)",
            padding: "8px 14px",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "bold",
            backdropFilter: "blur(4px)"
          }}>
            {isConnected && <span className="pulse-dot" style={{ 
              width: "10px", 
              height: "10px", 
              backgroundColor: "#4ade80", 
              borderRadius: "50%",
              boxShadow: "0 0 8px #4ade80"
            }} />}
            {isConnected ? "LIVE" : "OFFLINE"}
          </div>
        </div>
      </section>

      {/* Connection Status Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "12px" : "0",
        padding: "16px 20px",
        backgroundColor: "white",
        borderRadius: "12px",
        marginBottom: "30px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: isConnected ? "#f0fdf4" : "#fef2f2",
            color: isConnected ? "#16a34a" : "#ef4444",
            border: `1px solid ${isConnected ? "#bbf7d0" : "#fecaca"}`
          }}>
            <div style={{ 
              width: "8px", 
              height: "8px", 
              borderRadius: "50%", 
              backgroundColor: isConnected ? "#16a34a" : "#ef4444" 
            }} />
            {isConnected ? "ESP32 Connected" : "ESP32 Disconnected"}
          </div>
          {error && <span style={{ color: "#ef4444", fontSize: "14px", fontWeight: "600" }}>⚠️ {error}</span>}
          {isRefreshing && !error && <span style={{ fontSize: "13px", color: "#16a34a", opacity: 0.7 }}>Polling...</span>}
        </div>
        <div style={{ fontSize: "14px", color: "#6b7280" }}>
          {lastUpdateDate ? (
            <>Last updated: <strong>{sensorData?.timestamp}</strong> ({secondsSinceUpdate}s ago)</>
          ) : (
            "Waiting for initial data..."
          )}
        </div>
      </div>

      {/* Sensor Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
        gap: "25px",
        marginBottom: "30px"
      }}>
        {/* TEMPERATURE CARD */}
        <div style={{ ...cardStyle, borderLeft: "6px solid #16a34a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
            <span style={{ fontSize: "32px" }}>🌡️</span>
            <span style={{ color: "#6b7280", fontWeight: "600", fontSize: "18px" }}>Temperature</span>
          </div>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "48px", fontWeight: "900", color: "#111827" }}>
            {sensorData?.temperature !== null ? `${sensorData?.temperature}°C` : "—"}
          </h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>Optimal: 15-35°C</span>
            {sensorData?.temperature !== null && (
              <span style={{ 
                fontSize: "12px", 
                padding: "4px 8px", 
                borderRadius: "12px",
                backgroundColor: sensorData.temperature > 15 && sensorData.temperature < 35 ? "#f0fdf4" : "#fef2f2",
                color: sensorData.temperature > 15 && sensorData.temperature < 35 ? "#16a34a" : "#ef4444",
                fontWeight: "bold"
              }}>
                {sensorData.temperature > 15 && sensorData.temperature < 35 ? "Normal" : "Alert"}
              </span>
            )}
          </div>
        </div>

        {/* HUMIDITY CARD */}
        <div style={{ ...cardStyle, borderLeft: "6px solid #16a34a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
            <span style={{ fontSize: "32px" }}>💧</span>
            <span style={{ color: "#6b7280", fontWeight: "600", fontSize: "18px" }}>Humidity</span>
          </div>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "48px", fontWeight: "900", color: "#111827" }}>
            {sensorData?.humidity !== null ? `${sensorData?.humidity}%` : "—"}
          </h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>Optimal: 30-70%</span>
            {sensorData?.humidity !== null && (
              <span style={{ 
                fontSize: "12px", 
                padding: "4px 8px", 
                borderRadius: "12px",
                backgroundColor: sensorData.humidity > 30 && sensorData.humidity < 70 ? "#f0fdf4" : "#fef2f2",
                color: sensorData.humidity > 30 && sensorData.humidity < 70 ? "#16a34a" : "#ef4444",
                fontWeight: "bold"
              }}>
                {sensorData.humidity > 30 && sensorData.humidity < 70 ? "Normal" : "Alert"}
              </span>
            )}
          </div>
        </div>
      </div>

      <footer style={{ textAlign: "center", marginTop: "40px" }}>
        <p style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "14px" }}>
          Auto-polling active every 5 seconds • KisanCore AI Smart Gateway
        </p>
      </footer>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "30px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  border: "1px solid #f3f4f6",
  display: "flex",
  flexDirection: "column"
};
