import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Radio, Map, Users, Package, Cpu, Crosshair,
  AlertTriangle, Terminal, Menu, X, Wifi, WifiOff, ChevronRight,
  Shield, Activity, Skull, Bot, Zap, Database, Cloud, CloudRain, Sun } from
"lucide-react";
import WorldStatus from "@/components/WorldStatus";

// Rust-apocalypse nav structure
const navSections = [
{
  label: "// OPS CENTER",
  items: [
  { label: "COMMAND", page: "Dashboard", icon: Terminal, code: "HQ", color: "#ffb000", dot: "#39ff14" },
  { label: "SERVER", page: "ServerMonitor", icon: Cpu, code: "SRV", color: "#00e5ff", dot: "#00e5ff" }]

},
{
  label: "// FIELD OPS",
  items: [
  { label: "TACTICAL MAP", page: "TacticalMap", icon: Map, code: "MAP", color: "#ffb000", dot: "#ffb000" },
  { label: "CLAN ROSTER", page: "ClanRoster", icon: Users, code: "OPS", color: "#b8a890", dot: "#39ff14" },
  { label: "MISSIONS", page: "Missions", icon: Crosshair, code: "MIS", color: "#ff2020", dot: "#ff2020" }]

},
{
  label: "// LOGISTICS",
  items: [
  { label: "INVENTORY", page: "Inventory", icon: Package, code: "INV", color: "#b8a890", dot: "#8a7a6a" },
  { label: "INTEL FEED", page: "Intel", icon: Radio, code: "INT", color: "#ffb000", dot: "#ffb000" },
  { label: "AI AGENT", page: "AIAgent", icon: Bot, code: "AI", color: "#39ff14", dot: "#39ff14" }]

}];


const THREAT_LEVELS = [
{ label: "SECURE", color: "#39ff14" },
{ label: "ELEVATED", color: "#ffb000" },
{ label: "CRITICAL", color: "#ff2020" }];


