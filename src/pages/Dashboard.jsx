import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Terminal, Users, Crosshair, Package, Map, Radio,
  AlertTriangle, ChevronRight, Activity, Skull, Shield,
  Zap, Eye, Clock
} from "lucide-react";

const ASCII_BANNER = `
██████╗ ███████╗ █████╗ ██████╗     ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ██╗     
██╔══██╗██╔════╝██╔══██╗██╔══██╗    ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗██║     
██║  ██║█████╗  ███████║██║  ██║    ███████╗██║██║  ███╗██╔██╗ ██║███████║██║     
██║  ██║██╔══╝  ██╔══██║██║  ██║    ╚════██║██║██║   ██║██║╚██╗██║██╔══██║██║     
██████╔╝███████╗██║  ██║██████╔╝    ███████║██║╚██████╔╝██║ ╚████║██║  ██║███████╗
╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝    ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝`;

const quickLinks = [
  { label: "SERVER MONITOR", page: "ServerMonitor", icon: Terminal, color: "#39ff14", desc: "Live telemetry & RCON", tag: "SRV" },
  { label: "TACTICAL MAP", page: "TacticalMap", icon: Map, color: "#00e5ff", desc: "Clan sync map & pins", tag: "MAP" },
  { label: "CLAN ROSTER", page: "ClanRoster", icon: Users, color: "#ffb000", desc: "Squad management", tag: "OPS" },
  { label: "MISSIONS", page: "Missions", icon: Crosshair, color: "#ff2020", desc: "Active operations", tag: "MIS" },
  { label: "INVENTORY", page: "Inventory", icon: Package, color: "#39ff14", desc: "Gear & stash tracking", tag: "INV" },
  { label: "INTEL FEED", page: "Intel", icon: Radio, color: "#ffb000", desc: "Announcements & logs", tag: "INT" },
  { label: "AI AGENT", page: "AIAgent", icon: AlertTriangle, color: "#00e5ff", desc: "Crafting & wiki AI", tag: "AI" },
];

