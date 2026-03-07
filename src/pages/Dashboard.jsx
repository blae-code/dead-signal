import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Terminal, Users, Crosshair, Package, Map, Radio, AlertTriangle, ChevronRight, Activity } from "lucide-react";

const ASCII_BANNER = `
██████╗ ███████╗ █████╗ ██████╗      ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ██╗     
██╔══██╗██╔════╝██╔══██╗██╔══██╗     ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗██║     
██║  ██║█████╗  ███████║██║  ██║     ███████╗██║██║  ███╗██╔██╗ ██║███████║██║     
██║  ██║██╔══╝  ██╔══██║██║  ██║     ╚════██║██║██║   ██║██║╚██╗██║██╔══██║██║     
██████╔╝███████╗██║  ██║██████╔╝     ███████║██║╚██████╔╝██║ ╚████║██║  ██║███████╗
╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝      ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝`;

const quickLinks = [
  { label: "SERVER MONITOR", page: "ServerMonitor", icon: Terminal, color: "#39ff14", desc: "Live telemetry & RCON" },
  { label: "TACTICAL MAP", page: "TacticalMap", icon: Map, color: "#00e5ff", desc: "Clan sync map" },
  { label: "CLAN ROSTER", page: "ClanRoster", icon: Users, color: "#ffb000", desc: "Squad management" },
  { label: "MISSIONS", page: "Missions", icon: Crosshair, color: "#ff2020", desc: "Active operations" },
  { label: "INVENTORY", page: "Inventory", icon: Package, color: "#39ff14", desc: "Gear tracking" },
  { label: "INTEL FEED", page: "Intel", icon: Radio, color: "#ffb000", desc: "Announcements & logs" },
  { label: "AI AGENT", page: "AIAgent", icon: AlertTriangle, color: "#00e5ff", desc: "Crafting & wiki AI" },
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [bootLines, setBootLines] = useState([]);

  const BOOT_SEQUENCE = [
    "> INITIALIZING DEAD SIGNAL v1.0...",
    "> CHECKING UPLINK STATUS............[OK]",
    "> LOADING CLAN DATABASE..............[OK]",
    "> SYNCING TACTICAL MAP...............[OK]",
    "> CONNECTING TO HUMANITZ SERVER......[OK]",
    "> ALL SYSTEMS NOMINAL. STAY FROSTY.",
  ];

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Announcement.list("-created_date", 5).then(setAnnouncements).catch(() => {});
    base44.entities.ServerEvent.list("-created_date", 8).then(setEvents).catch(() => {});
    base44.entities.ClanMember.list("-updated_date", 10).then(setMembers).catch(() => {});
    base44.entities.Mission.filter({ status: "Active" }, "-created_date", 5).then(setMissions).catch(() => {});

    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_SEQUENCE.length) {
        setBootLines(prev => [...prev, BOOT_SEQUENCE[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const activeMembers = members.filter(m => m.status === "Active").length;
  const activeMissions = missions.length;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* ASCII Banner */}
      <div className="hidden lg:block overflow-x-auto">
        <pre className="text-xs leading-tight" style={{ color: "#39ff14", opacity: 0.6, fontFamily: "'Share Tech Mono', monospace", fontSize: "7px" }}>
          {ASCII_BANNER}
        </pre>
      </div>
      <div className="lg:hidden text-center py-2">
        <span className="text-lg font-bold tracking-widest glow-green" style={{ color: "#39ff14", fontFamily: "'Orbitron', monospace" }}>☠ DEAD SIGNAL</span>
      </div>

      {/* Boot sequence */}
      <div className="terminal-card p-3 border" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
        {bootLines.map((line, i) => (
          <div key={i} className="text-xs" style={{ color: i === bootLines.length - 1 ? "#ffb000" : "#39ff1488", fontFamily: "'Share Tech Mono', monospace" }}>
            {line}
          </div>
        ))}
        {bootLines.length < BOOT_SEQUENCE.length && (
          <div className="text-xs cursor-blink" style={{ color: "#39ff14" }}> </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ACTIVE OPERATORS", value: activeMembers, color: "#39ff14" },
          { label: "ACTIVE MISSIONS", value: activeMissions, color: "#ff2020" },
          { label: "MAP PINS", value: "—", color: "#00e5ff" },
          { label: "SERVER STATUS", value: "ONLINE", color: "#39ff14" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border p-3" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="text-xs mb-1" style={{ color: "#39ff1455", letterSpacing: "0.1em" }}>{label}</div>
            <div className="text-xl font-bold" style={{ color, fontFamily: "'Orbitron', monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick nav grid */}
      <div>
        <div className="text-xs mb-3" style={{ color: "#39ff1466", letterSpacing: "0.2em" }}>// QUICK ACCESS</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickLinks.map(({ label, page, icon: Icon, color, desc }) => (
            <Link key={page} to={createPageUrl(page)}
              className="border p-4 flex flex-col gap-2 hover:border-green-500 transition-all duration-200 group"
              style={{ borderColor: "#1e3a1e", background: "#060606", textDecoration: "none" }}>
              <Icon size={18} style={{ color }} />
              <div className="text-xs font-bold" style={{ color, letterSpacing: "0.1em" }}>{label}</div>
              <div className="text-xs" style={{ color: "#39ff1444" }}>{desc}</div>
              <ChevronRight size={10} className="self-end" style={{ color: "#39ff1433" }} />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent announcements */}
        <div className="border p-3" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: "#1e3a1e" }}>
            <Radio size={12} style={{ color: "#ffb000" }} />
            <span className="text-xs font-bold tracking-widest" style={{ color: "#ffb000" }}>INTEL FEED</span>
          </div>
          {announcements.length === 0
            ? <div className="text-xs" style={{ color: "#39ff1433" }}>// NO BROADCASTS ON RECORD</div>
            : announcements.map(a => (
              <div key={a.id} className="mb-2 pb-2 border-b" style={{ borderColor: "#0f1f0f" }}>
                <div className="text-xs font-bold" style={{ color: a.type === "Emergency" ? "#ff2020" : "#ffb000" }}>[{a.type?.toUpperCase()}] {a.title}</div>
                <div className="text-xs mt-1" style={{ color: "#39ff1488" }}>{a.body?.slice(0, 80)}{a.body?.length > 80 ? "..." : ""}</div>
              </div>
            ))
          }
        </div>

        {/* Event log */}
        <div className="border p-3" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: "#1e3a1e" }}>
            <Activity size={12} style={{ color: "#39ff14" }} />
            <span className="text-xs font-bold tracking-widest" style={{ color: "#39ff14" }}>EVENT LOG</span>
          </div>
          {events.length === 0
            ? <div className="text-xs" style={{ color: "#39ff1433" }}>// NO EVENTS LOGGED</div>
            : events.map(e => {
              const color = e.severity === "CRITICAL" ? "#ff2020" : e.severity === "ALERT" ? "#ffb000" : e.severity === "WARN" ? "#ffb000" : "#39ff1488";
              return (
                <div key={e.id} className="text-xs mb-1" style={{ color }}>
                  <span style={{ color: "#39ff1444" }}>[{new Date(e.created_date).toLocaleTimeString("en-US", { hour12: false })}]</span>
                  {" "}{e.message}
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}