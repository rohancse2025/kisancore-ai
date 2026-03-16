import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export function App() {
  const [backendStatus, setBackendStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((r) => r.json())
      .then(() => setBackendStatus("ok"))
      .catch(() => setBackendStatus("unreachable"));
  }, []);

  return (
    <div className="page">
      <header className="header">
        <h1>AI Smart Agriculture</h1>
        <p className="muted">Backend: {backendStatus}</p>
      </header>

      <main className="card">
        <h2>Next modules</h2>
        <ul>
          <li>Sensor ingestion (IoT)</li>
          <li>Crop/soil analytics (AI models)</li>
          <li>Dashboards + alerts</li>
        </ul>
      </main>
    </div>
  );
}

