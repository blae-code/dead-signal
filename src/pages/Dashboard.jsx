import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Terminal, Users, Crosshair, Package, Radio, AlertTriangle, Activity, Skull, Zap } from "lucide-react";
import { T, PageHeader, Panel, StatGrid } from "@/components/ui/TerminalCard";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const STATUS_COLORS = { Pending: T.gold, Active: T.green, Complete: T.teal, Failed: T.red, Aborted: T.textDim };
const SEV_COLORS    = { INFO: T.textFaint, WARN: T.amber, ALERT: T.orange, CRITICAL: T.pink };
const ANN_COLORS    = { Emergency: T.pink, Intel: T.cyan, Ops: T.orange, General: T.teal, Maintenance: T.gold };

export default function Dashboard() {
  const [members,       setMembers]       = useState([]);
  const [missions,      setMissions]      = useState([]);
  const [items,         setItems]         = useState([]);
  const [events,        setEvents]        = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [user,          setUser]          = useState(null);
  const [myMember,      setMyMember]      = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.email) {
        base44.entities.ClanMember.filter({ user_email: u.email }, "-created_date", 1)
          .then(res => setMyMember(res?.[0] || null))
          .catch(() => {});
      }
    }).catch(() => {});
    base44.entities.ClanMember.list("-created_date", 20).then(setMembers).catch(() => {});
    base44.entities.Mission.list("-created_date", 20).then(setMissions).catch(() => {});
    base44.entities.InventoryItem.list("-created_date", 50).then(setItems).catch(() => {});
    base44.entities.ServerEvent.list("-created_date", 10).then(setEvents).catch(() => {});
    base44.entities.Announcement.list("-created_date", 5).then(setAnnouncements).catch(() => {});
  }, []);

  const activeMissions  = missions.filter(m => m.status === "Active").length;
  const activeMembers   = members.filter(m => m.status === "Active").length;
  const criticalEvents  = events.filter(e => e.severity === "CRITICAL" || e.severity === "ALERT").length;
  const totalItems      = items.reduce((a, i) => a + (i.quantity || 1), 0);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <PageHeader icon={Terminal} title="COMMAND HQ" color={T.amber}>
        <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.15em" }}>
          {user ? `OPERATOR: ${myMember?.callsign || user.full_name || user.email}` : "AUTHENTICATING..."}
        </span>
      </PageHeader>

      {/* Top stats */}
      <StatGrid stats={[
        { label: "ACTIVE OPS",       value: activeMissions, color: T.green,                                      sub: "missions running" },
        { label: "OPERATORS ONLINE", value: activeMembers,  color: T.teal,                                       sub: `of ${members.length} total` },
        { label: "ALERTS",           value: criticalEvents, color: criticalEvents > 0 ? T.pink : T.textFaint,    sub: criticalEvents > 0 ? "ACTION REQUIRED" : "all clear" },
        { label: "TOTAL INVENTORY",  value: totalItems,     color: T.gold,                                       sub: "items tracked" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left col: Missions + Announcements */}
        <div className="lg:col-span-2 space-y-4">

          {/* Active Missions */}
          <Panel title="ACTIVE MISSIONS" titleColor={T.red}
            headerRight={
              <Link to={createPageUrl("Missions")} className="text-xs" style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.1em", textDecoration: "none" }}>
                VIEW ALL →
              </Link>
            }>
            <div>
              {missions.filter(m => m.status === "Active" || m.status === "Pending").slice(0, 5).length === 0
                ? <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>// NO ACTIVE MISSIONS</div>
                : missions.filter(m => m.status === "Active" || m.status === "Pending").slice(0, 5).map((m, i) => (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-3 py-2 border-b" style={{ borderColor: T.border + "55" }}>
                    <span style={{ color: STATUS_COLORS[m.status], fontSize: "7px" }}>●</span>
                    <span className="text-xs flex-1 truncate" style={{ color: T.text }}>{m.title}</span>
                    <span className="text-xs px-1.5 py-0.5 border" style={{ borderColor: STATUS_COLORS[m.status] + "66", color: STATUS_COLORS[m.status], fontSize: "9px" }}>
                      {m.priority}
                    </span>
                    <span className="text-xs" style={{ color: STATUS_COLORS[m.status], fontSize: "9px" }}>{m.status}</span>
                  </motion.div>
                ))
              }
            </div>
          </Panel>

          {/* Recent Server Events */}
          <Panel title="SERVER FEED" titleColor={T.cyan}
            headerRight={
              <Link to={createPageUrl("ServerMonitor")} className="text-xs" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
                MONITOR →
              </Link>
            }>
            <div>
              {events.length === 0
                ? <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>// NO RECENT EVENTS</div>
                : events.slice(0, 6).map((ev, i) => (
                  <div key={ev.id} className="flex items-start gap-3 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                    <span className="text-xs flex-shrink-0 mt-0.5 px-1 border" style={{ color: SEV_COLORS[ev.severity] || T.textDim, borderColor: (SEV_COLORS[ev.severity] || T.textDim) + "44", fontSize: "8px" }}>
                      {ev.severity || "INFO"}
                    </span>
                    <span className="text-xs flex-1 truncate" style={{ color: T.textDim }}>{ev.message}</span>
                    {ev.player && <span className="text-xs flex-shrink-0" style={{ color: T.textFaint, fontSize: "9px" }}>{ev.player}</span>}
                  </div>
                ))
              }
            </div>
          </Panel>

          {/* Intel / Announcements */}
          <Panel title="LATEST INTEL" titleColor={T.amber}
            headerRight={
              <Link to={createPageUrl("Intel")} className="text-xs" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
                FULL FEED →
              </Link>
            }>
            <div>
              {announcements.length === 0
                ? <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>// NO TRANSMISSIONS</div>
                : announcements.slice(0, 3).map(a => (
                  <div key={a.id} className="px-3 py-2.5 border-b" style={{ borderColor: T.border + "44" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-1.5 border" style={{ color: ANN_COLORS[a.type] || T.amber, borderColor: (ANN_COLORS[a.type] || T.amber) + "55", fontSize: "9px" }}>
                        {a.type?.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold truncate" style={{ color: T.text }}>{a.title}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: T.textDim }}>{a.body}</p>
                  </div>
                ))
              }
            </div>
          </Panel>
        </div>

        {/* Right col: Roster + Quick links */}
        <div className="space-y-4">

          {/* Clan Roster snapshot */}
          <Panel title="ROSTER STATUS" titleColor={T.green}
            headerRight={
              <Link to={createPageUrl("ClanRoster")} className="text-xs" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
                FULL ROSTER →
              </Link>
            }>
            <div>
              {members.length === 0
                ? <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>// NO OPERATORS</div>
                : members.slice(0, 8).map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
                    <span style={{ color: m.status === "Active" ? T.green : T.textFaint, fontSize: "7px" }}>●</span>
                    <span className="text-xs flex-1 truncate" style={{ color: T.text }}>{m.callsign}</span>
                    <span className="text-xs" style={{ color: T.textDim, fontSize: "9px" }}>{m.role}</span>
                  </div>
                ))
              }
            </div>
          </Panel>

          {/* Quick nav modules */}
          <Panel title="MODULES">
            <div className="grid grid-cols-2 gap-px" style={{ background: T.border }}>
              {[
                { label: "TACTICAL MAP",  page: "TacticalMap",   icon: Activity, color: T.cyan },
                { label: "INVENTORY",     page: "Inventory",      icon: Package,  color: T.green },
                { label: "SERVER",        page: "ServerMonitor",  icon: Zap,      color: T.cyan },
                { label: "AI AGENT",      page: "AIAgent",        icon: Skull,    color: T.green },
              ].map(({ label, page, icon: Icon, color }) => (
                <Link key={page} to={createPageUrl(page)}
                  className="flex flex-col items-center justify-center gap-2 py-4 transition-opacity hover:opacity-80"
                  style={{ background: T.bg1, textDecoration: "none" }}>
                  <Icon size={16} style={{ color }} />
                  <span className="text-xs tracking-widest text-center" style={{ color: T.textDim, fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>{label}</span>
                </Link>
              ))}
            </div>
          </Panel>

          {/* Inventory summary */}
          <Panel title="INVENTORY SNAPSHOT" titleColor={T.amber}>
            <div className="p-3 space-y-2">
              {["Weapon", "Ammo", "Medical", "Food"].map(cat => {
                const count = items.filter(i => i.category === cat).reduce((a, i) => a + (i.quantity || 1), 0);
                const max   = Math.max(...["Weapon","Ammo","Medical","Food"].map(c => items.filter(i => i.category === c).reduce((a,i) => a + (i.quantity||1), 0)), 1);
                return (
                  <div key={cat}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>{cat.toUpperCase()}</span>
                      <span className="text-xs" style={{ color: T.textDim, fontSize: "9px" }}>×{count}</span>
                    </div>
                    <div className="progress-bar-terminal">
                      <div className="progress-bar-terminal-fill" style={{ width: `${(count / max) * 100}%`, background: cat === "Weapon" ? T.red : cat === "Ammo" ? T.orange : cat === "Medical" ? "#ff5555" : T.green }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}