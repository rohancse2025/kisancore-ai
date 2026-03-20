import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CropsPage from "./pages/CropsPage";
import ScanPage from "./pages/ScanPage";
import IoTPage from "./pages/IoTPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/crops", label: "Crops" },
    { path: "/scan", label: "Scan" },
    { path: "/iot", label: "IoT" },
    { path: "/chat", label: "Chat" },
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      width: "100%",
      backgroundColor: "#f3f4f6",
      fontFamily: "system-ui, -apple-system, sans-serif",
      margin: 0,
      padding: 0
    }}>
      {/* Global reset for body margin since we are not using external CSS here */}
      <style>
        {`
          body {
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      {/* Top Navigation Bar */}
      <nav style={{
        backgroundColor: "#15803d",
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 40px",
        boxSizing: "border-box",
        height: "70px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        {/* Logo */}
        <div 
          onClick={() => navigate("/")}
          style={{
            color: "white",
            fontSize: "22px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center"
          }}
        >
          🌿 KisanCore AI
        </div>

        {/* Links */}
        <div style={{ display: "flex", gap: "10px" }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  color: "white",
                  fontSize: "16px",
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: "6px",
                  backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "transparent",
                  textDecoration: isActive ? "underline" : "none",
                  textUnderlineOffset: "6px",
                  textDecorationThickness: "2px",
                  transition: "background-color 0.2s ease, text-decoration 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "30px",
        boxSizing: "border-box",
        animation: "fadeIn 0.3s ease-out"
      }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/crops" element={<CropsPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/iot" element={<IoTPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  );
}