import { useState, useEffect } from "react";
import { Sun, Cloud, CloudRain } from "lucide-react";

const C = {
  text: "#e0d4c0",
  textDim: "#b8a890",
  textFaint: "#8a7a6a",
  border: "#3a2a1a",
};

const getInGameTime = () => {
   const now = new Date();
   // 60-min cycle: 40 mins day (6:00-17:59), 20 mins night (18:00-5:59)
   const totalSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
   const cyclePosSecs = totalSecs % 3600; // 0-3599 within 60-min cycle
   const gameMinuteInCycle = (cyclePosSecs / 3600) * 1440; // 0-1439 in 24-hour scale
   const gameHour = Math.floor(gameMinuteInCycle / 60);
   const gameMin = Math.floor(gameMinuteInCycle % 60);
   const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
   const gameDay = (dayOfYear * 12) % 120 + 1;
   return {
     hour: String(gameHour).padStart(2, '0'),
     min: String(gameMin).padStart(2, '0'),
     isDaytime: gameHour >= 6 && gameHour < 18,
     day: gameDay,
   };
};

export default function WorldStatus({ weather }) {
  const [inGameTime, setInGameTime] = useState(getInGameTime());

  useEffect(() => {
     setInGameTime(getInGameTime());
     const id = setInterval(() => setInGameTime(getInGameTime()), 100);
     return () => clearInterval(id);
   }, []);

  const getGameSeason = () => {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const gameDayInCycle = (dayOfYear * 12) % 120;
    if (gameDayInCycle < 30) return { name: "SPRING", color: "#39ff14", icon: "🌱" };
    if (gameDayInCycle < 60) return { name: "SUMMER", color: "#ffb000", icon: "☀️" };
    if (gameDayInCycle < 90) return { name: "AUTUMN", color: "#ff8000", icon: "🍂" };
    return { name: "WINTER", color: "#00e5ff", icon: "❄️" };
  };

  const getGameWeather = () => {
    const seed = Math.floor(new Date().getTime() / 3600000) % 4;
    const conditions = [
      { name: "CLEAR",    icon: "☀️", color: "#ffb000" },
      { name: "OVERCAST", icon: "☁️", color: "#999" },
      { name: "RAIN",     icon: "🌧️", color: "#00e5ff", danger: true },
      { name: "STORM",    icon: "⚡",  color: "#ff2020", danger: true },
    ];
    return conditions[seed];
  };

  const getHazard = () => {
    const hour = parseInt(inGameTime.hour);
    const gw = getGameWeather();
    if (gw.danger) return { label: "EXPOSURE", color: "#ff2020" };
    if (hour >= 20 || hour < 4) return { label: "COLD", color: "#00e5ff" };
    if (hour < 6 || hour >= 20) return { label: "NIGHT", color: "#ffb000" };
    return { label: "STABLE", color: "#39ff14" };
  };

  const season = getGameSeason();
  const gameWeather = getGameWeather();
  const hazard = getHazard();

  return (
    <div className="flex items-center gap-4 px-2">
      {/* In-game time & day */}
       <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
         <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>GAME TIME</span>
         <span style={{ color: C.text, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
           {inGameTime.hour}:{inGameTime.min}
           <span style={{ color: inGameTime.isDaytime ? "#ffb000" : "#00e5ff", fontSize: "8px", marginLeft: "4px" }}>
             {inGameTime.isDaytime ? "☀" : "☾"}
           </span>
         </span>
         <span style={{ color: C.textFaint, fontSize: "7px", letterSpacing: "0.1em", marginTop: "2px" }}>DAY {inGameTime.day}</span>
       </div>

      <span style={{ color: C.border, fontSize: "16px" }}>|</span>

      {/* Season */}
      <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
        <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>SEASON</span>
        <span style={{ color: season.color, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
          {season.icon} {season.name}
        </span>
      </div>

      <span style={{ color: C.border, fontSize: "16px" }}>|</span>

      {/* In-game weather */}
      <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
        <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>CONDITIONS</span>
        <span style={{ color: gameWeather.color, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
          {gameWeather.icon} {gameWeather.name}
        </span>
      </div>

      <span style={{ color: C.border, fontSize: "16px" }}>|</span>

      {/* Hazard */}
      <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
        <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>HAZARD</span>
        <span style={{ color: hazard.color, fontFamily: "'Orbitron', monospace", fontSize: "10px",
          animation: hazard.label !== "STABLE" ? "threat-blink 1s infinite" : "none" }}>
          {hazard.label}
        </span>
      </div>

      {/* Real-world weather if available */}
      {weather && (
        <>
          <span style={{ color: C.border, fontSize: "16px" }}>|</span>
          <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
            <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>IRL WEATHER</span>
            <span style={{ color: C.textDim, fontSize: "10px" }}>
              {weather.temp}°F {weather.shortForecast.split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}