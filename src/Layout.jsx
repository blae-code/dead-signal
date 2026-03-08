import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Map, Users, Package, Cpu, Crosshair,
  Terminal, Menu, X, Activity, Skull, Bot,
} from "lucide-react";
import WorldStatus from "@/components/WorldStatus";
import HeaderCommandPrompt from "@/components/HeaderCommandPrompt";

// ── Navigation structure ──────────────────────────────────────────────────────
const navSections = [
  {
    label: "OPS CENTER",
    items: [
      { label: "COMMAND",      page: "Dashboard",     icon: Terminal,  code: "HQ",  color: "#ffaa00", dot: "#30ff60" },
      { label: "SERVER",       page: "ServerMonitor", icon: Cpu,       code: "SRV", color: "#00e8ff", dot: "#00e8ff" },
    ],
  },
  {
    label: "FIELD OPS",
    items: [
      { label: "TACTICAL MAP", page: "TacticalMap",   icon: Map,       code: "MAP", color: "#e8b800", dot: "#e8b800" },
      { label: "CLAN ROSTER",  page: "ClanRoster",    icon: Users,     code: "OPS", color: "#00c8a0", dot: "#30ff60" },
      { label: "MISSIONS",     page: "Missions",      icon: Crosshair, code: "MIS", color: "#ff2828", dot: "#ff2828" },
    ],
  },
  {
    label: "LOGISTICS",
    items: [
      { label: "INVENTORY",    page: "Inventory",        icon: Package,   code: "INV", color: "#ff6a00", dot: "#ff6a00" },
      { label: "INTEL FEED",   page: "Intel",            icon: Radio,     code: "INT", color: "#ffaa00", dot: "#ffaa00" },
      { label: "AI AGENT",     page: "AIAgent",          icon: Bot,       code: "AI",  color: "#a8c820", dot: "#a8c820" },
    ],
  },
  {
    label: "SURVIVAL OPS",
    items: [
      { label: "SURVIVAL PLAN",   page: "SurvivalPlanner",    icon: Map,       code: "PLAN", color: "#00b896", dot: "#00b896" },
      { label: "SQUAD VITALS",    page: "SquadVitalsMonitor", icon: Activity,  code: "VITAL", color: "#39ff14", dot: "#39ff14" },
      { label: "SUPPLY CHAIN",    page: "SupplyChainManager", icon: Package,   code: "SUP", color: "#d4a800", dot: "#d4a800" },
      { label: "POST-ANALYSIS",   page: "PostMissionAnalysis", icon: Activity, code: "POST", color: "#ffaa00", dot: "#ffaa00" },
    ],
  },
];

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  text:        "#e8dcc8",
  textDim:     "#c0aa88",
  textFaint:   "#7a6a52",
  border:      "#2a1e10",
  borderBright:"#4e3a22",
  bg:          "#0d0a07",
  bgNav:       "#0a0704",
  accent:      "#ffaa00",
  accentDim:   "#7a5800",
  green:       "#30ff60",
  red:         "#ff2828",
  cyan:        "#00e8ff",
  olive:       "#a8c820",
  teal:        "#00b896",
  steel:       "#4ab8d4",
  gold:        "#d4a800",
};

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime]             = useState(new Date());
  const [online, setOnline]         = useState(navigator.onLine);
  const [weather, setWeather]       = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res  = await fetch("https://api.weather.gov/points/49.28,-123.12");
        const data = await res.json();
        const forecastUrl = data.properties?.forecast;
        if (forecastUrl) {
          const fRes  = await fetch(forecastUrl);
          const fData = await fRes.json();
          const cur   = fData.properties?.periods?.[0];
          if (cur) setWeather({ temp: cur.temperature, shortForecast: cur.shortForecast, isDaytime: cur.isDaytime });
        }
      } catch (_) {}
    };
    fetchWeather();
    const wInt = setInterval(fetchWeather, 600000);
    return () => clearInterval(wInt);
  }, []);

  const getInGameTime = () => {
    const now = new Date();
    const totalMinutes    = now.getHours() * 60 + now.getMinutes();
    const gameMinutesInDay = totalMinutes * 12;
    const gameHour = Math.floor((gameMinutesInDay / 60) % 24);
    const gameMin  = Math.floor(gameMinutesInDay % 60);
    return {
      hour: String(gameHour).padStart(2, "0"),
      min:  String(gameMin).padStart(2, "0"),
      isDaytime: gameHour >= 6 && gameHour < 18,
    };
  };

  const inGameTime = getInGameTime();
  const timeStr    = time.toLocaleTimeString("en-US", { hour12: false });
  const dateStr    = time.toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#100c08", fontFamily: "'Share Tech Mono', monospace" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;600;700;900&display=swap');

        /* ── keyframes ── */
        @keyframes hdr-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes nav-glow-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes threat-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes scanline-move {
          0%   { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }
        @keyframes corner-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes glowDotPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50%       { transform: scale(2.5); opacity: 0; }
        }
        @keyframes spectrum-shift {
          0%,100% { filter: hue-rotate(0deg); }
          50%      { filter: hue-rotate(20deg); }
        }

        /* ── nav item ── */
        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          text-decoration: none;
          transition: background 0.18s ease, padding-left 0.18s ease;
          border-left: 2px solid transparent;
          overflow: hidden;
        }
        .nav-link::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.015), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .nav-link:hover::before { opacity: 1; }
        .nav-link:hover { background: rgba(255,255,255,0.03) !important; }
        .nav-link:hover .nav-label { color: #e8dfd4 !important; }
        .nav-link:hover .nav-icon  { opacity: 0.9 !important; }
        .nav-link:hover .nav-code  { opacity: 0.7 !important; }

        .nav-link.active { background: rgba(0,0,0,0.5) !important; padding-left: 18px !important; }

        /* ── scrollbar ── */
        .nav-scroll::-webkit-scrollbar       { width: 2px; }
        .nav-scroll::-webkit-scrollbar-track { background: transparent; }
        .nav-scroll::-webkit-scrollbar-thumb { background: ${C.borderBright}; }

        /* ── scanline overlay ── */
        .scanlines::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            180deg,
            transparent 0px,
            transparent 3px,
            rgba(0,0,0,0.07) 3px,
            rgba(0,0,0,0.07) 4px
          );
          animation: scanline-move 6s linear infinite;
          z-index: 0;
        }

        /* ── corner brackets ── */
        .corner-tl { position:absolute; top:4px; left:4px; width:10px; height:10px;
          border-top:1px solid; border-left:1px solid; animation: corner-pulse 3s ease-in-out infinite; }
        .corner-tr { position:absolute; top:4px; right:4px; width:10px; height:10px;
          border-top:1px solid; border-right:1px solid; animation: corner-pulse 3s ease-in-out infinite 0.5s; }
        .corner-bl { position:absolute; bottom:4px; left:4px; width:10px; height:10px;
          border-bottom:1px solid; border-left:1px solid; animation: corner-pulse 3s ease-in-out infinite 1s; }
        .corner-br { position:absolute; bottom:4px; right:4px; width:10px; height:10px;
          border-bottom:1px solid; border-right:1px solid; animation: corner-pulse 3s ease-in-out infinite 1.5s; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <header
        className="relative z-50 scanlines"
        style={{
          height: "48px",
          background: `linear-gradient(180deg, #0e0905 0%, #0a0704 100%)`,
          borderBottom: `1px solid ${C.border}`,
          boxShadow: `0 1px 0 0 ${C.accent}22, 0 4px 24px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Moving shimmer stripe */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: "60%", height: "100%",
            background: "linear-gradient(90deg, transparent 0%, rgba(196,154,20,0.025) 50%, transparent 100%)",
            animation: "hdr-shimmer 6s linear infinite",
            pointerEvents: "none", zIndex: 1,
          }}
        />
        {/* Top accent hairline */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "1px",
          background: `linear-gradient(90deg, transparent 0%, ${C.accentDim} 20%, ${C.accent} 50%, ${C.accentDim} 80%, transparent 100%)`,
          pointerEvents: "none", zIndex: 2,
        }} />
        {/* Bottom accent hairline */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
          background: `linear-gradient(90deg, transparent 0%, ${C.border} 30%, ${C.borderBright} 50%, ${C.border} 70%, transparent 100%)`,
          pointerEvents: "none", zIndex: 2,
        }} />

        {/* Row */}
        <div className="flex items-center h-full relative" style={{ zIndex: 3 }}>

          {/* ── LOGO ──────────────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 h-full flex-shrink-0"
            style={{
              padding: "0 18px",
              borderRight: `1px solid ${C.border}`,
              background: `linear-gradient(180deg, rgba(196,154,20,0.04) 0%, transparent 100%)`,
              minWidth: "176px",
            }}
          >
            <button
              className="md:hidden"
              style={{ color: C.textDim, lineHeight: 1 }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={15} /> : <Menu size={15} />}
            </button>

            {/* Icon badge */}
            <div
              style={{
                width: "28px", height: "28px",
                border: `1px solid ${C.accent}55`,
                background: `radial-gradient(circle at 50% 50%, ${C.accent}18 0%, transparent 70%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: `inset 0 0 8px ${C.accent}22, 0 0 12px ${C.accent}18`,
              }}
            >
              <Skull size={13} style={{ color: C.accent }} />
            </div>

            <div style={{ lineHeight: 1.2 }}>
              <div
                style={{
                  color: C.accent,
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.28em",
                  textShadow: `0 0 12px ${C.accent}66`,
                }}
              >
                DEAD SIGNAL
              </div>
              <div
                className="hidden sm:block"
                style={{ color: C.textFaint, fontSize: "6.5px", letterSpacing: "0.22em", marginTop: "1px" }}
              >
                HUMANITZ · OPS CENTER
              </div>
            </div>
          </div>

          {/* ── CLOCK ─────────────────────────────────────────────────────── */}
          <div
            className="hidden sm:flex flex-col justify-center h-full flex-shrink-0"
            style={{
              padding: "0 16px",
              borderRight: `1px solid ${C.border}`,
              minWidth: "140px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.012) 0%, transparent 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
              <span
                style={{
                  color: "#d4c8b4",
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  lineHeight: 1,
                  textShadow: "0 0 8px rgba(212,200,180,0.3)",
                }}
              >
                {timeStr}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
              <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: online ? C.green : C.red, boxShadow: `0 0 4px ${online ? C.green : C.red}` }} />
              <span style={{ color: C.textFaint, fontSize: "6.5px", letterSpacing: "0.18em" }}>
                {dateStr} · VANCOUVER
              </span>
            </div>
          </div>

          {/* ── COMMAND PALETTE ───────────────────────────────────────────── */}
          <div className="hidden md:flex items-center flex-1 h-full" style={{ padding: "0 16px" }}>
            <div
              style={{
                width: "100%",
                maxWidth: "580px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                border: `1px solid ${C.borderBright}`,
                background: "rgba(6,4,2,0.8)",
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.6)`,
              }}
            >
              {/* OPS tag */}
              <div
                style={{
                  padding: "0 10px",
                  height: "100%",
                  display: "flex", alignItems: "center", gap: "5px",
                  borderRight: `1px solid ${C.border}`,
                  flexShrink: 0,
                  background: `${C.accent}0a`,
                }}
              >
                <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: C.green, boxShadow: `0 0 5px ${C.green}` }} />
                <span style={{ color: C.accentDim, fontSize: "6.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.22em" }}>
                  TERMINAL
                </span>
              </div>

              {/* Input */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <HeaderCommandPrompt currentPageName={currentPageName} inGameTime={inGameTime} />
              </div>

              {/* Hint */}
              <div
                className="hidden lg:flex"
                style={{
                  padding: "0 10px",
                  height: "100%",
                  alignItems: "center",
                  borderLeft: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}
              >
                <span style={{ color: C.textFaint, fontSize: "6.5px", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.12em" }}>
                  ` TO OPEN
                </span>
              </div>
            </div>
          </div>

          {/* ── WORLD STATUS ──────────────────────────────────────────────── */}
          <div
            className="hidden xl:flex items-center h-full flex-shrink-0"
            style={{ borderLeft: `1px solid ${C.border}`, padding: "0 12px" }}
          >
            <WorldStatus weather={weather} />
          </div>

          {/* ── CONNECTIVITY ──────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 h-full flex-shrink-0"
            style={{
              borderLeft: `1px solid ${C.border}`,
              padding: "0 14px",
              background: online ? "rgba(57,255,20,0.025)" : "rgba(255,48,48,0.04)",
            }}
          >
            <motion.div
              animate={{ opacity: online ? [0.6, 1, 0.6] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: online ? C.green : C.red,
                boxShadow: `0 0 8px ${online ? C.green : C.red}88`,
              }}
            />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: online ? C.green : C.red, fontSize: "7px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em" }}>
                {online ? "LIVE" : "DISC"}
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <nav
          className={`nav-scroll fixed md:relative z-40 flex flex-col transition-transform duration-250 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{
            width: "200px",
            minHeight: "calc(100vh - 48px)",
            background: `linear-gradient(180deg, #09060400 0%, #0a0703 100%)`,
            borderRight: `1px solid ${C.border}`,
            boxShadow: `inset -1px 0 0 rgba(0,0,0,0.6), 2px 0 16px rgba(0,0,0,0.5)`,
            overflowY: "auto",
          }}
        >
          {/* Sidebar top bar */}
          <div
            style={{
              padding: "9px 14px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: `linear-gradient(180deg, rgba(196,154,20,0.04) 0%, transparent 100%)`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }}
              />
              <span style={{ color: C.textFaint, fontSize: "7.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.24em" }}>
                NAVIGATION
              </span>
            </div>
            <span style={{ color: C.textFaint, fontSize: "7px", letterSpacing: "0.1em" }}>
              {navSections.reduce((a, s) => a + s.items.length, 0)} MOD
            </span>
          </div>

          {/* Sections */}
          <div className="flex-1 py-1">
            {navSections.map((section, si) => (
              <div key={section.label}>
                {/* Section header */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: `${si === 0 ? "12px" : "16px"} 14px 6px`,
                  }}
                >
                  <span style={{ color: C.accentDim, fontSize: "6.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.28em", flexShrink: 0 }}>
                    {section.label}
                  </span>
                  <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${C.borderBright}, transparent)` }} />
                </div>

                {/* Items */}
                {section.items.map(({ label, page, icon: Icon, code, color, dot }) => {
                  const active = currentPageName === page;
                  return (
                    <motion.div key={page} whileHover={{ x: 1 }} transition={{ duration: 0.15 }}>
                      <Link
                        to={createPageUrl(page)}
                        onClick={() => setMobileOpen(false)}
                        className={`nav-link${active ? " active" : ""}`}
                        style={{
                          borderLeftColor: active ? color : "transparent",
                          background: active
                            ? `linear-gradient(90deg, ${color}12 0%, transparent 100%)`
                            : "transparent",
                        }}
                      >
                        {/* Active glow sweep */}
                        {active && (
                          <div style={{
                            position: "absolute", inset: 0,
                            background: `linear-gradient(90deg, ${color}10 0%, transparent 80%)`,
                            pointerEvents: "none",
                          }} />
                        )}

                        {/* Status dot */}
                        <div style={{
                          width: "4px", height: "4px", borderRadius: "50%", flexShrink: 0,
                          background: active ? dot : C.textFaint,
                          boxShadow: active ? `0 0 7px ${dot}` : "none",
                          transition: "all 0.2s",
                        }} />

                        {/* Icon */}
                        <Icon
                          size={11}
                          className="nav-icon"
                          style={{
                            flexShrink: 0,
                            color: active ? color : C.textFaint,
                            opacity: active ? 1 : 0.45,
                            transition: "color 0.2s, opacity 0.2s",
                            filter: active ? `drop-shadow(0 0 3px ${color}88)` : "none",
                          }}
                        />

                        {/* Label */}
                        <span
                          className="nav-label"
                          style={{
                            flex: 1,
                            color: active ? color : C.textDim,
                            fontSize: "9.5px",
                            letterSpacing: "0.08em",
                            transition: "color 0.2s",
                            textShadow: active ? `0 0 8px ${color}66` : "none",
                          }}
                        >
                          {label}
                        </span>

                        {/* Code */}
                        <span
                          className="nav-code"
                          style={{
                            color: active ? color : C.textFaint,
                            fontSize: "7px",
                            opacity: active ? 0.85 : 0,
                            fontFamily: "'Orbitron', monospace",
                            letterSpacing: "0.06em",
                            transition: "opacity 0.2s",
                          }}
                        >
                          {code}
                        </span>

                        {/* Active right tick */}
                        {active && (
                          <motion.div
                            layoutId="nav-active-tick"
                            style={{
                              position: "absolute", right: 0,
                              top: "20%", bottom: "20%",
                              width: "2px",
                              background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
                              boxShadow: `0 0 6px ${color}`,
                            }}
                          />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar footer */}
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              padding: "10px 14px",
              background: `linear-gradient(180deg, transparent, rgba(0,0,0,0.4))`,
              flexShrink: 0,
            }}
          >
            {/* Net status */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "5px 8px",
                border: `1px solid ${online ? C.green + "22" : C.red + "22"}`,
                background: online ? "rgba(57,255,20,0.03)" : "rgba(255,48,48,0.04)",
                marginBottom: "8px",
              }}
            >
              <motion.div
                animate={{ opacity: online ? [0.5, 1, 0.5] : 1 }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: "4px", height: "4px", borderRadius: "50%", background: online ? C.green : C.red, boxShadow: `0 0 5px ${online ? C.green : C.red}` }}
              />
              <span style={{ color: online ? C.green : C.red, fontSize: "7.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.16em" }}>
                {online ? "UPLINK ACTIVE" : "UPLINK LOST"}
              </span>
            </div>

            {/* Meta */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: C.textFaint, fontSize: "7px", letterSpacing: "0.12em" }}>BUILD</span>
              <span style={{ color: C.textDim, fontSize: "7px", fontFamily: "'Orbitron', monospace" }}>DS-ALPHA</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: C.textFaint, fontSize: "7px", letterSpacing: "0.12em" }}>VER</span>
              <span style={{ color: C.textDim, fontSize: "7px", fontFamily: "'Orbitron', monospace" }}>v1.0.0</span>
            </div>

            <div style={{ height: "1px", background: `linear-gradient(90deg, ${C.borderBright}, transparent)`, marginBottom: "7px" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Skull size={8} style={{ color: C.textFaint }} />
              <span style={{ color: C.textFaint, fontSize: "6.5px", letterSpacing: "0.14em" }}>DEAD SIGNAL PROTOCOL</span>
            </div>
          </div>
        </nav>

        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 md:hidden"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Page content */}
        <main
          className="flex-1 overflow-auto"
          style={{ background: "linear-gradient(160deg, #181a1c 0%, #111315 100%)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}