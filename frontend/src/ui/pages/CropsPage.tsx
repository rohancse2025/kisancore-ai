import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Helper for farmer-friendly hints
const getSliderHint = (name: string, value: number) => {
  if (name === "N") {
    if (value < 20) return "⚠️ Too low — apply urea or compost";
    if (value > 120) return "⚠️ Too high — reduce chemical fertilizer";
  } else if (name === "P") {
    if (value < 15) return "⚠️ Too low — add DAP fertilizer";
    if (value > 100) return "⚠️ Too high — skip phosphorus fertilizer";
  } else if (name === "K") {
    if (value < 20) return "⚠️ Too low — apply potash fertilizer";
    if (value > 150) return "⚠️ Too high — reduce potash use";
  } else if (name === "temperature") {
    if (value < 10) return "⚠️ Too cold — consider greenhouse farming";
    if (value > 40) return "⚠️ Too hot — use shade nets and extra irrigation";
  } else if (name === "humidity") {
    if (value < 30) return "⚠️ Too dry — increase irrigation frequency";
    if (value > 90) return "⚠️ Very humid — watch out for fungal diseases";
  } else if (name === "ph") {
    if (value < 5.5) return "⚠️ Too acidic — add lime to soil";
    if (value > 8) return "⚠️ Too alkaline — add sulfur or organic matter";
  } else if (name === "rainfall") {
    if (value < 30) return "⚠️ Very dry area — choose drought resistant crops";
    if (value > 250) return "⚠️ Very wet area — ensure proper drainage";
  }
  return null;
};

