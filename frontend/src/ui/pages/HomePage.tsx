import { useState, useEffect } from 'react';

// Interfaces for fetched data
interface SensorData {
  temperature: number;
  humidity: number;
  soil_moisture: number;
}

interface IrrigationSuggestion {
  status: string;
  message: string;
}

interface CropRecommendation {
  crop: string;
}

export default function HomePage() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [irrigation, setIrrigation] = useState<IrrigationSuggestion | null>(null);
  const [recommendedCrop, setRecommendedCrop] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch all data
    const fetchData = async () => {
      try {
        const [sensorRes, cropRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/v1/sensor-data'),
          fetch('http://127.0.0.1:8000/api/v1/recommend-crop?temperature=25&humidity=80&ph=6.5&rainfall=100')
        ]);
        
        const data: SensorData = await sensorRes.json();
        const cropJson: CropRecommendation = await cropRes.json();
        
        setSensorData({
          temperature: data.temperature,
          humidity: data.humidity,
          soil_moisture: data.soil_moisture
        });

        setRecommendedCrop(cropJson.crop);
        
        const irrigationRes = await fetch(`http://127.0.0.1:8000/api/v1/irrigation-suggestion?soil_moisture=${data.soil_moisture}`);
        const irrigationJson: IrrigationSuggestion = await irrigationRes.json();
        setIrrigation(irrigationJson);
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ paddingBottom: "40px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* 1. HERO SECTION */}
      <section style={{
        background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
        borderRadius: "16px",
        padding: "60px 30px",
        color: "white",
        textAlign: "center",
        marginBottom: "40px",
        boxShadow: "0 10px 25px rgba(21, 128, 61, 0.2)"
      }}>
        <h1 style={{ margin: "0 0 15px 0", fontSize: "36px", fontWeight: "800", letterSpacing: "-0.5px" }}>
          Welcome to KisanCore AI
        </h1>
        <p style={{ margin: "0 0 35px 0", fontSize: "20px", opacity: 0.9, fontWeight: "400" }}>
          Smart Farming powered by AI and IoT
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "15px", flexWrap: "wrap" }}>
          <button style={{
            backgroundColor: "white",
            color: "#15803d",
            border: "none",
            borderRadius: "8px",
            padding: "14px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            transition: "transform 0.2s"
          }}>
            Get Crop Recommendation
          </button>
          <button style={{
            backgroundColor: "transparent",
            color: "white",
            border: "2px solid white",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "transform 0.2s"
          }}>
            Scan Disease
          </button>
        </div>
      </section>

      {/* 2. STATS ROW */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "24px", color: "#333", marginBottom: "20px", paddingLeft: "5px" }}>Live Farm Data</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px"
        }}>
          {/* Card: Temp */}
          <div style={cardStyle}>
            <div style={iconContainerStyle("#fff3e0")}>
              <span style={{ fontSize: "24px" }}>🌡️</span>
            </div>
            <div style={{ marginTop: "15px" }}>
              <h3 style={statValueStyle}>{isLoading ? "—" : sensorData?.temperature !== undefined ? `${sensorData.temperature}°C` : "N/A"}</h3>
              <p style={statLabelStyle}>Temperature</p>
            </div>
          </div>
          
          {/* Card: Humidity */}
          <div style={cardStyle}>
            <div style={iconContainerStyle("#e1f5fe")}>
              <span style={{ fontSize: "24px" }}>💧</span>
            </div>
            <div style={{ marginTop: "15px" }}>
              <h3 style={statValueStyle}>{isLoading ? "—" : sensorData?.humidity !== undefined ? `${sensorData.humidity}%` : "N/A"}</h3>
              <p style={statLabelStyle}>Humidity</p>
            </div>
          </div>
          
          {/* Card: Soil Moisture */}
          <div style={cardStyle}>
            <div style={iconContainerStyle("#efebe9")}>
              <span style={{ fontSize: "24px" }}>🌱</span>
            </div>
            <div style={{ marginTop: "15px" }}>
              <h3 style={statValueStyle}>{isLoading ? "—" : sensorData?.soil_moisture !== undefined ? `${sensorData.soil_moisture}%` : "N/A"}</h3>
              <p style={statLabelStyle}>Soil Moisture</p>
            </div>
          </div>

          {/* Card: Irrigation */}
          <div style={cardStyle}>
            <div style={iconContainerStyle("#e8f5e9")}>
              <span style={{ fontSize: "24px" }}>🚰</span>
            </div>
            <div style={{ marginTop: "15px" }}>
              <h3 style={{...statValueStyle, fontSize: "22px", color: irrigation?.status === "ON" ? "red" : irrigation?.status === "MODERATE" ? "orange" : "green" }}>
                {isLoading ? "—" : irrigation?.status || "N/A"}
              </h3>
              <p style={statLabelStyle}>{isLoading ? "Loading..." : irrigation?.message}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. RECOMMENDED CROPS & 4. QUICK TIPS in a grid for larger screens */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
        
        {/* 3. RECOMMENDED CROPS */}
        <section>
          <h2 style={{ fontSize: "24px", color: "#333", marginBottom: "20px", paddingLeft: "5px" }}>AI Recommendation</h2>
          <div style={{
            ...cardStyle,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            minHeight: "220px",
            background: "linear-gradient(to bottom right, #ffffff, #f0fdf4)"
          }}>
            <span style={{ fontSize: "48px", marginBottom: "15px" }}>🌾</span>
            <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "16px" }}>Top Suggested Crop</p>
            <h3 style={{ margin: "0 0 15px 0", fontSize: "32px", color: "#15803d", textTransform: "capitalize" }}>
              {isLoading ? "Analyzing..." : recommendedCrop || "Data Unavailable"}
            </h3>
            <span style={{
              backgroundColor: "#dcfce7",
              color: "#166534",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(22, 101, 52, 0.1)"
            }}>
              ✓ High Suitability
            </span>
          </div>
        </section>

        {/* 4. QUICK TIPS */}
        <section>
          <h2 style={{ fontSize: "24px", color: "#333", marginBottom: "20px", paddingLeft: "5px" }}>Quick Tips</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            
            <div style={{...cardStyle, padding: "20px", display: "flex", alignItems: "center", gap: "15px"}}>
              <div style={iconContainerStyle("#fff8e1")}>
                <span style={{ fontSize: "20px" }}>⏱️</span>
              </div>
              <p style={{ margin: 0, color: "#4b5563", fontSize: "16px", lineHeight: 1.4 }}>
                Monitor soil moisture daily for best yield
              </p>
            </div>
            
            <div style={{...cardStyle, padding: "20px", display: "flex", alignItems: "center", gap: "15px"}}>
              <div style={iconContainerStyle("#e3f2fd")}>
                <span style={{ fontSize: "20px" }}>🌦️</span>
              </div>
              <p style={{ margin: 0, color: "#4b5563", fontSize: "16px", lineHeight: 1.4 }}>
                Check weather before applying pesticides
              </p>
            </div>
            
            <div style={{...cardStyle, padding: "20px", display: "flex", alignItems: "center", gap: "15px"}}>
              <div style={iconContainerStyle("#f1f8e9")}>
                <span style={{ fontSize: "20px" }}>🔄</span>
              </div>
              <p style={{ margin: 0, color: "#4b5563", fontSize: "16px", lineHeight: 1.4 }}>
                Rotate crops every season for soil health
              </p>
            </div>
            
          </div>
        </section>
      </div>

    </div>
  );
}

// Reusable inline styles
const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  border: "1px solid #f3f4f6"
};

const iconContainerStyle = (bgColor: string): React.CSSProperties => ({
  backgroundColor: bgColor,
  width: "50px",
  height: "50px",
  borderRadius: "12px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
});

const statValueStyle: React.CSSProperties = {
  margin: "0 0 5px 0",
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1f2937"
};

const statLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#6b7280",
  fontWeight: "500"
};
