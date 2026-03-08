import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, RefreshCw, AlertTriangle, Clock, Wifi, X, Activity, Users, Zap, Radio, Database, TrendingUp, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PerformanceCharts from "../components/server/PerformanceCharts";
import PerformanceForecast from "../components/server/PerformanceForecast";
import BottomConsoleDrawer from "../components/server/BottomConsoleDrawer";
import LiveUptime from "../components/server/LiveUptime";
import AlertRulesPanel from "../components/server/AlertRulesPanel";
import AlertHistoryPanel from "../components/server/AlertHistoryPanel";
import AdminToolsPanel from "../components/server/AdminToolsPanel";
import EventFeed from "../components/server/EventFeed";
import { T } from "@/components/ui/TerminalCard";

const pingColor  = (ms)  => ms === null ? T.textFaint : ms < 80 ? T.green : ms < 200 ? T.gold : T.red;
const lossColor  = (pct) => pct === 0 ? T.teal : pct < 33 ? T.orange : T.red;
const cpuColor   = (v)   => v > 80 ? T.red : v > 60 ? T.orange : T.green;
const ramColor   = (mb)  => { const p = mb / 32768 * 100; return p > 80 ? T.red : p > 60 ? T.orange : T.cyan; };

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, sub, color }) {
  return (
    <div
      className="relative flex flex-col gap-1.5 p-3 overflow-hidden"
      style={{
        border: `1px solid ${T.border}`,
        background: "linear-gradient(160deg, #1c1e21 0%, #14161a 100%)",
        boxShadow: `inset 0 1px 0 ${color}18`,
      }}
    >
      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />
      {/* Corner glow */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "20px", height: "20px", background: `radial-gradient(circle at 0 0, ${color}18, transparent 70%)` }} />

      <div className="flex items-center gap-1.5 relative">
        <Icon size={9} style={{ color: color + "99" }} />
        <span style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.2em", fontFamily: "'Orbitron', monospace" }}>{label}</span>
      </div>
      <div
        style={{
          color,
          fontFamily: "'Orbitron', monospace",
          fontSize: "14px",
          fontWeight: "bold",
          lineHeight: 1,
          textShadow: `0 0 12px ${color}66`,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.08em" }}>{sub}</div>
      )}
    </div>
  );
}

// ── Gauge bar ─────────────────────────────────────────────────────────────────
function GaugeBar({ label, value, max, unit, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.12em" }}>{label}</span>
        <span style={{ color, fontSize: "10px", fontFamily: "'Orbitron', monospace", textShadow: `0 0 6px ${color}66` }}>
          {typeof value === "number" ? value.toFixed(0) : value}{unit}
        </span>
      </div>
      <div style={{ height: "3px", background: "rgba(0,0,0,0.6)", border: `1px solid ${T.border}` }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: "7px", color: T.textFaint + "88" }}>0</div>
        <div style={{ fontSize: "7px", color: T.textFaint + "88" }}>{max}{unit}</div>
      </div>
    </div>
  );
}

// ── Status beacon ─────────────────────────────────────────────────────────────
function StatusBeacon({ online, loading }) {
  const color = loading ? T.textFaint : online ? T.green : T.red;
  return (
    <div className="flex items-center gap-2.5">
      <div style={{ position: "relative", width: "12px", height: "12px" }}>
        {online && !loading && (
          <motion.div
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.green }}
          />
        )}
        <div style={{
          position: "absolute", inset: "2px", borderRadius: "50%",
          background: color,
          boxShadow: loading ? "none" : `0 0 10px ${color}, 0 0 20px ${color}55`,
        }} />
      </div>
      <span style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "13px", fontWeight: "bold", letterSpacing: "0.08em", textShadow: `0 0 10px ${color}88` }}>
        {loading ? "POLLING..." : online ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}

