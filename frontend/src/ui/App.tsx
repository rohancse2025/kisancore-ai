import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState<any>(null);
  const [crop, setCrop] = useState("");
  const [irrigationSuggestion, setIrrigationSuggestion] = useState<{ status: string, message: string } | null>(null);

  const getCrop = async () => {
    if (!data) return;
    const res = await fetch(`http://127.0.0.1:8000/recommend-crop?temperature=${data.temperature}&humidity=${data.humidity}&ph=6.5&rainfall=100.0`);
    const result = await res.json();
    setCrop(result.crop);
  };

  useEffect(() => {
    fetch("http://127.0.0.1:8000/sensor-data")
      .then(res => res.json())
      .then(data => {
        setData(data);

        fetch(`http://127.0.0.1:8000/recommend-crop?temperature=${data.temperature}&humidity=${data.humidity}&ph=6.5&rainfall=100.0`)
          .then(res => res.json())
          .then(result => setCrop(result.crop));

        fetch(`http://127.0.0.1:8000/irrigation-suggestion?soil_moisture=${data.soil_moisture}`)
          .then(res => res.json())
          .then(result => setIrrigationSuggestion({ status: result.status, message: result.message }));
      });
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Kisancore-AI ✅</h1>

      {!data ? (
        <p>Loading sensor data...</p>
      ) : (
        <>
          <h2>🌡 Temperature: {data.temperature}°C</h2>
          <h2>💧 Humidity: {data.humidity}%</h2>
          <h2>🌱 Soil Moisture: {data.soil_moisture}%</h2>
          {irrigationSuggestion && (
            <div style={{
              margin: '20px auto',
              padding: '15px',
              borderRadius: '8px',
              backgroundColor: irrigationSuggestion.status === 'ON' ? '#ffebee' :
                irrigationSuggestion.status === 'MODERATE' ? '#fff3e0' : '#e8f5e9',
              border: `2px solid ${irrigationSuggestion.status === 'ON' ? '#f44336' :
                irrigationSuggestion.status === 'MODERATE' ? '#ff9800' : '#4caf50'}`,
              display: 'inline-block',
              minWidth: '300px'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>
                🚰 Irrigation: <span style={{ color: irrigationSuggestion.status === 'ON' ? '#d32f2f' : irrigationSuggestion.status === 'MODERATE' ? '#e65100' : '#2e7d32' }}>{irrigationSuggestion.status}</span>
              </h2>
              <p style={{ fontSize: '18px', margin: '10px 0 0', color: '#555', fontWeight: 'bold' }}>
                {irrigationSuggestion.message}
              </p>
            </div>
          )}
          <h2>🌾 Recommended Crop: {crop}</h2>
          <button onClick={getCrop} style={{ padding: "10px 20px", fontSize: "16px", marginTop: "20px" }}>
            Get Crop Recommendation
          </button>        </>
      )}
    </div>
  );
}

export default App;