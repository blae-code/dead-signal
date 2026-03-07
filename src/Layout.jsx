import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Radio, Map, Users, Package, Cpu, Crosshair,
  AlertTriangle, Terminal, Menu, X, Wifi, WifiOff, ChevronRight
} from "lucide-react";

const navItems = [
  { label: "COMMAND", page: "Dashboard", icon: Terminal },
  { label: "SERVER", page: "ServerMonitor", icon: Cpu },
  { label: "TACTICAL MAP", page: "TacticalMap", icon: Map },
  { label: "CLAN ROSTER", page: "ClanRoster", icon: Users },
  { label: "MISSIONS", page: "Missions", icon: Crosshair },
  { label: "INVENTORY", page: "Inventory", icon: Package },
  { label: "INTEL", page: "Intel", icon: Radio },
  { label: "AI AGENT", page: "AIAgent", icon: AlertTriangle },
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { clearInterval(t); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a", fontFamily: "'Share Tech Mono', monospace" }}>
      {/* Top bar */}
      <header className="border-b flex items-center justify-between px-4 py-2 z-50" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
        <div className="flex items-center gap-3">
          <button className="md:hidden text-green-400" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest glow-green" style={{ color: "#39ff14", fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
              ☠ DEAD SIGNAL
            </span>
            <span className="text-xs hidden sm:block" style={{ color: "#1e3a1e" }}>|</span>
            <span className="text-xs hidden sm:block" style={{ color: "#39ff14", opacity: 0.5 }}>HUMANITZ OPS</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: "#39ff14", opacity: 0.7 }}>
          <span className="hidden sm:block">{dateStr}</span>
          <span className="font-bold" style={{ color: "#ffb000" }}>{timeStr}</span>
          <div className="flex items-center gap-1">
            {online
              ? <><Wifi size={12} style={{ color: "#39ff14" }} /><span className="hidden sm:block" style={{ color: "#39ff14" }}>UPLINK</span></>
              : <><WifiOff size={12} style={{ color: "#ff2020" }} /><span className="hidden sm:block" style={{ color: "#ff2020" }}>OFFLINE</span></>
            }
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          className={`fixed md:relative z-40 h-full flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{ width: "200px", background: "#060606", borderRight: "1px solid #1e3a1e", minHeight: "calc(100vh - 41px)" }}
        >
          <div className="p-3 border-b" style={{ borderColor: "#1e3a1e" }}>
            <div className="text-xs" style={{ color: "#39ff14", opacity: 0.4 }}>// NAVIGATION</div>
          </div>
          <div className="flex-1 py-2">
            {navItems.map(({ label, page, icon: Icon }) => {
              const active = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-xs transition-all duration-100 group"
                  style={{
                    color: active ? "#39ff14" : "#39ff1466",
                    background: active ? "#0f1f0f" : "transparent",
                    borderLeft: active ? "2px solid #39ff14" : "2px solid transparent",
                    letterSpacing: "0.1em",
                  }}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                  {active && <ChevronRight size={10} className="ml-auto" style={{ color: "#39ff14" }} />}
                </Link>
              );
            })}
          </div>
          <div className="p-3 border-t" style={{ borderColor: "#1e3a1e" }}>
            <div className="text-xs" style={{ color: "#39ff14", opacity: 0.25 }}>v1.0.0 // DS-ALPHA</div>
          </div>
        </nav>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-black bg-opacity-70 md:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto" style={{ background: "#0a0a0a" }}>
          {children}
        </main>
      </div>
    </div>
  );
}