// Rust-core palette—brown/orange/gray base with status colors reserved
const C = {
  text: "#b8a890", // primary text—faded beige
  textDim: "#8a7a6a", // secondary—muted brown
  textFaint: "#5a4a3a", // faint labels—deep rust
  border: "#3a2a1a", // default border—dark rust
  borderMid: "#4a3a2a", // slightly brighter border
  active: "#d4b8a0", // active nav item—light tan
  activeBg: "#2a1810", // active nav item bg—very dark
  activeLine: "#7a5a3a", // active left-bar accent—medium rust
  accent: "#b8860b", // logo / app name—goldenrod
  scan: "rgba(184, 134, 11, 0.01)"
};

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [threatLevel] = useState(0); // 0=secure, 1=elevated, 2=critical
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Fetch weather based on user timezone (Vancouver area)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch("https://api.weather.gov/points/49.28,-123.12");
        const data = await res.json();
        const forecastUrl = data.properties?.forecast;
        if (forecastUrl) {
          const forecastRes = await fetch(forecastUrl);
          const forecastData = await forecastRes.json();
          const current = forecastData.properties?.periods?.[0];
          if (current) {
            setWeather({
              temp: current.temperature,
              shortForecast: current.shortForecast,
              isDaytime: current.isDaytime
            });
          }
        }
      } catch (e) {
        // silently fail
      }
    };
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 600000); // refresh every 10 min
    return () => clearInterval(weatherInterval);
  }, []);

  // In-game time: cycles every 120 minutes (real time = 1 day in game)
  const getInGameTime = () => {
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const gameMinutesInDay = totalMinutes * 12; // 1 real minute = 12 game minutes
    const gameHour = Math.floor((gameMinutesInDay / 60) % 24);
    const gameMin = Math.floor(gameMinutesInDay % 60);
    return {
      hour: String(gameHour).padStart(2, '0'),
      min: String(gameMin).padStart(2, '0'),
      isDaytime: gameHour >= 6 && gameHour < 18,
    };
  };

  const inGameTime = getInGameTime();

  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
  const threat = THREAT_LEVELS[threatLevel];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #1a1410 0%, #2d1f0f 100%)", fontFamily: "'Share Tech Mono', monospace" }}>
      <style>{`
        @keyframes uplink-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes threat-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes header-scan {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes nav-dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 4px rgba(212,212,212,0.4); }
          50% { text-shadow: 0 0 8px rgba(212,212,212,0.8); }
        }
        .nav-item-hover {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-item-hover:hover {
          background: #111 !important;
        }
        .nav-item-hover:hover .nav-label {
          color: #e8e8e8 !important;
        }
        .nav-item-hover:hover .nav-code {
          opacity: 1 !important;
        }
        .nav-item-hover:hover .nav-icon {
          opacity: 1 !important;
        }
      `}</style>

      {/* Top bar */}
      <header
        className="border-b flex items-center justify-between px-4 py-2 z-50 relative overflow-hidden"
        style={{ borderColor: C.border, background: "linear-gradient(135deg, rgba(20, 15, 10, 0.95) 0%, rgba(30, 20, 15, 0.95) 100%)" }}>

        {/* Subtle scan line */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(90deg, transparent 0%, ${C.scan} 50%, transparent 100%)`,
          animation: "header-scan 8s linear infinite",
          backgroundSize: "200% 100%"
        }} />

        <div className="flex items-center gap-3 relative">
          <button className="md:hidden" style={{ color: C.text }} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-3">
            <Skull size={14} style={{ color: C.accent }} />
            <span className="font-bold tracking-widest" style={{ color: C.accent, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
              DEAD SIGNAL
            </span>
            <span style={{ color: C.border }}>|</span>
            <span className="hidden sm:block text-xs" style={{ color: C.textDim, letterSpacing: "0.15em" }}>HUMANITZ OPS CENTER</span>
          </div>
        </div>

        {/* Center: Threat level — retains status colours intentionally */}
        <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <Shield size={11} style={{ color: threat.color }} />
          <span className="text-xs font-bold tracking-widest" style={{
            color: threat.color,
            fontFamily: "'Orbitron', monospace",
            fontSize: "9px",
            animation: threatLevel > 0 ? "threat-blink 1s infinite" : "none"
          }}>
            THREAT: {threat.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs relative flex-1">
          <div className="hidden sm:flex flex-col items-end" style={{ lineHeight: 1.2 }}>
            <span style={{ color: C.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>LOCAL TIME</span>
            <motion.span 
              key={timeStr}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ color: C.text, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}
            >
              {timeStr}
            </motion.span>
          </div>
          <span className="hidden sm:block" style={{ color: C.border }}>|</span>
          <div className="hidden sm:flex flex-col items-end" style={{ lineHeight: 1.2 }}>
            <span style={{ color: C.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>DATE</span>
            <span style={{ color: C.textDim, fontSize: "10px" }}>{dateStr}</span>
          </div>
        </div>

        {/* World Status panel (expandable) */}
        <div className="hidden xl:flex flex-1 justify-center">
          <div style={{ width: "400px" }}>
            <WorldStatus inGameTime={inGameTime} weather={weather} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className={`fixed md:relative z-40 h-full flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{
            width: "210px",
            background: "linear-gradient(135deg, #0f0a07 0%, #1a1410 100%)",
            borderRight: `1px solid ${C.border}`,
            minHeight: "calc(100vh - 41px)",
            boxShadow: "inset 1px 0 2px rgba(139, 69, 19, 0.3)"
          }}>

          {/* Sidebar top label */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="px-3 py-2 border-b flex items-center justify-between" 
            style={{ borderColor: C.border, background: "#050505" }}>
            <div className="flex items-center gap-2">
              <Activity size={9} style={{ color: "#39ff14", animation: "nav-dot-pulse 2s infinite" }} />
              <span style={{ color: C.textDim, fontSize: "9px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>SYS.NAV</span>
            </div>
            <span style={{ color: C.textFaint, fontSize: "8px" }}>{navSections.reduce((a, s) => a + s.items.length, 0)} MODULES</span>
          </motion.div>

          {/* Nav sections */}
          <div className="flex-1 overflow-y-auto py-1">
            {navSections.map((section) =>
            <div key={section.label}>
                {/* Section divider */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <span style={{ color: C.textDim, fontSize: "8px", letterSpacing: "0.2em" }}>{section.label}</span>
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8 }}
                    style={{ flex: 1, height: "1px", background: C.border, transformOrigin: "left" }} />
                </div>

                {section.items.map(({ label, page, icon: IconComponent, code, color, dot }) => {
                const active = currentPageName === page;
                return (
                  <motion.div
                    key={page}
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                  <Link
                    to={createPageUrl(page)}
                    onClick={() => setMobileOpen(false)}
                    className="nav-item-hover flex items-center gap-2 px-3 py-2 text-xs relative"
                    style={{
                      background: active ? "#0d0d0d" : "transparent",
                      borderLeft: active ? `2px solid ${color}` : "2px solid transparent",
                      letterSpacing: "0.08em",
                      textDecoration: "none",
                      display: "flex"
                    }}>

                      {/* Status dot */}
                      <motion.div
                        animate={{ scale: active ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                          background: active ? dot : C.textFaint,
                          boxShadow: active ? `0 0 6px ${dot}` : "none"
                        }} />

                      {/* Icon */}
                      <IconComponent
                        size={11}
                        className="nav-icon"
                        style={{
                          flexShrink: 0,
                          color: active ? color : C.textFaint,
                          opacity: active ? 1 : 0.5,
                          transition: "color 0.15s, opacity 0.15s"
                        }} />


                      {/* Label */}
                      <span
                      className="nav-label"
                      style={{
                        flex: 1,
                        color: active ? color : C.textDim,
                        fontSize: "10px",
                        transition: "color 0.15s"
                      }}>

                        {label}
                      </span>

                      {/* Code badge */}
                      <span
                      className="nav-code"
                      style={{
                        color: active ? color : C.textFaint,
                        fontSize: "8px",
                        opacity: active ? 0.9 : 0,
                        fontFamily: "'Orbitron', monospace",
                        transition: "opacity 0.15s",
                        letterSpacing: "0.05em"
                      }}>

                        {code}
                      </span>

                      {/* Active right bar */}
                      {active &&
                        <motion.div
                          layoutId="activeBar"
                          style={{
                            position: "absolute", right: 0, top: "15%", bottom: "15%",
                            width: "2px",
                            background: `linear-gradient(180deg, transparent, ${color}, transparent)`
                          }} />
                      }
                    </Link>
                   </motion.div>);
              })}
              </div>
            )}
          </div>

          {/* Sidebar bottom */}
          <motion.div 
            className="border-t" 
            style={{ borderColor: C.border, background: "#050505" }}>
            {/* Mini status row */}
            <div className="px-3 pt-2 pb-1 flex items-center gap-2 border-b" style={{ borderColor: C.border }}>
              <motion.div
                animate={{ scale: online ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: online ? "#39ff14" : "#ff2020"
                }} />
              <span style={{ color: online ? "#39ff14" : "#ff2020", fontSize: "8px", letterSpacing: "0.15em" }}>
                {online ? "NET: ONLINE" : "NET: OFFLINE"}
              </span>
            </div>
            <div className="px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>BUILD</span>
                <span style={{ color: C.textDim, fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>DS-ALPHA</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>VER</span>
                <span style={{ color: C.textDim, fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>v1.0.0</span>
              </div>
              <div style={{ height: "1px", background: `linear-gradient(90deg, ${C.textFaint}44, transparent)`, margin: "4px 0" }} />
              <div className="flex items-center gap-1">
                <Skull size={8} style={{ color: C.textDim }} />
                <span style={{ color: C.textDim, fontSize: "8px", letterSpacing: "0.12em" }}>DEAD SIGNAL PROTOCOL</span>
              </div>
            </div>
          </motion.div>
        </nav>

        {/* Mobile overlay */}
        {mobileOpen &&
        <div className="fixed inset-0 z-30 bg-black bg-opacity-80 md:hidden" onClick={() => setMobileOpen(false)} />
        }

        {/* Main content */}
        <main className="flex-1 overflow-auto" style={{ background: "#0a0a0a" }}>
          {children}
        </main>
      </div>
    </div>);

}