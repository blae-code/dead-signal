import { useState, useEffect } from "react";
import { Sun, Cloud, CloudRain, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <TooltipProvider>
      <div className="flex items-center gap-4 px-2">
        {/* In-game time & day */}
        <div className="flex flex-col items-center relative group" style={{ lineHeight: 1.2 }}>
          <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>GAME TIME</span>
          <div className="flex items-center gap-1">
            <span style={{ color: C.text, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
              {inGameTime.hour}:{inGameTime.min}
              <span style={{ color: inGameTime.isDaytime ? "#ffb000" : "#00e5ff", fontSize: "8px", marginLeft: "4px" }}>
                {inGameTime.isDaytime ? "☀" : "☾"}
              </span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="opacity-60 hover:opacity-100 transition-opacity">
                  <HelpCircle size={10} style={{ color: C.textFaint }} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs bg-opacity-95">
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-amber-300">GAME TIME CYCLE</p>
                  <p>60-minute cycle: 40 min day (06:00-17:59) + 20 min night (18:00-05:59)</p>
                  <p className="text-gray-300 mt-2">🌞 <strong>Daytime:</strong> Visibility normal, reduced zombie spawn rates, safe for scavenging missions</p>
                  <p className="text-gray-300">🌙 <strong>Nighttime:</strong> 40% reduced visibility, 3x zombie aggression, increased hypothermia risk</p>
                  <p className="text-gray-300 mt-2">Day {inGameTime.day} of 120-day seasonal cycle</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <span style={{ color: C.textFaint, fontSize: "7px", letterSpacing: "0.1em", marginTop: "2px" }}>DAY {inGameTime.day}</span>
        </div>

        <span style={{ color: C.border, fontSize: "16px" }}>|</span>

        {/* Season */}
        <div className="flex flex-col items-center relative" style={{ lineHeight: 1.2 }}>
          <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>SEASON</span>
          <div className="flex items-center gap-1">
            <span style={{ color: season.color, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
              {season.icon} {season.name}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="opacity-60 hover:opacity-100 transition-opacity">
                  <HelpCircle size={10} style={{ color: C.textFaint }} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs bg-opacity-95">
                <div className="space-y-1 text-xs">
                  <p className="font-bold" style={{ color: season.color }}>{season.name}</p>
                  {season.name === "SPRING" && <p>Resource spawns: +30% growth rate. Temp: -5°C to 15°C. Mutations less aggressive. Ideal for base building & farming.</p>}
                  {season.name === "SUMMER" && <p>Resource spawns: +50% abundance. Temp: 10°C to 25°C. Dehydration risk increases. Fastest loot cycle but high horde density.</p>}
                  {season.name === "AUTUMN" && <p>Resource spawns: Normal rates. Temp: 0°C to 15°C. Balanced conditions. Stable zombie behavior, reliable harvests.</p>}
                  {season.name === "WINTER" && <p>Resource spawns: -40% availability. Temp: -15°C to 5°C. Hypothermia critical threat. Supplies scarce, survival tactics essential.</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <span style={{ color: C.border, fontSize: "16px" }}>|</span>

        {/* In-game weather */}
        <div className="flex flex-col items-center relative" style={{ lineHeight: 1.2 }}>
          <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>CONDITIONS</span>
          <div className="flex items-center gap-1">
            <span style={{ color: gameWeather.color, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
              {gameWeather.icon} {gameWeather.name}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="opacity-60 hover:opacity-100 transition-opacity">
                  <HelpCircle size={10} style={{ color: C.textFaint }} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs bg-opacity-95">
                <div className="space-y-1 text-xs">
                  <p className="font-bold" style={{ color: gameWeather.color }}>WEATHER IMPACT</p>
                  {gameWeather.name === "CLEAR" && <p>☀️ <strong>CLEAR:</strong> 100% visibility, normal zombie detection. Optimal for speed runs & supply missions. Watch for dehydration.</p>}
                  {gameWeather.name === "OVERCAST" && <p>☁️ <strong>OVERCAST:</strong> 85% visibility, -15% zombie detection range. Ideal cover for stealth missions.</p>}
                  {gameWeather.name === "RAIN" && <p>🌧️ <strong>RAIN:</strong> 60% visibility, -30% zombie audio detection, +20% hypothermia risk. Scent trails reset—perfect ambush timing.</p>}
                  {gameWeather.name === "STORM" && <p>⚡ <strong>STORM:</strong> 35% visibility, +2x zombie aggression, lightning strikes possible (instant death). Avoid open areas. Take shelter immediately.</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <span style={{ color: C.border, fontSize: "16px" }}>|</span>

        {/* Hazard */}
        <div className="flex flex-col items-center relative" style={{ lineHeight: 1.2 }}>
          <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>HAZARD</span>
          <div className="flex items-center gap-1">
            <span style={{ color: hazard.color, fontFamily: "'Orbitron', monospace", fontSize: "10px",
              animation: hazard.label !== "STABLE" ? "threat-blink 1s infinite" : "none" }}>
              {hazard.label}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="opacity-60 hover:opacity-100 transition-opacity">
                  <HelpCircle size={10} style={{ color: C.textFaint }} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs bg-opacity-95">
                <div className="space-y-1 text-xs">
                  <p className="font-bold" style={{ color: hazard.color }}>{hazard.label}</p>
                  {hazard.label === "STABLE" && <p>✓ All environmental factors nominal. Best window for extended missions. Maintain hydration & food intake.</p>}
                  {hazard.label === "NIGHT" && <p>🌙 Night hazard active (18:00-05:59). Visibility -40%, zombie aggression +3x. Recommend shelter or high-defense positions. Use lights strategically to avoid detection.</p>}
                  {hazard.label === "COLD" && <p>❄️ Hypothermia risk active (below 0°C). Health depletes 5%/min without warmth source. Camp fires, heated bases, or thermal gear required. Monitor squad vitals.</p>}
                  {hazard.label === "EXPOSURE" && <p>⚠️ CRITICAL: Extreme weather (STORM/RAIN) + hazard conditions. Immediate shelter required. Visibility critical, zombie threat maximum. Abort non-essential missions.</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Real-world weather if available */}
        {weather && (
          <>
            <span style={{ color: C.border, fontSize: "16px" }}>|</span>
            <div className="flex flex-col items-center relative" style={{ lineHeight: 1.2 }}>
              <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>IRL WEATHER</span>
              <div className="flex items-center gap-1">
                <span style={{ color: C.textDim, fontSize: "10px" }}>
                  {weather.temp}°F {weather.shortForecast.split(" ").slice(0, 2).join(" ")}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="opacity-60 hover:opacity-100 transition-opacity">
                      <HelpCircle size={10} style={{ color: C.textFaint }} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs bg-opacity-95">
                    <div className="space-y-1 text-xs">
                      <p className="font-bold">REAL-WORLD CONDITIONS</p>
                      <p>Current location: Vancouver, BC</p>
                      <p>Temperature: {weather.temp}°F</p>
                      <p>Forecast: {weather.shortForecast}</p>
                      <p className="text-gray-300 mt-2">This is your actual environment while playing. Stay hydrated IRL and take breaks during extended sessions.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}