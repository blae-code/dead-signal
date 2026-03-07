import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Radio, Map, Users, Package, Cpu, Crosshair,
  AlertTriangle, Terminal, Menu, X, Wifi, WifiOff, ChevronRight,
  Shield, Activity, Skull
} from "lucide-react";

const navItems = [
  { label: "COMMAND", page: "Dashboard", icon: Terminal, desc: "HQ" },
  { label: "SERVER", page: "ServerMonitor", icon: Cpu, desc: "SRV" },
  { label: "TACTICAL MAP", page: "TacticalMap", icon: Map, desc: "MAP" },
  { label: "CLAN ROSTER", page: "ClanRoster", icon: Users, desc: "OPS" },
  { label: "MISSIONS", page: "Missions", icon: Crosshair, desc: "MIS" },
  { label: "INVENTORY", page: "Inventory", icon: Package, desc: "INV" },
  { label: "INTEL", page: "Intel", icon: Radio, desc: "INT" },
  { label: "AI AGENT", page: "AIAgent", icon: AlertTriangle, desc: "AI" },
];

const THREAT_LEVELS = [
  { label: "SECURE", color: "#39ff14" },
  { label: "ELEVATED", color: "#ffb000" },
  { label: "CRITICAL", color: "#ff2020" },
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [threatLevel] = useState(0); // 0=secure, 1=elevated, 2=critical
  const [uplinkPulse, setUplinkPulse] = useState(true);
  const [sidebarCollapsed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const pulse = setInterval(() => setUplinkPulse(p => !p), 1800);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(t);
      clearInterval(pulse);
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
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(57,255,20,0.8); }
          50% { opacity: 0.4; box-shadow: 0 0 2px rgba(57,255,20,0.2); }
        }
        @keyframes threat-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes sidebar-glow {
          0%, 100% { box-shadow: inset 0 0 20px rgba(57,255,20,0.02); }
          50% { box-shadow: inset 0 0 20px rgba(57,255,20,0.05); }
        }
        @keyframes header-scan {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .nav-item-hover:hover {
          background: #0a1a0a !important;
          color: #39ff14 !important;
          border-left-color: #39ff1466 !important;
        }
        .nav-item-hover:hover .nav-badge {
          opacity: 1 !important;
        }
      `}</style>

      {/* Top bar */}
      <header
        className="border-b flex items-center justify-between px-4 py-2 z-50 relative overflow-hidden"
        style={{ borderColor: "#1e3a1e", background: "#050505" }}
      >
        {/* Subtle scan line on header */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(90deg, transparent 0%, rgba(57,255,20,0.02) 50%, transparent 100%)",
          animation: "header-scan 8s linear infinite",
          backgroundSize: "200% 100%",
        }} />

        <div className="flex items-center gap-3 relative">
          <button className="md:hidden" style={{ color: "#39ff14" }} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-3">
            <Skull size={14} style={{ color: "#39ff14", filter: "drop-shadow(0 0 4px #39ff14)" }} />
            <span className="font-bold tracking-widest" style={{ color: "#39ff14", fontFamily: "'Orbitron', monospace", fontSize: "11px", textShadow: "0 0 8px rgba(57,255,20,0.6)" }}>
              DEAD SIGNAL
            </span>
            <span style={{ color: "#1e3a1e" }}>|</span>
            <span className="hidden sm:block text-xs" style={{ color: "#39ff14", opacity: 0.4, letterSpacing: "0.15em" }}>HUMANITZ OPS CENTER</span>
          </div>
        </div>

        {/* Center: Threat level */}
        <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <Shield size={11} style={{ color: threat.color }} />
          <span className="text-xs font-bold tracking-widest" style={{
            color: threat.color,
            fontFamily: "'Orbitron', monospace",
            fontSize: "9px",
            animation: threatLevel > 0 ? "threat-blink 1s infinite" : "none",
          }}>
            THREAT: {threat.label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs relative" style={{ color: "#39ff14" }}>
          <div className="hidden sm:flex flex-col items-end" style={{ lineHeight: 1.2 }}>
            <span style={{ color: "#39ff1466", fontSize: "9px", letterSpacing: "0.1em" }}>LOCAL TIME</span>
            <span style={{ color: "#ffb000", fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>{timeStr}</span>
          </div>
          <span className="hidden sm:block" style={{ color: "#1e3a1e" }}>|</span>
          <div className="hidden sm:flex flex-col items-end" style={{ lineHeight: 1.2 }}>
            <span style={{ color: "#39ff1466", fontSize: "9px", letterSpacing: "0.1em" }}>DATE</span>
            <span style={{ color: "#39ff1499", fontSize: "10px" }}>{dateStr}</span>
          </div>
          <span className="hidden sm:block" style={{ color: "#1e3a1e" }}>|</span>
          <div className="flex items-center gap-2">
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: online ? "#39ff14" : "#ff2020",
              animation: online ? "uplink-pulse 1.8s infinite" : "none",
            }} />
            {online
              ? <span className="hidden sm:block text-xs" style={{ color: "#39ff14", letterSpacing: "0.1em" }}>UPLINK ACTIVE</span>
              : <span className="hidden sm:block text-xs" style={{ color: "#ff2020", letterSpacing: "0.1em" }}>UPLINK LOST</span>
            }
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className={`fixed md:relative z-40 h-full flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{
            width: "200px",
            background: "#040404",
            borderRight: "1px solid #1a2e1a",
            minHeight: "calc(100vh - 41px)",
            animation: "sidebar-glow 6s ease-in-out infinite",
          }}
        >
          {/* Sidebar top label */}
          <div className="px-3 py-2 border-b" style={{ borderColor: "#1a2e1a" }}>
            <div className="flex items-center gap-2">
              <Activity size={9} style={{ color: "#39ff14", opacity: 0.5 }} />
              <span style={{ color: "#39ff14", opacity: 0.35, fontSize: "9px", letterSpacing: "0.2em" }}>// SYS.NAVIGATION</span>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex-1 py-1">
            {navItems.map(({ label, page, icon: Icon, desc }) => {
              const active = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  onClick={() => setMobileOpen(false)}
                  className="nav-item-hover flex items-center gap-3 px-3 py-2 text-xs transition-all duration-150 relative"
                  style={{
                    color: active ? "#39ff14" : "#39ff1455",
                    background: active ? "#0a1a0a" : "transparent",
                    borderLeft: active ? "2px solid #39ff14" : "2px solid transparent",
                    letterSpacing: "0.1em",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={12} style={{ flexShrink: 0, filter: active ? "drop-shadow(0 0 3px #39ff14)" : "none" }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  <span className="nav-badge text-xs" style={{
                    color: "#39ff1433",
                    fontSize: "8px",
                    opacity: active ? 0.6 : 0,
                    letterSpacing: "0.05em",
                    transition: "opacity 0.15s",
                  }}>{desc}</span>
                  {active && (
                    <div style={{
                      position: "absolute", right: 0, top: "20%", bottom: "20%",
                      width: "2px", background: "#39ff14",
                      boxShadow: "0 0 6px #39ff14",
                    }} />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Sidebar bottom status */}
          <div className="border-t" style={{ borderColor: "#1a2e1a" }}>
            <div className="px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span style={{ color: "#39ff1433", fontSize: "9px", letterSpacing: "0.1em" }}>BUILD</span>
                <span style={{ color: "#39ff1455", fontSize: "9px" }}>DS-ALPHA</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "#39ff1433", fontSize: "9px", letterSpacing: "0.1em" }}>VER</span>
                <span style={{ color: "#39ff1555", fontSize: "9px" }}>v1.0.0</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, #39ff14, transparent)" }} />
              </div>
              <div style={{ color: "#39ff1422", fontSize: "8px", letterSpacing: "0.1em" }}>
                ☠ DEAD SIGNAL PROTOCOL
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-black bg-opacity-80 md:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto" style={{ background: "#0a0a0a" }}>
          {children}
        </main>
      </div>
    </div>
  );
}