export default function CropsPage() {
  const [activeTab, setActiveTab] = useState<'crop' | 'fertilizer'>('crop');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/sensor-data");
        if (res.ok) {
          const data = await res.json();
          setInputs(prev => ({
            ...prev,
            temperature: data.temperature ?? prev.temperature,
            humidity: data.humidity ?? prev.humidity
          }));
        }
      } catch (err) {
        console.error("Failed to fetch sensor data:", err);
      }
    };
    fetchSensorData();
  }, []);

  // --- CROP RECOMMENDATION STATE ---
  const [inputs, setInputs] = useState({
    N: 65, P: 40, K: 40,
    temperature: 25, humidity: 80,
    ph: 6.5, rainfall: 100
  });

  type AICrop = {
    name: string; emoji: string; reason: string;
    water_needed: string; best_season: string; profit_potential: string;
  };
  const [aiCrops, setAiCrops] = useState<AICrop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const getMLRecommendation = async () => {
    setIsLoading(true);
    setAiCrops([]);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/crops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nitrogen: inputs.N, phosphorus: inputs.P, potassium: inputs.K,
          temperature: inputs.temperature, humidity: inputs.humidity,
          ph: inputs.ph, rainfall: inputs.rainfall
        }),
        signal: controller.signal
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }
      const data = await res.json();
      setAiCrops(data.crops || []);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Recommendation timed out. Please check your backend connection.");
      } else {
        setError(err.message || "Failed to get AI recommendations. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const sliders = [
    { name: "N", label: "Nitrogen (N)", min: 0, max: 140, step: 1, hint: "Soil Health Card N value" },
    { name: "P", label: "Phosphorus (P)", min: 0, max: 140, step: 1, hint: "Soil Health Card P value" },
    { name: "K", label: "Potassium (K)", min: 0, max: 200, step: 1, hint: "Soil Health Card K value" },
    { name: "temperature", label: "Temperature (°C)", min: 0, max: 50, step: 0.1, hint: "Auto-filled from ESP32" },
    { name: "humidity", label: "Humidity (%)", min: 0, max: 100, step: 1, hint: "Auto-filled from ESP32" },
    { name: "ph", label: "Soil pH", min: 0, max: 14, step: 0.1, hint: "Optimal range: 6.0-7.5" },
    { name: "rainfall", label: "Rainfall (mm)", min: 0, max: 300, step: 1, hint: "Avg annual rainfall" },
  ];

  // --- FERTILIZER RECOMMENDATION STATE ---
  const [fertInputs, setFertInputs] = useState({
    crop: 'Rice', soil: 'Loamy',
    N: 60, P: 40, K: 40
  });
  
  const [fertResult, setFertResult] = useState<string | null>(null);
  const [fertLoading, setFertLoading] = useState(false);

  const handleFertChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFertInputs(prev => ({ ...prev, [name]: value }));
  };

  const getFertilizerRecommendation = async () => {
    if (fertLoading) return;
    setFertLoading(true);
    setFertResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const prompt = `I am growing ${fertInputs.crop} on ${fertInputs.soil} soil. My soil has Nitrogen: ${fertInputs.N} PPM, Phosphorus: ${fertInputs.P} PPM, Potassium: ${fertInputs.K} PPM. Give me exact fertilizer recommendations — which fertilizers to apply, how much per acre, and when to apply. Provide 3 short, professional sentences. Reply in English only.`;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
        signal: controller.signal
      });
      if (res.status === 429) {
        setFertResult("AI Limit Reached. Our models are busy—please try again in 5 minutes.");
        return;
      }
      
      const data = await res.json();
      setFertResult(data.reply);
    } catch (err: any) {
      console.error("Fertilizer Advisor Error:", err);
      if (err.name === 'AbortError') {
        setFertResult("Request timed out. Please ensure the backend is running and try again.");
      } else if (err.message.includes("429")) {
        setFertResult("AI Limit Reached. Please try again in 5 minutes.");
      } else {
        setFertResult("Sorry, I couldn't get a recommendation right now. Please check your connection.");
      }
    } finally {
      clearTimeout(timeoutId);
      setFertLoading(false);
    }
  };

  return (
    <div className="font-sans pb-4">
      
      {/* TABS HEADER */}
      <div className="flex border-b-2 border-gray-200 mb-8 gap-2 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab('crop')}
          className={`px-6 py-4 text-base md:text-lg font-black transition-all border-t border-x rounded-t-xl relative -bottom-[2px] cursor-pointer whitespace-nowrap
            ${activeTab === 'crop' ? 'bg-green-50 border-green-600 text-green-600' : 'bg-transparent border-transparent text-gray-400 hover:text-green-600'}`}
        >
          🌾 ML Recommendation
        </button>
        <button 
          onClick={() => setActiveTab('fertilizer')}
          className={`px-6 py-4 text-base md:text-lg font-black transition-all border-t border-x rounded-t-xl relative -bottom-[2px] cursor-pointer whitespace-nowrap
            ${activeTab === 'fertilizer' ? 'bg-green-50 border-green-600 text-green-600' : 'bg-transparent border-transparent text-gray-400 hover:text-green-600'}`}
        >
          🧪 Fertilizer Advisor
        </button>
      </div>

      {activeTab === 'crop' && (
        <div className="animate-fade-in">
          {/* HERO HEADER */}
          <section className={`bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-8 md:p-10 text-white mb-8 shadow-lg shadow-green-700/20 ${isMobile ? 'text-center' : 'text-left'}`}>
            <h1 className="m-0 mb-2.5 text-2xl md:text-3xl font-extrabold tracking-tight">🌾 AI Crop Recommendation</h1>
            <p className="m-0 text-base md:text-lg opacity-90 font-medium">Smart analysis based on soil nutrients and live climate data</p>
          </section>

          <div className="flex flex-col gap-8 mb-10">
            {/* Input Form Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 border-t-4 border-t-green-600">
              <h2 className="m-0 mb-6 text-xl text-gray-900 font-black flex items-center gap-2">
                📂 Farm Parameters
              </h2>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 text-sm text-blue-800 mb-8 leading-relaxed font-medium">
                ℹ️ <strong>Soil Nutrients:</strong> Use values from your Soil Health Card (Krishi Kendra) for the most accurate AI recommendation.
              </div>
              
              <div className={`grid gap-6 md:gap-x-10 mb-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {sliders.map(slider => {
                  const currentValue = inputs[slider.name as keyof typeof inputs];
                  return (
                    <div key={slider.name}>
                      <div className="flex justify-between mb-2 items-start">
                        <div>
                          <label className="font-bold text-gray-700 text-sm flex items-center">
                            {slider.label}
                            {(slider.name === "temperature" || slider.name === "humidity") && (
                              <span className="ml-2 text-green-600 text-[10px] font-black uppercase flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                <span className="text-[8px] animate-pulse">🔴</span> Live
                              </span>
                            )}
                          </label>
                          <p className="text-[11px] text-gray-400 italic mt-0.5 font-medium">{slider.hint}</p>
                        </div>
                        <span className="font-black text-green-700 text-xl">{currentValue}</span>
                      </div>
                      
                      <input
                        type="range" name={slider.name} min={slider.min} max={slider.max} step={slider.step}
                        value={currentValue} onChange={handleSliderChange}
                        className="w-full accent-green-600 cursor-pointer h-1.5 rounded-full mb-1"
                      />
                      
                      <div className="flex justify-between text-[10px] text-gray-300 font-black uppercase tracking-tighter">
                        <span>Min {slider.min}</span>
                        <span>Max {slider.max}</span>
                      </div>
                      
                      {getSliderHint(slider.name, currentValue) && (
                        <p className="text-[11px] text-amber-600 mt-2 font-bold italic">{getSliderHint(slider.name, currentValue)}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={getMLRecommendation} disabled={isLoading}
                className={`w-full py-4.5 rounded-xl text-lg font-black transition-all tracking-tight active:scale-[0.98] mt-2
                  ${isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 text-white cursor-pointer hover:bg-green-700 shadow-lg shadow-green-600/30'}`}
              >
                {isLoading ? "🔍 Analyzing Data..." : "✨ Get AI Recommendation"}
              </button>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 text-center font-bold animate-shake">
                ⚠️ {error}
              </div>
            )}

            {/* RESULTS SECTION */}
            {(isLoading || aiCrops.length > 0) && (
              <div className="animate-fade-in">
                <h2 className="text-xl text-gray-900 mb-6 text-center font-black tracking-tight">
                  🤖 Top 3 AI Crop Recommendations
                </h2>
                
                {isLoading ? (
                  <div className="flex justify-center p-12">
                    <div className="w-12 h-12 border-5 border-gray-100 border-t-green-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {aiCrops.slice(0, 3).map((crop, idx) => {
                      const colors = [
                        { b: "border-t-green-600", s: "shadow-green-600/10", t: "text-green-700" },
                        { b: "border-t-blue-500", s: "shadow-blue-600/10", t: "text-blue-700" },
                        { b: "border-t-amber-500", s: "shadow-amber-600/10", t: "text-amber-700" }
                      ];
                      const c = colors[idx] || colors[0];
                      const profit = {
                        Low: "bg-red-50 text-red-700",
                        Medium: "bg-orange-50 text-orange-700",
                        High: "bg-green-50 text-green-700"
                      }[crop.profit_potential as 'Low'|'Medium'|'High'] || "bg-gray-50 text-gray-700";

                      return (
                        <div key={idx} className={`bg-white rounded-2xl p-8 border border-gray-100 border-t-6 ${c.b} flex flex-col gap-4 text-center transition-all hover:-translate-y-1 hover:shadow-xl ${c.s}`}>
                          <div className="text-5xl mt-2">{crop.emoji}</div>
                          <h3 className={`text-2xl font-black ${c.t} tracking-tight m-0`}>{crop.name}</h3>
                          <p className="text-sm text-gray-500 italic m-0 leading-relaxed font-medium">{crop.reason}</p>
                          
                          <div className="flex flex-col gap-3 mt-4 text-left border-t border-gray-50 pt-5">
                            <div className="flex items-center gap-2.5 text-[15px] font-medium text-gray-700">
                              <span>💧</span> <span className="text-gray-400 font-bold">Water:</span> {crop.water_needed}
                            </div>
                            <div className="flex items-center gap-2.5 text-[15px] font-medium text-gray-700">
                              <span>📅</span> <span className="text-gray-400 font-bold">Season:</span> {crop.best_season}
                            </div>
                            <div className="flex items-center gap-2.5 text-[15px] font-medium text-gray-700">
                              <span>💰</span> <span className="text-gray-400 font-bold">Profit:</span> 
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${profit}`}>
                                {crop.profit_potential}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => navigate('/chat', { state: { prefill: `Tell me more about growing ${crop.name} — best practices and fertilizer tips.` } })}
                            className="mt-4 bg-green-50 text-green-600 border border-green-200 rounded-xl py-3 text-sm font-bold transition-colors hover:bg-green-100 cursor-pointer"
                          >
                            Ask AI Expert →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {!isLoading && aiCrops.length === 0 && !error && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl py-16 flex flex-col items-center justify-center text-center px-10">
                <span className="text-5xl opacity-20 mb-4 block">🌾</span>
                <p className="text-gray-500 font-bold text-lg max-w-md">
                  Complete your soil parameters above and get instant suggestions from our trained AI model.
                </p>
              </div>
            )}
          </div>

          <h2 className="text-center mb-8 text-xl font-black text-gray-900 uppercase tracking-widest">📋 Simple Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: 1, t: "Enter Soil Data", d: "N, P, K from your test card" },
              { n: 2, t: "Fetch Climate", d: "Temp & Humidity auto-filled" },
              { n: 3, t: "AI Predicts", d: "Top crops for your field" }
            ].map(step => (
              <div key={step.n} className="bg-white p-8 rounded-2xl flex flex-col items-center text-center border border-gray-100 shadow-sm hover:border-green-300 transition-colors">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-black mb-4">{step.n}</div>
                <h3 className="text-lg font-black text-gray-800 m-0 mb-1">{step.t}</h3>
                <p className="text-gray-400 text-sm font-medium m-0">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fertilizer' && (
        <div className="max-w-[700px] mx-auto flex flex-col gap-6 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col gap-6">
            <h2 className="m-0 text-xl text-gray-900 text-center font-black">
              🧪 Smart Fertilizer Advisor
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-500 text-sm">Target Crop</label>
                <select 
                  name="crop" value={fertInputs.crop} onChange={handleFertChange}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-bold outline-none focus-ring-green focus:bg-white transition-all"
                >
                  {['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Mango', 'Banana', 'Grapes', 'Apple', 'Chickpea'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-500 text-sm">Soil Texture</label>
                <select 
                  name="soil" value={fertInputs.soil} onChange={handleFertChange}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-bold outline-none focus-ring-green focus:bg-white transition-all"
                >
                  {['Sandy', 'Loamy', 'Clay', 'Black', 'Red'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { n: "N", l: "Nitrogen", m: 140 },
                { n: "P", l: "Phosphorus", m: 140 },
                { n: "K", l: "Potassium", m: 200 }
              ].map(item => (
                <div key={item.n} className="flex flex-col gap-2">
                  <label className="font-bold text-gray-500 text-sm">{item.l} (PPM)</label>
                  <input 
                    type="number" name={item.n} min="0" max={item.m} 
                    value={fertInputs[item.n as keyof typeof fertInputs]} 
                    onChange={handleFertChange}
                    className="p-3.5 rounded-xl border border-gray-200 font-bold outline-none focus-ring-green focus:bg-white transition-all text-center"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={getFertilizerRecommendation}
              disabled={fertLoading}
              className={`mt-4 py-4.5 rounded-xl text-lg font-black shadow-lg shadow-green-600/30 transition-all active:scale-95 cursor-pointer ripple flex items-center justify-center gap-3
                ${fertLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {fertLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing with AI...
                </>
              ) : "Get Recommendation"}
            </button>

            {fertResult && (
              <div className="mt-4 p-8 rounded-2xl border-2 border-green-600 bg-green-50 dark:bg-green-900/10 shadow-sm animate-fade-in hover-lift">
                <h3 className="m-0 mb-4 text-2xl font-black text-green-800 dark:text-green-400 flex items-center gap-2">
                  ✅ Fertilizer Recommendation
                </h3>
                
                <div className="m-0 mb-8 flex flex-col gap-5">
                  {fertResult.split(". ").filter(s => s.trim().length > 0).slice(0, 3).map((sentence, idx) => {
                    const words = sentence.trim().split(" ");
                    const head = words.slice(0, 2).join(" ");
                    const tail = words.slice(2).join(" ");
                    return (
                      <div key={idx} className="flex gap-3 items-start bg-green-100/30 p-4 rounded-xl border-l-4 border-green-600 animate-fade-in">
                        <span className="text-green-600 font-bold mt-1">●</span>
                        <p className="m-0 text-gray-700 dark:text-slate-300 text-lg font-medium leading-relaxed">
                          <span className="font-black text-gray-900 dark:text-white uppercase text-[15px]">{head}</span> {tail}{!sentence.endsWith(".") && "."}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="bg-amber-100/50 border-l-4 border-amber-500 p-4 rounded-lg flex gap-3 items-center">
                    <span className="text-xl">⚠️</span>
                    <p className="m-0 text-amber-800 text-[13px] font-bold leading-relaxed">
                      Consult your district agri-officer for regional soil variations before application.
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/chat', { state: { prefill: `I just got this fertilizer advice for my ${fertInputs.crop} crop: "${fertResult.substring(0, 50)}...". I have more questions about application techniques.` } })}
                    className="w-full bg-white text-green-600 border-2 border-green-600 rounded-xl py-3.5 text-base font-black hover:bg-green-50 transition-all ripple"
                  >
                    💬 Ask More Questions
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