const SEV_COLOR = { CRITICAL: "#ff2020", ALERT: "#ff8000", WARN: "#ffb000", INFO: "#39ff1488" };
const TYPE_ICON = { Emergency: "⚠", Intel: "◈", Ops: "⊕", General: "◇", Maintenance: "⚙" };

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [mapPins, setMapPins] = useState([]);
  const [bootLines, setBootLines] = useState([]);
  const [bootDone, setBootDone] = useState(false);
  const [tick, setTick] = useState(0);

  const BOOT_SEQUENCE = [
    { text: "> INITIALIZING DEAD SIGNAL v1.0...", delay: 0 },
    { text: "> AUTHENTICATING OPERATOR CREDENTIALS...[OK]", delay: 280 },
    { text: "> LOADING CLAN DATABASE.....................[OK]", delay: 560 },
    { text: "> ESTABLISHING SERVER UPLINK................[OK]", delay: 840 },
    { text: "> SYNCING TACTICAL MAP......................[OK]", delay: 1120 },
    { text: "> MISSION BOARD ONLINE......................[OK]", delay: 1400 },
    { text: "> ─────────────────────────────────────────────", delay: 1650 },
    { text: "> ALL SYSTEMS NOMINAL. STAY FROSTY. GOOD LUCK.", delay: 1900 },
  ];

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Announcement.list("-created_date", 5).then(setAnnouncements).catch(() => {});
    base44.entities.ServerEvent.list("-created_date", 10).then(setEvents).catch(() => {});
    base44.entities.ClanMember.list("-updated_date", 20).then(setMembers).catch(() => {});
    base44.entities.Mission.filter({ status: "Active" }, "-created_date", 5).then(setMissions).catch(() => {});
    base44.entities.MapPin.list("-created_date", 50).then(setMapPins).catch(() => {});

    BOOT_SEQUENCE.forEach(({ text, delay }, i) => {
      setTimeout(() => {
        setBootLines(prev => [...prev, { text, isFinal: i === BOOT_SEQUENCE.length - 1 }]);
        if (i === BOOT_SEQUENCE.length - 1) setBootDone(true);
      }, delay);
    });

    const tickInterval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(tickInterval);
  }, []);

  const activeMembers = members.filter(m => m.status === "Active").length;
  const activeMissions = missions.length;
  const activeMapPins = mapPins.filter(p => p.status !== "Looted" && p.status !== "Cleared").length;

  const stats = [
    { label: "ACTIVE OPERATORS", value: activeMembers, color: "#39ff14", icon: Users, sub: `of ${members.length} total` },
    { label: "ACTIVE MISSIONS", value: activeMissions, color: "#ff2020", icon: Crosshair, sub: "operations ongoing" },
    { label: "MAP PINS", value: activeMapPins, color: "#00e5ff", icon: Map, sub: "tactical markers" },
    { label: "SERVER STATUS", value: "ONLINE", color: "#39ff14", icon: Activity, sub: "uplink nominal" },
  ];

  return (
    <div className="p-4 space-y-5 max-w-7xl mx-auto">
      <style>{`
        @keyframes stat-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes card-hover-glow {
          from { box-shadow: none; }
          to { box-shadow: 0 0 12px rgba(57,255,20,0.15); }
        }
        .quick-card:hover {
          border-color: rgba(57,255,20,0.4) !important;
          background: #0a1a0a !important;
        }
        .quick-card:hover .quick-icon {
          filter: drop-shadow(0 0 6px currentColor);
        }
        .stat-card-online {
          animation: stat-pulse 3s ease-in-out infinite;
        }
      `}</style>

      {/* ASCII Banner */}
      <div className="hidden lg:block overflow-x-auto border-b pb-4" style={{ borderColor: "#0f1f0f" }}>
        <pre style={{ color: "#39ff14", opacity: 0.45, fontFamily: "'Share Tech Mono', monospace", fontSize: "6.5px", lineHeight: "1.2", margin: 0 }}>
          {ASCII_BANNER}
        </pre>
        <div className="flex items-center gap-4 mt-2">
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, #39ff14, transparent)" }} />
          <span style={{ color: "#39ff1444", fontSize: "9px", letterSpacing: "0.3em" }}>HUMANITZ SERVER OPERATIONS CENTER</span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(270deg, #39ff14, transparent)" }} />
        </div>
      </div>
      <div className="lg:hidden flex items-center gap-3 py-1">
        <Skull size={16} style={{ color: "#39ff14", filter: "drop-shadow(0 0 4px #39ff14)" }} />
        <span className="text-base font-bold tracking-widest" style={{ color: "#39ff14", fontFamily: "'Orbitron', monospace", textShadow: "0 0 8px rgba(57,255,20,0.6)" }}>DEAD SIGNAL</span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, #39ff14, transparent)", opacity: 0.3 }} />
      </div>

      {/* Boot sequence */}
      <div className="border relative overflow-hidden" style={{ borderColor: "#1a2e1a", background: "#040404" }}>
        <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: "#1a2e1a" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: bootDone ? "#39ff14" : "#ffb000", boxShadow: `0 0 6px ${bootDone ? "#39ff14" : "#ffb000"}` }} />
          <span style={{ color: "#39ff1466", fontSize: "9px", letterSpacing: "0.2em" }}>SYSTEM INITIALIZATION LOG</span>
          <div className="ml-auto" style={{ color: "#39ff1433", fontSize: "9px" }}>
            {bootDone ? "[ READY ]" : "[ LOADING... ]"}
          </div>
        </div>
        <div className="px-3 py-2 space-y-0.5">
          {bootLines.map((line, i) => (
            <div key={i} className="text-xs" style={{
              color: line.isFinal ? "#ffb000" : i === bootLines.length - 1 && !bootDone ? "#39ff14" : "#39ff1866",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "11px",
              fontWeight: line.isFinal ? "bold" : "normal",
              textShadow: line.isFinal ? "0 0 8px rgba(255,176,0,0.5)" : "none",
            }}>
              {line.text}
            </div>
          ))}
          {!bootDone && (
            <div style={{ color: "#39ff14", fontSize: "11px" }} className="cursor-blink"> </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} className="border relative overflow-hidden group" style={{ borderColor: "#1a2e1a", background: "#040404" }}>
            {/* Top accent line */}
            <div style={{ height: "2px", background: `linear-gradient(90deg, ${color}66, transparent)` }} />
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: "#39ff1444", fontSize: "9px", letterSpacing: "0.15em" }}>{label}</span>
                <Icon size={10} style={{ color: `${color}66` }} />
              </div>
              <div style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: "bold", lineHeight: 1, textShadow: `0 0 12px ${color}44` }}
                className={value === "ONLINE" ? "stat-card-online" : ""}>
                {value}
              </div>
              <div style={{ color: "#39ff1433", fontSize: "9px", marginTop: "4px", letterSpacing: "0.05em" }}>{sub}</div>
            </div>
            {/* Corner decoration */}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "12px", height: "12px", borderTop: `1px solid ${color}33`, borderLeft: `1px solid ${color}33` }} />
          </div>
        ))}
      </div>

      {/* Quick nav grid */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <Eye size={11} style={{ color: "#39ff1466" }} />
          <span style={{ color: "#39ff1455", fontSize: "9px", letterSpacing: "0.25em" }}>// QUICK ACCESS MODULES</span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, #1e3a1e, transparent)" }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickLinks.map(({ label, page, icon: Icon, color, desc, tag }) => (
            <Link key={page} to={createPageUrl(page)}
              className="quick-card border flex flex-col gap-2 relative overflow-hidden transition-all duration-200"
              style={{ borderColor: "#1a2e1a", background: "#040404", textDecoration: "none", padding: "14px" }}>
              {/* Top accent */}
              <div style={{ height: "1px", background: `linear-gradient(90deg, ${color}44, transparent)`, position: "absolute", top: 0, left: 0, right: 0 }} />
              <div className="flex items-center justify-between">
                <Icon size={16} className="quick-icon" style={{ color }} />
                <span style={{ color: "#39ff1422", fontSize: "8px", letterSpacing: "0.1em", fontFamily: "'Orbitron', monospace" }}>{tag}</span>
              </div>
              <div style={{ color, fontSize: "10px", fontWeight: "bold", letterSpacing: "0.12em" }}>{label}</div>
              <div style={{ color: "#39ff1433", fontSize: "9px", lineHeight: 1.4 }}>{desc}</div>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span style={{ color: "#39ff1422", fontSize: "8px" }}>ACCESS</span>
                <ChevronRight size={9} style={{ color: "#39ff1433" }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Intel Feed */}
        <div className="border" style={{ borderColor: "#1a2e1a", background: "#040404" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "#1a2e1a" }}>
            <Radio size={11} style={{ color: "#ffb000", filter: "drop-shadow(0 0 3px #ffb000)" }} />
            <span style={{ color: "#ffb000", fontSize: "10px", fontWeight: "bold", letterSpacing: "0.2em" }}>INTEL FEED</span>
            {announcements.length > 0 && (
              <span className="ml-auto" style={{ color: "#ffb00066", fontSize: "9px" }}>{announcements.length} ITEM{announcements.length !== 1 ? "S" : ""}</span>
            )}
          </div>
          <div className="p-3 space-y-2">
            {announcements.length === 0
              ? <div style={{ color: "#39ff1422", fontSize: "10px" }}>// NO BROADCASTS ON RECORD</div>
              : announcements.map(a => (
                <div key={a.id} className="pb-2 border-b last:border-0" style={{ borderColor: "#0f1f0f" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: "#39ff1433", fontSize: "9px" }}>{TYPE_ICON[a.type] || "◇"}</span>
                    <span style={{ color: "#39ff1444", fontSize: "8px", letterSpacing: "0.1em" }}>[{a.type?.toUpperCase()}]</span>
                    {a.pinned && <span style={{ color: "#ffb00066", fontSize: "8px" }}>📌</span>}
                  </div>
                  <div style={{ color: a.type === "Emergency" ? "#ff2020" : "#ffb000", fontSize: "10px", fontWeight: "bold", lineHeight: 1.3 }}>
                    {a.title}
                  </div>
                  <div style={{ color: "#39ff1477", fontSize: "9px", marginTop: "3px", lineHeight: 1.5 }}>
                    {a.body?.slice(0, 90)}{a.body?.length > 90 ? "..." : ""}
                  </div>
                  {a.posted_by && (
                    <div style={{ color: "#39ff1433", fontSize: "8px", marginTop: "3px" }}>— {a.posted_by}</div>
                  )}
                </div>
              ))
            }
          </div>
        </div>

        {/* Event log */}
        <div className="border" style={{ borderColor: "#1a2e1a", background: "#040404" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "#1a2e1a" }}>
            <Activity size={11} style={{ color: "#39ff14", filter: "drop-shadow(0 0 3px #39ff14)" }} />
            <span style={{ color: "#39ff14", fontSize: "10px", fontWeight: "bold", letterSpacing: "0.2em" }}>EVENT LOG</span>
            <span className="ml-auto" style={{ color: "#39ff1433", fontSize: "9px" }}>LIVE</span>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#39ff14", boxShadow: "0 0 4px #39ff14", animation: "stat-pulse 1.5s infinite" }} />
          </div>
          <div className="p-3 space-y-1.5">
            {events.length === 0
              ? <div style={{ color: "#39ff1422", fontSize: "10px" }}>// NO EVENTS LOGGED</div>
              : events.map(e => {
                const color = SEV_COLOR[e.severity] || "#39ff1488";
                return (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <span style={{ color: "#39ff1433", flexShrink: 0, fontSize: "9px" }}>
                      [{new Date(e.created_date).toLocaleTimeString("en-US", { hour12: false })}]
                    </span>
                    <span style={{ color: `${color}`, fontSize: "8px", flexShrink: 0, letterSpacing: "0.05em" }}>[{e.severity}]</span>
                    <span style={{ color: "#39ff1499", fontSize: "9px", lineHeight: 1.4 }}>{e.message}</span>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>

      {/* Active missions strip */}
      {missions.length > 0 && (
        <div className="border" style={{ borderColor: "#2a0a0a", background: "#080404" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "#2a0a0a" }}>
            <Crosshair size={11} style={{ color: "#ff2020" }} />
            <span style={{ color: "#ff2020", fontSize: "10px", fontWeight: "bold", letterSpacing: "0.2em" }}>ACTIVE OPERATIONS</span>
            <div className="ml-auto flex items-center gap-2">
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ff2020", animation: "stat-pulse 0.8s infinite" }} />
              <span style={{ color: "#ff202066", fontSize: "9px" }}>{missions.length} ACTIVE</span>
            </div>
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {missions.map(m => (
              <div key={m.id} className="flex items-start gap-2 border p-2" style={{ borderColor: "#2a0a0a", background: "#050202" }}>
                <Shield size={10} style={{ color: "#ff2020", marginTop: "1px", flexShrink: 0 }} />
                <div>
                  <div style={{ color: "#ff8080", fontSize: "9px", fontWeight: "bold", letterSpacing: "0.1em" }}>{m.title}</div>
                  {m.objective_coords && (
                    <div style={{ color: "#ff202055", fontSize: "8px", marginTop: "2px" }}>GRID: {m.objective_coords}</div>
                  )}
                </div>
                <span className="ml-auto" style={{
                  color: m.priority === "Critical" ? "#ff2020" : "#ff8000",
                  fontSize: "8px", letterSpacing: "0.05em",
                }}>{m.priority?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}