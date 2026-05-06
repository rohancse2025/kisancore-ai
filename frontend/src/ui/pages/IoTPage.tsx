import { useState, useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { useSensor } from "../../context/SensorContext";
import { useNavigate } from "react-router-dom";

const SkeletonCard = () => (
  <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm animate-pulse">
    <div className="w-12 h-12 bg-gray-200 rounded-2xl mb-4" />
    <div className="h-6 bg-gray-200 rounded-lg w-1/2 mb-2" />
    <div className="h-4 bg-gray-100 rounded-lg w-1/3" />
  </div>
);

const SensorCard = ({ title, value, unit, icon, status, range, color }: any) => (
  <div className="bg-white border border-gray-200 rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform bg-${color}-50 text-${color}-600`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest
          ${status === 'Optimal' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {status}
        </span>
      </div>
      <h3 className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-gray-900 tracking-tighter">{value}</span>
        <span className="text-lg font-bold text-gray-400">{unit}</span>
      </div>
      <div className="mt-6 flex gap-1 h-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`flex-1 rounded-full transition-all duration-700 ${i <= (value/20) ? `bg-${color}-500` : 'bg-gray-100'}`} />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-gray-400 font-bold italic">Optimal range: {range}</p>
    </div>
  </div>
);

export default function IoTPage({ lang }: { lang: string }) {
  const { t } = useTranslation(lang);
  const { sensorData, isLoading, refreshSensorData, pendingCommandsCount } = useSensor();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overrideDuration, setOverrideDuration] = useState(60);
  const [isSendingOverride, setIsSendingOverride] = useState(false);
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSensorData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleOverride = async (command: string) => {
    setIsSendingOverride(true);
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    try {
      if (command === 'AUTO') {
        await fetch(`${baseUrl}/api/v1/iot/override`, { method: 'DELETE' });
      } else {
        await fetch(`${baseUrl}/api/v1/iot/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command, duration_minutes: overrideDuration })
        });
      }
      await refreshSensorData();
    } catch (e) {
      console.error("Override failed", e);
    } finally {
      setIsSendingOverride(false);
    }
  };

  const irrigation_needed = sensorData?.irrigation_needed || false;
  const manual_override = sensorData?.manual_override || null;
  const suggestion = sensorData?.suggestion || "No recommendation available.";
  const status = irrigation_needed ? "ON" : "OFF";
  
  const lastUpdate = sensorData?.unix_timestamp ? new Date(sensorData.unix_timestamp) : null;
  const lastUpdateStr = lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Never";
  const isStale = lastUpdate ? (Date.now() - lastUpdate.getTime() > 60000) : false;
  const minsAgo = lastUpdate ? Math.round((Date.now() - lastUpdate.getTime()) / 60000) : 0;

  const getTempStatus = (v: number) => (v >= 15 && v <= 35) ? 'Optimal' : 'Caution';
  const getHumStatus = (v: number) => (v >= 30 && v <= 70) ? 'Optimal' : 'Caution';
  const getMoistureStatus = (v: number) => (v >= 30 && v <= 60) ? 'Optimal' : 'Too Dry';

  return (
    <div className="min-h-screen pb-20 font-sans text-gray-900 bg-gray-50/30 dark:bg-slate-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      
      {/* 1. TOP BANNER WITH COMPACT MODE SWITCH */}
      <section className="bg-green-700 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden mb-12">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl shadow-inner backdrop-blur-md animate-pulse-slow">
              📡
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black m-0 tracking-tighter">{t('iot_title')}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isStale ? 'bg-orange-500' : 'bg-green-500'} animate-pulse`}>
                  {isStale ? t('iot_status_stale') : t('iot_status_live')}
                </span>
              </div>
              <p className="text-white/70 font-bold m-0 text-sm">ESP32 Connected — Live from Farm</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-black/20 backdrop-blur-xl p-1.5 rounded-[1.5rem] border border-white/10 shadow-2xl">
              <button 
                onClick={() => handleOverride('AUTO')}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${manual_override === null ? 'bg-white text-green-700 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
              >
                🤖 Auto
              </button>
              <button 
                onClick={() => handleOverride(manual_override || 'OFF')}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${manual_override !== null ? 'bg-white text-green-700 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
              >
                🕹️ Manual
              </button>
              <button 
                onClick={handleRefresh}
                className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-2xl transition-colors"
                title="Refresh Status"
              >
                <span className={isRefreshing ? 'animate-spin' : ''}>⟳</span>
              </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      </section>

      {/* 2. SENSOR DATA GRID */}
      <h2 className="text-xl font-black mb-6 flex items-center gap-2">
        <span className="text-green-600">📊</span> {t('home_sensor_data')}
      </h2>
      
      {isLoading && !sensorData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <SensorCard title={t('iot_temp')} value={sensorData?.temperature || 0} unit="°C" icon="🌡️" status={getTempStatus(sensorData?.temperature || 0)} range="15-35°C" color="red" />
          <SensorCard title={t('iot_hum')} value={sensorData?.humidity || 0} unit="%" icon="💧" status={getHumStatus(sensorData?.humidity || 0)} range="30-70%" color="blue" />
          <SensorCard title={t('iot_moisture')} value={sensorData?.soil_moisture || 0} unit="%" icon="🌱" status={getMoistureStatus(sensorData?.soil_moisture || 0)} range="30-60%" color="green" />
        </div>
      )}

      <div className="text-sm text-gray-400 mb-10 flex items-center justify-center gap-2 bg-gray-100 py-2 rounded-full border border-gray-200 max-w-fit mx-auto px-6 font-bold">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        {t('iot_last_update')}: <strong className="text-gray-600 ml-1">{isStale ? `${lastUpdateStr} (${minsAgo}m ago)` : lastUpdateStr}</strong>
      </div>

      {/* 3. IRRIGATION STATUS CARD */}
      <div className="bg-white border border-gray-200 rounded-[3rem] p-8 sm:p-10 shadow-sm relative overflow-hidden group mb-12">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="flex items-center gap-8">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg ${irrigation_needed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                {irrigation_needed ? '🚿' : '🚫'}
              </div>
              <div>
                <h2 className="text-2xl font-black mb-1">{t('home_irrigation').toUpperCase()}: {status}</h2>
                <p className="text-gray-500 italic font-medium m-0">"{suggestion}"</p>
              </div>
           </div>
           <button onClick={() => navigate('/chat')} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all active:scale-95">🤖 Ask AI Expert</button>
        </div>
      </div>

      {/* 4. MANUAL PUMP CONTROLS (ONLY SHOW IF MANUAL MODE ACTIVE) */}
      {manual_override !== null && (
        <div className="bg-white border-2 border-green-600 rounded-[3rem] p-8 sm:p-10 shadow-2xl animate-slide-up">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
              <div>
                <h3 className="text-xl font-black m-0">🕹️ {t('iot_manual_controls')}</h3>
                <p className="text-gray-500 font-medium m-0">You are currently in Manual Mode. AI automation is paused.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex items-center gap-4">
                 <span className="text-xs font-black uppercase tracking-widest text-gray-400">{t('iot_timer')}:</span>
                 <input type="number" value={overrideDuration} onChange={(e) => setOverrideDuration(Number(e.target.value))} className="w-16 px-2 py-2 rounded-xl border border-gray-300 text-center font-bold" min="1" max="180" />
                 <span className="text-xs font-bold text-gray-500 uppercase">mins</span>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => handleOverride('ON')}
                disabled={isSendingOverride}
                className={`py-6 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 ${manual_override === 'ON' ? 'bg-green-600 text-white ring-8 ring-green-100' : 'bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
              >
                {manual_override === 'ON' ? '✅ Pump is ON' : '⚡ Turn Pump ON'}
              </button>
              <button 
                onClick={() => handleOverride('OFF')}
                disabled={isSendingOverride}
                className={`py-6 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 ${manual_override === 'OFF' ? 'bg-red-600 text-white ring-8 ring-red-100' : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
              >
                {manual_override === 'OFF' ? '🚫 Pump is OFF' : '🛑 Turn Pump OFF'}
              </button>
           </div>
           <p className="mt-6 text-center text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Switch back to Auto mode at the top to resume AI irrigation</p>
        </div>
      )}

      {/* 5. OFFLINE QUEUE STATUS */}
      {pendingCommandsCount > 0 && (
        <div className="mt-8 bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-8 shadow-sm flex items-center gap-6">
           <span className="text-4xl">📦</span>
           <div>
              <h3 className="m-0 text-amber-800 font-black">{pendingCommandsCount} Commands Queued</h3>
              <p className="m-0 text-amber-700 text-sm font-medium">System is offline. Commands will send automatically when you reconnect.</p>
           </div>
        </div>
      )}

      {/* 6. SENSOR HEALTH */}
      <div className="mt-16 pt-10 border-t border-gray-100">
        <h2 className="text-xl font-black mb-6 flex items-center gap-2">🔧 {t('iot_sensor_health')}</h2>
        <div className="flex flex-wrap gap-4">
           <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 font-bold text-xs flex items-center gap-3 shadow-sm">
             <span className="w-2 h-2 rounded-full bg-green-500"></span> 🌡️ Temp: Online
           </div>
           <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 font-bold text-xs flex items-center gap-3 shadow-sm">
             <span className="w-2 h-2 rounded-full bg-green-500"></span> 💧 Hum: Online
           </div>
           <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 font-bold text-xs flex items-center gap-3 shadow-sm">
             <span className="w-2 h-2 rounded-full bg-green-500"></span> 🌱 Moisture: Online
           </div>
        </div>
      </div>

      </div>
    </div>
  );
}