export default function ServerMonitor() {
  const [events, setEvents]               = useState([]);
  const [consoleLines, setConsoleLines]   = useState([
    { text: "> DEAD SIGNAL TERMINAL v1.0", color: T.cyan },
    { text: "> Connected to HumanitZ ops center.", color: T.green },
    { text: "> Type HELP for available commands.", color: T.textFaint },
  ]);
  const [cmd, setCmd]                     = useState("");
  const [rconLoading, setRconLoading]     = useState(false);
  const [status, setStatus]               = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [logFilter, setLogFilter]         = useState("ALL");
  const [alertBanners, setAlertBanners]   = useState([]);
  const [alertRefreshTick, setAlertRefreshTick] = useState(0);
  const [rconHistory, setRconHistory]     = useState([]);
  const [lastPolled, setLastPolled]       = useState(null);
  const [downtimeAlert, setDowntimeAlert] = useState(false);
  const [showForecast, setShowForecast]   = useState(false);
  const [user, setUser]                   = useState(null);
  const prevOnlineRef                     = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await base44.functions.invoke('getServerStatus', {});
      if (res.data && !res.data.error) {
        const s = res.data;
        setStatus(s);
        setLastPolled(new Date().toLocaleTimeString("en-US", { hour12: false }));
        if (prevOnlineRef.current === true && s.online === false) {
          setDowntimeAlert(true);
          logEvent("Downtime", "Server went offline — downtime detected", "CRITICAL");
        }
        if (s.online === true) setDowntimeAlert(false);
        prevOnlineRef.current = s.online;
      }
    } catch (e) {}
    finally { setStatusLoading(false); }
  };

  useEffect(() => {
    base44.entities.ServerEvent.list("-created_date", 50).then(setEvents).catch(() => {});
    const unsub = base44.entities.ServerEvent.subscribe(ev => {
      if (ev.type === "create") setEvents(prev => [ev.data, ...prev.slice(0, 49)]);
    });
    base44.entities.RconHistory.list("-created_date", 50).then(setRconHistory).catch(() => {});
    const unsubH = base44.entities.RconHistory.subscribe(ev => {
      if (ev.type === "create") setRconHistory(prev => [ev.data, ...prev.slice(0, 49)]);
    });
    fetchStatus();
    const poll = setInterval(fetchStatus, 10000);
    return () => { unsub(); unsubH(); clearInterval(poll); };
  }, []);

  const handleCommand = async () => {
    if (!cmd.trim() || rconLoading) return;
    const raw = cmd.trim();
    const upper = raw.toUpperCase();
    setConsoleLines(prev => [...prev, { text: `> ${raw}`, color: T.cyan }]);
    setCmd("");
    if (upper === "HELP") {
      setConsoleLines(prev => [...prev,
        { text: "Commands are sent live via RCON.", color: T.textFaint },
        { text: "Examples: kick Player | say Hello | status | players | restart", color: T.textFaint },
        { text: "Type CLEAR to wipe console.", color: T.textFaint },
      ]);
      return;
    }
    if (upper === "CLEAR") {
      setConsoleLines([{ text: "> Console cleared.", color: T.textFaint }]);
      return;
    }
    setRconLoading(true);
    setConsoleLines(prev => [...prev, { text: "Sending to server...", color: T.textFaint }]);
    try {
      const res = await base44.functions.invoke('sendRconCommand', { command: raw });
      if (res.data?.success) {
        setConsoleLines(prev => [...prev, { text: `✓ ${res.data.output}`, color: T.green }]);
        await Promise.all([
          base44.entities.ServerEvent.create({ event_type: "Admin Action", message: `RCON: ${raw}`, severity: "WARN" }),
          base44.entities.RconHistory.create({ command: raw, output: res.data.output, success: true }),
        ]).catch(() => {});
      } else {
        setConsoleLines(prev => [...prev, { text: `✗ ${res.data?.error || "Unknown error"}`, color: T.red }]);
        base44.entities.RconHistory.create({ command: raw, output: res.data?.error || "Unknown error", success: false }).catch(() => {});
      }
    } catch (err) {
      setConsoleLines(prev => [...prev, { text: `✗ ${err.message}`, color: T.red }]);
    } finally {
      setRconLoading(false);
    }
  };

  const logEvent = async (type, msg, severity = "INFO") => {
    await base44.entities.ServerEvent.create({ event_type: type, message: msg, severity }).catch(() => {});
    setEvents(prev => [{ id: Date.now(), event_type: type, message: msg, severity, created_date: new Date().toISOString() }, ...prev]);
  };

  const handleTriggered = (triggered) => {
    const banners = triggered.map(t => ({
      id: Date.now() + Math.random(),
      message: `ALERT: ${t.rule} — ${t.metric} is ${t.actual} (threshold: ${t.threshold})`,
    }));
    setAlertBanners(prev => [...banners, ...prev].slice(0, 5));
    setAlertRefreshTick(n => n + 1);
  };

  const isAdmin   = user?.role === "admin";
  const online    = status?.online;
  const cpu       = status?.cpu ?? 0;
  const ram       = status?.ramUsedMB ?? 0;
  const disk      = status?.diskMB ?? 0;
  const players   = status?.playerCount ?? 0;
  const ping      = status?.responseTime ?? null;
  const loss      = status?.packetLoss ?? 0;
  const fps       = status?.serverFps ?? 0;
  const rx        = ((status?.networkRxKB ?? 0) / 1024).toFixed(2);
  const tx        = ((status?.networkTxKB ?? 0) / 1024).toFixed(2);
  const healthPct = online ? Math.max(0, 100 - loss - (ping > 200 ? 30 : ping > 80 ? 10 : 0)) : 0;
  const healthColor = healthPct > 70 ? T.green : healthPct > 40 ? T.orange : T.red;

  return (
    <div
      className="p-4 pb-24 space-y-4 max-w-screen-2xl mx-auto"
      style={{ minHeight: "100vh", background: "linear-gradient(160deg, #181a1c 0%, #111315 100%)" }}
    >
      <style>{`
        @keyframes threat-blink { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes hdr-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* ── ALERT BANNERS ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {alertBanners.map(b => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: -16, scaleY: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -16, scaleY: 0.8 }}
            className="flex items-center justify-between px-4 py-2.5 text-xs relative overflow-hidden"
            style={{ border: `1px solid ${T.red}55`, background: "linear-gradient(90deg, #1a0000, #0d0000)", color: T.red }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "2px", background: T.red, boxShadow: `0 0 8px ${T.red}` }} />
            <span className="flex items-center gap-2">
              <AlertTriangle size={10} style={{ animation: "threat-blink 0.8s infinite" }} />
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "0.1em" }}>{b.message}</span>
            </span>
            <button onClick={() => setAlertBanners(p => p.filter(x => x.id !== b.id))} style={{ opacity: 0.7 }}>
              <X size={10} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── HEADER BAR ────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          border: `1px solid ${online ? T.green + "33" : T.red + "33"}`,
          background: "linear-gradient(160deg, #1c1e21 0%, #14161a 100%)",
          boxShadow: `0 0 0 1px rgba(0,0,0,0.6), inset 0 1px 0 ${(online ? T.green : T.red)}18`,
        }}
      >
        {/* Shimmer sweep */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: "50%", height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.012), transparent)",
          animation: "hdr-scan 5s linear infinite", pointerEvents: "none",
        }} />
        {/* Top hairline */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "1px",
          background: `linear-gradient(90deg, transparent, ${online ? T.green : T.red}55, transparent)`,
        }} />

        {/* Downtime banner */}
        <AnimatePresence>
          {downtimeAlert && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-4 py-2 border-b text-xs"
              style={{ borderColor: T.red + "33", background: "rgba(255,0,0,0.06)", color: T.red }}
            >
              <AlertTriangle size={9} style={{ animation: "threat-blink 0.8s infinite" }} />
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "8.5px", letterSpacing: "0.18em" }}>
                ⚠ SERVER OFFLINE — DOWNTIME DETECTED{lastPolled ? ` — LAST SEEN ${lastPolled}` : ""}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 relative">
          {/* Title + beacon */}
          <div className="flex items-center gap-3">
            <div style={{
              width: "28px", height: "28px",
              border: `1px solid ${T.cyan}44`,
              background: `radial-gradient(circle, ${T.cyan}18 0%, transparent 70%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `inset 0 0 6px ${T.cyan}22`,
            }}>
              <Cpu size={13} style={{ color: T.cyan }} />
            </div>
            <div>
              <div style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.22em", textShadow: `0 0 12px ${T.cyan}66` }}>
                SERVER MONITOR
              </div>
              <div style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.18em" }}>HUMANITZ · BISECT HOSTING</div>
            </div>
          </div>

          <div style={{ width: "1px", height: "28px", background: T.border }} />

          <StatusBeacon online={online} loading={statusLoading} />

          <div style={{ width: "1px", height: "28px", background: T.border }} />

          {/* Uptime */}
          <div className="flex items-center gap-2.5">
            <Clock size={9} style={{ color: T.textFaint }} />
            <div>
              <div style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.18em", marginBottom: "1px" }}>UPTIME</div>
              <LiveUptime initialUptime={status?.uptime || "--:--:--"} statusLoading={statusLoading} />
            </div>
          </div>

          <div style={{ width: "1px", height: "28px", background: T.border }} />

          {/* Health bar */}
          <div className="flex items-center gap-2.5 flex-1 min-w-48">
            <Activity size={9} style={{ color: T.textFaint }} />
            <div className="flex flex-col flex-1">
              <div className="flex justify-between mb-1">
                <span style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.18em" }}>SERVER HEALTH</span>
                <span style={{ color: healthColor, fontSize: "7px", fontFamily: "'Orbitron', monospace", textShadow: `0 0 6px ${healthColor}` }}>{healthPct.toFixed(0)}%</span>
              </div>
              <div style={{ display: "flex", gap: "2px" }}>
                {Array.from({ length: 20 }).map((_, i) => {
                  const filled = i < Math.round(healthPct / 5);
                  return (
                    <div key={i} style={{
                      flex: 1, height: "5px",
                      background: filled ? healthColor : T.border,
                      opacity: filled ? 1 : 0.2,
                      boxShadow: filled ? `0 0 3px ${healthColor}88` : "none",
                    }} />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Poll / refresh */}
          <div className="flex items-center gap-2 ml-auto">
            {lastPolled && (
              <span style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.1em" }}>
                POLLED {lastPolled}
              </span>
            )}
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1 px-2 py-1 border hover:opacity-80 transition-opacity"
              style={{ borderColor: T.border, color: T.textDim, fontSize: "7px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em" }}
              title="Refresh"
            >
              <RefreshCw size={9} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── STAT PILLS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <StatPill icon={Users}    label="PLAYERS"     value={statusLoading ? "..." : `${players}/64`} sub={`${Math.round(players / 0.64)}% capacity`} color={T.cyan} />
        <StatPill icon={Zap}      label="SERVER FPS"  value={statusLoading ? "..." : fps} sub={fps >= 59 ? "OPTIMAL" : fps > 0 ? "DEGRADED" : "N/A"} color={fps >= 59 ? T.green : T.orange} />
        <StatPill icon={Wifi}     label="PING"        value={statusLoading ? "..." : ping === null ? "---" : `${ping}ms`} sub={ping === null ? "NO DATA" : ping < 80 ? "EXCELLENT" : "FAIR"} color={pingColor(ping)} />
        <StatPill icon={Radio}    label="PKT LOSS"    value={statusLoading ? "..." : `${loss}%`} sub={loss === 0 ? "CLEAN" : "DEGRADED"} color={lossColor(loss)} />
        <StatPill icon={Cpu}      label="CPU"         value={statusLoading ? "..." : `${cpu.toFixed(0)}%`} sub={cpu > 80 ? "CRITICAL" : cpu > 60 ? "ELEVATED" : "NORMAL"} color={cpuColor(cpu)} />
        <StatPill icon={Database} label="RAM"         value={statusLoading ? "..." : `${(ram / 1024).toFixed(1)}GB`} sub={`${(ram / 32768 * 100).toFixed(0)}% of 32GB`} color={ramColor(ram)} />
        <StatPill icon={Database} label="DISK"        value={statusLoading ? "..." : `${(disk / 1024).toFixed(0)}GB`} sub="used" color={T.gold} />
        <StatPill icon={Activity} label="NETWORK"     value={statusLoading ? "..." : `↓${rx}`} sub={`↑${tx} MB/s`} color={T.steel} />
      </div>

      {/* ── MAIN 3-COLUMN GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* LEFT: Gauges + Charts + Forecast + Alerts */}
        <div className="xl:col-span-2 space-y-4">

          {/* Resource gauges */}
          <div
            className="relative overflow-hidden"
            style={{
              border: `1px solid ${T.border}`,
              background: "linear-gradient(180deg, rgba(20, 14, 8, 0.95) 0%, rgba(15, 10, 5, 0.98) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.steel}44, transparent)` }} />
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: T.border }}>
              <Database size={9} style={{ color: T.textFaint }} />
              <span style={{ color: T.textFaint, fontSize: "8.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em" }}>RESOURCE UTILIZATION</span>
            </div>
            <div className="p-4 space-y-4">
              <GaugeBar label="CPU" value={cpu} max={100} unit="%" color={cpuColor(cpu)} />
              <GaugeBar label="RAM" value={ram / 1024} max={32} unit=" GB" color={ramColor(ram)} />
              <GaugeBar label="DISK" value={disk / 1024} max={1024} unit=" GB" color={T.gold} />

              <div className="grid grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: T.border + "88" }}>
                <div className="relative p-3" style={{ border: `1px solid ${T.cyan}22`, background: `${T.cyan}08` }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.cyan}44, transparent)` }} />
                  <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", marginBottom: "4px" }}>↓ DOWNLOAD</div>
                  <div style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "13px", fontWeight: "bold", textShadow: `0 0 8px ${T.cyan}66` }}>
                    {rx} <span style={{ fontSize: "9px", opacity: 0.7 }}>MB/s</span>
                  </div>
                </div>
                <div className="relative p-3" style={{ border: `1px solid ${T.steel}22`, background: `${T.steel}08` }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.steel}44, transparent)` }} />
                  <div style={{ color: T.textFaint, fontSize: "7.5px", letterSpacing: "0.15em", marginBottom: "4px" }}>↑ UPLOAD</div>
                  <div style={{ color: T.steel, fontFamily: "'Orbitron', monospace", fontSize: "13px", fontWeight: "bold", textShadow: `0 0 8px ${T.steel}66` }}>
                    {tx} <span style={{ fontSize: "9px", opacity: 0.7 }}>MB/s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div
            className="relative overflow-hidden"
            style={{
              border: `1px solid ${T.border}`,
              background: "linear-gradient(180deg, rgba(20, 14, 8, 0.95) 0%, rgba(15, 10, 5, 0.98) 100%)",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.green}44, transparent)` }} />
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: T.border }}>
              <Activity size={9} style={{ color: T.textFaint }} />
              <span style={{ color: T.textFaint, fontSize: "8.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em" }}>LIVE TIME-SERIES — 60s WINDOW</span>
            </div>
            <div className="p-3">
              <PerformanceCharts status={status} statusLoading={statusLoading} />
            </div>
          </div>

          {/* Forecast collapsible */}
          <div
            className="relative overflow-hidden"
            style={{ border: `1px solid ${T.border}`, background: "linear-gradient(160deg, #1c1e21 0%, #14161a 100%)" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.cyan}44, transparent)` }} />
            <button
              onClick={() => setShowForecast(!showForecast)}
              className="w-full flex items-center gap-2.5 px-4 py-3 hover:opacity-80 transition-opacity"
            >
              <TrendingUp size={10} style={{ color: T.cyan }} />
              <span style={{ color: T.cyan, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.18em", flex: 1, textAlign: "left", textShadow: `0 0 8px ${T.cyan}66` }}>
                PERFORMANCE FORECAST — 48H PROJECTION
              </span>
              <span style={{ color: T.textFaint, fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>{showForecast ? "▼" : "▶"}</span>
            </button>
            <AnimatePresence>
              {showForecast && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-4 pb-4 border-t" style={{ borderColor: T.border }}>
                    <PerformanceForecast status={status} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Alerts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AlertRulesPanel onTriggered={handleTriggered} />
            <AlertHistoryPanel refreshTick={alertRefreshTick} />
          </div>

          {/* Event Feed */}
          <EventFeed events={events} maxHeight="500px" />
        </div>

        {/* RIGHT: Admin Tools */}
        <div className="space-y-3">
          <div className="space-y-2">
          {/* Redacted Admin Header */}
          <div
            className="relative flex items-center gap-3 px-3 py-2.5 overflow-hidden"
            style={{
              border: `1px solid ${T.red}22`,
              background: "linear-gradient(135deg, #1a0a04, #0a0404)",
              boxShadow: `inset 0 1px 0 ${T.red}08`,
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.red}33, transparent)` }} />
            <div style={{
              width: "24px", height: "24px",
              border: `1px solid ${T.red}22`,
              background: `radial-gradient(circle, ${T.red}10, transparent 70%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 8px ${T.red}12`,
            }}>
              <Lock size={11} style={{ color: T.red }} />
            </div>
            <div>
              <div style={{ color: T.red, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.24em", textShadow: `0 0 8px ${T.red}33` }}>
                ADMIN TOOLS
              </div>
              <div style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.16em" }}>ACCESS DENIED</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: T.red, boxShadow: `0 0 5px ${T.red}` }} />
              <span style={{ color: T.red, fontSize: "7px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.14em" }}>UNAUTHORIZED</span>
            </div>
          </div>

          {/* Redacted Content */}
          {isAdmin ? (
            <AdminToolsPanel status={status} events={events} />
          ) : (
            <>
              {["AI RCON ADVISOR", "QUICK ACTIONS", "SERVER BROADCAST", "PLAYER MANAGEMENT", "RCON PRESETS", "CUSTOM RCON"].map(title => (
                <div key={title}
                  className="relative overflow-hidden"
                  style={{
                    border: `1px solid ${T.border}22`,
                    background: "linear-gradient(160deg, rgba(20,15,10,0.3), rgba(15,10,5,0.2))",
                    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.4)",
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${T.red}22, transparent)` }} />
                  <div
                    className="px-3 py-2.5 flex items-center justify-between"
                    style={{ borderColor: T.border, background: `${T.red}05` }}
                  >
                    <span style={{ color: T.textFaint, fontSize: "8px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.18em", opacity: 0.5 }}>
                      {title}
                    </span>
                    <div style={{ fontSize: "9px", color: T.textFaint, fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em", opacity: 0.5 }}>
                      [REDACTED]
                    </div>
                  </div>
                  <div className="px-3 py-3 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: "18px",
                          background: `linear-gradient(90deg, ${T.red}15, ${T.red}08, ${T.red}15)`,
                          border: `1px solid ${T.red}15`,
                          borderRadius: "2px",
                          animation: `shimmer 2s infinite`,
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        </div>
      </div>

      {/* ── BOTTOM CONSOLE ────────────────────────────────────────────────── */}
      <BottomConsoleDrawer
        consoleLines={consoleLines}
        onConsoleInput={handleCommand}
        onConsoleClear={() => setConsoleLines([{ text: "> Console cleared.", color: T.textFaint }])}
        events={events}
        logFilter={logFilter}
        onLogFilterChange={setLogFilter}
        onLogEvent={logEvent}
        rconHistory={rconHistory}
        onRconRerun={(c) => setCmd(c)}
        onRconClear={() => setRconHistory([])}
        cmd={cmd}
        onCmdChange={setCmd}
        rconLoading={rconLoading}
      />
    </div>
  );
}