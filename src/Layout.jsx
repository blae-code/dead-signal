import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Radio, Map, Users, Package, Cpu, Crosshair,
  AlertTriangle, Terminal, Menu, X, Wifi, WifiOff, ChevronRight,
  Shield, Activity, Skull, Bot, Zap, Database, Cloud, CloudRain, Sun } from
"lucide-react";

// colour, short code, and section grouping per nav item
const navSections = [
{
  label: "// OPS CENTER",
  items: [
  { label: "COMMAND", page: "Dashboard", icon: Terminal, code: "HQ", color: "#c8c8c8", dot: "#39ff14" },
  { label: "SERVER", page: "ServerMonitor", icon: Cpu, code: "SRV", color: "#00e5ff", dot: "#00e5ff" }]

},
{
  label: "// FIELD OPS",
  items: [
  { label: "TACTICAL MAP", page: "TacticalMap", icon: Map, code: "MAP", color: "#ffb000", dot: "#ffb000" },
  { label: "CLAN ROSTER", page: "ClanRoster", icon: Users, code: "OPS", color: "#c8c8c8", dot: "#39ff14" },
  { label: "MISSIONS", page: "Missions", icon: Crosshair, code: "MIS", color: "#ff2020", dot: "#ff2020" }]

},
{
  label: "// LOGISTICS",
  items: [
  { label: "INVENTORY", page: "Inventory", icon: Package, code: "INV", color: "#c8c8c8", dot: "#666" },
  { label: "INTEL FEED", page: "Intel", icon: Radio, code: "INT", color: "#ffb000", dot: "#ffb000" },
  { label: "AI AGENT", page: "AIAgent", icon: Bot, code: "AI", color: "#39ff14", dot: "#39ff14" }]

}];


const THREAT_LEVELS = [
{ label: "SECURE", color: "#39ff14" },
{ label: "ELEVATED", color: "#ffb000" },
{ label: "CRITICAL", color: "#ff2020" }];


// Neutral chrome palette — no status colours
const C = {
  text: "#c8c8c8", // primary text
  textDim: "#666", // secondary / dim text
  textFaint: "#333", // very faint labels
  border: "#1e1e1e", // default border
  borderMid: "#2a2a2a", // slightly brighter border
  active: "#e0e0e0", // active nav item text
  activeBg: "#141414", // active nav item bg
  activeLine: "#888", // active left-bar accent
  accent: "#aaa", // logo / app name
  scan: "rgba(200,200,200,0.015)"
};

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [threatLevel] = useState(0); // 0=secure, 1=elevated, 2=critical

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

  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
  const threat = THREAT_LEVELS[threatLevel];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a", fontFamily: "'Share Tech Mono', monospace" }}>
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
        .nav-item-hover:hover {
          background: #111 !important;
        }
        .nav-item-hover:hover .nav-label {
          color: #e0e0e0 !important;
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
        style={{ borderColor: C.border, background: "#050505" }}>

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

        <div className="flex items-center gap-4 text-xs relative">
          <div className="hidden sm:flex flex-col items-end" style={{ lineHeight: 1.2 }}>
            <span style={{ color: C.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>LOCAL TIME</span>
            <span style={{ color: C.text, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>{timeStr}</span>
          </div>
          <span className="hidden sm:block" style={{ color: C.border }}>|</span>
          <div className="hidden sm:flex flex-col items-end" style={{ lineHeight: 1.2 }}>
            <span style={{ color: C.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>DATE</span>
            <span style={{ color: C.textDim, fontSize: "10px" }}>{dateStr}</span>
          </div>
          <span className="hidden sm:block" style={{ color: C.border }}>|</span>
          {/* Uplink status — retains status colours intentionally */}
          










        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className={`fixed md:relative z-40 h-full flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{
            width: "210px",
            background: "#030303",
            borderRight: `1px solid ${C.border}`,
            minHeight: "calc(100vh - 41px)"
          }}>

          {/* Sidebar top label */}
          <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: C.border, background: "#050505" }}>
            <div className="flex items-center gap-2">
              <Activity size={9} style={{ color: "#39ff14", animation: "nav-dot-pulse 2s infinite" }} />
              <span style={{ color: C.textFaint, fontSize: "9px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>SYS.NAV</span>
            </div>
            <span style={{ color: C.textFaint, fontSize: "8px" }}>{navSections.reduce((a, s) => a + s.items.length, 0)} MODULES</span>
          </div>

          {/* Nav sections */}
          <div className="flex-1 overflow-y-auto py-1">
            {navSections.map((section) =>
            <div key={section.label}>
                {/* Section divider */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.2em" }}>{section.label}</span>
                  <div style={{ flex: 1, height: "1px", background: C.border }} />
                </div>

                {section.items.map(({ label, page, icon: Icon, code, color, dot }) => {
                const active = currentPageName === page;
                return (
                  <Link
                    key={page}
                    to={createPageUrl(page)}
                    onClick={() => setMobileOpen(false)}
                    className="nav-item-hover flex items-center gap-2 px-3 py-2 text-xs transition-all duration-150 relative"
                    style={{
                      background: active ? "#0d0d0d" : "transparent",
                      borderLeft: active ? `2px solid ${color}` : "2px solid transparent",
                      letterSpacing: "0.08em",
                      textDecoration: "none"
                    }}>

                      {/* Status dot */}
                      <div style={{
                      width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                      background: active ? dot : C.textFaint,
                      boxShadow: active ? `0 0 6px ${dot}` : "none",
                      animation: active ? "nav-dot-pulse 2s infinite" : "none",
                      transition: "background 0.2s"
                    }} />

                      {/* Icon */}
                      <Icon
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
                    <div style={{
                      position: "absolute", right: 0, top: "15%", bottom: "15%",
                      width: "2px",
                      background: `linear-gradient(180deg, transparent, ${color}, transparent)`
                    }} />
                    }
                    </Link>);

              })}
              </div>
            )}
          </div>

          {/* Sidebar bottom */}
          <div className="border-t" style={{ borderColor: C.border, background: "#050505" }}>
            {/* Mini status row */}
            <div className="px-3 pt-2 pb-1 flex items-center gap-2 border-b" style={{ borderColor: C.border }}>
              <div style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: online ? "#39ff14" : "#ff2020",
                animation: online ? "nav-dot-pulse 1.8s infinite" : "none"
              }} />
              <span style={{ color: online ? "#39ff1488" : "#ff202088", fontSize: "8px", letterSpacing: "0.15em" }}>
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
                <Skull size={8} style={{ color: C.textFaint }} />
                <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.12em" }}>DEAD SIGNAL PROTOCOL</span>
              </div>
            </div>
          </div>
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