import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Cloud, CloudRain, Sun, Wind, Droplets, Eye, Gauge } from "lucide-react";

const C = {
  text: "#d4d4d4",
  textDim: "#999",
  textFaint: "#777",
  border: "#1e1e1e",
  borderMid: "#2a2a2a",
};

export default function WorldStatus({ inGameTime, weather }) {
  const [expanded, setExpanded] = useState(false);

  // Calculate game season (based on game day in 120-day cycle)
  const getGameSeason = () => {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const gameDayInCycle = (dayOfYear * 12) % 120; // 120 game days = full cycle
    
    if (gameDayInCycle < 30) return { name: "SPRING", color: "#39ff14", icon: "🌱" };
    if (gameDayInCycle < 60) return { name: "SUMMER", color: "#ffb000", icon: "☀️" };
    if (gameDayInCycle < 90) return { name: "AUTUMN", color: "#ff8000", icon: "🍂" };
    return { name: "WINTER", color: "#00e5ff", icon: "❄️" };
  };

  // Simulate in-game weather independent of real weather
  const getGameWeather = () => {
    const now = new Date();
    const seed = Math.floor(now.getTime() / 3600000) % 4;
    const conditions = [
      { name: "CLEAR", icon: "☀️", color: "#ffb000", danger: 0 },
      { name: "OVERCAST", icon: "☁️", color: "#999", danger: 1 },
      { name: "RAIN", icon: "🌧️", color: "#00e5ff", danger: 2 },
      { name: "STORM", icon: "⚡", color: "#ff2020", danger: 3 },
    ];
    return conditions[seed];
  };

  // Calculate environmental hazards based on time & season
  const getHazards = () => {
    const hour = parseInt(inGameTime.hour);
    const season = getGameSeason();
    const gameWeather = getGameWeather();
    const hazards = [];

    if (hour < 6 || hour >= 20) hazards.push({ name: "NIGHT", severity: "WARN", color: "#ffb000" });
    if (hour >= 20 || hour < 4) hazards.push({ name: "COLD", severity: "ALERT", color: "#00e5ff" });
    if (gameWeather.danger >= 2) hazards.push({ name: "EXPOSURE", severity: "CRITICAL", color: "#ff2020" });
    if (season.name === "SUMMER" && hour >= 12 && hour <= 16) hazards.push({ name: "HEATSTROKE", severity: "ALERT", color: "#ff8000" });

    return hazards.length ? hazards : [{ name: "STABLE", severity: "OK", color: "#39ff14" }];
  };

  const season = getGameSeason();
  const gameWeather = getGameWeather();
  const hazards = getHazards();

  return (
    <div style={{ borderColor: C.border }}>
      {/* Collapsed header row */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 border-b text-xs font-bold tracking-widest"
        style={{ 
          borderColor: C.border, 
          color: C.textFaint,
          background: "transparent",
          cursor: "pointer",
          fontFamily: "'Orbitron', monospace",
          fontSize: "9px"
        }}
      >
        <span className="flex items-center gap-2">
          <span>{season.icon}</span>
          <span style={{ color: season.color }}>{season.name}</span>
          <span style={{ color: C.textFaint }}>•</span>
          <span>{gameWeather.icon}</span>
          <span style={{ color: gameWeather.color }}>{gameWeather.name}</span>
        </span>
        <ChevronDown 
          size={11} 
          style={{ 
            color: C.textFaint,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s"
          }} 
        />
      </motion.button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-b"
            style={{ borderColor: C.border, background: "#080808" }}
          >
            <div className="px-3 py-3 space-y-3">
              {/* In-game time detail */}
              <div className="space-y-1">
                <div className="text-xs" style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>GAME TIME</div>
                <div className="flex items-center gap-2">
                  {inGameTime.isDaytime ? (
                    <Sun size={12} style={{ color: "#ffb000" }} />
                  ) : (
                    <Cloud size={12} style={{ color: "#00e5ff" }} />
                  )}
                  <span style={{ color: C.text, fontFamily: "'Orbitron', monospace", fontSize: "13px" }}>
                    {inGameTime.hour}:{inGameTime.min}
                  </span>
                  <span style={{ color: C.textDim, fontSize: "10px" }}>
                    {inGameTime.isDaytime ? "DAYTIME" : "NIGHTTIME"}
                  </span>
                </div>
              </div>

              {/* Season detail */}
              <div className="space-y-1">
                <div className="text-xs" style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>SEASON</div>
                <div style={{ color: season.color, fontFamily: "'Orbitron', monospace", fontSize: "12px" }}>
                  {season.icon} {season.name}
                </div>
              </div>

              {/* In-game weather conditions */}
              <div className="space-y-1">
                <div className="text-xs" style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>IN-GAME CONDITIONS</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1">
                    {gameWeather.icon === "☀️" ? <Sun size={11} /> : gameWeather.icon === "☁️" ? <Cloud size={11} /> : <CloudRain size={11} />}
                    <span style={{ color: gameWeather.color, fontSize: "10px" }}>{gameWeather.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind size={11} style={{ color: C.textDim }} />
                    <span style={{ color: C.textDim, fontSize: "10px" }}>12 KM/H</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets size={11} style={{ color: C.textDim }} />
                    <span style={{ color: C.textDim, fontSize: "10px" }}>65%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={11} style={{ color: C.textDim }} />
                    <span style={{ color: C.textDim, fontSize: "10px" }}>800M</span>
                  </div>
                </div>
              </div>

              {/* Environmental hazards */}
              <div className="space-y-1">
                <div className="text-xs" style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>ENVIRONMENTAL HAZARDS</div>
                <div className="flex flex-wrap gap-2">
                  {hazards.map(h => (
                    <span 
                      key={h.name}
                      className="px-2 py-1 text-xs border"
                      style={{ 
                        borderColor: h.color + "66",
                        color: h.color,
                        background: h.color + "11",
                        fontSize: "9px",
                        fontFamily: "'Orbitron', monospace"
                      }}
                    >
                      {h.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Real-world weather context */}
              {weather && (
                <div className="space-y-1 border-t pt-2" style={{ borderColor: C.border }}>
                  <div className="text-xs" style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>REAL-WORLD CONDITIONS</div>
                  <div className="flex items-center gap-2">
                    {weather.shortForecast.includes("Rain") ? (
                      <CloudRain size={11} style={{ color: "#00e5ff" }} />
                    ) : weather.shortForecast.includes("Cloud") ? (
                      <Cloud size={11} style={{ color: "#666" }} />
                    ) : (
                      <Sun size={11} style={{ color: "#ffb000" }} />
                    )}
                    <span style={{ color: C.text, fontSize: "10px" }}>
                      {weather.temp}°F • {weather.shortForecast}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}