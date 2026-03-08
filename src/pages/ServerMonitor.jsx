import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, RefreshCw, AlertTriangle, Clock, Wifi, X, Activity, Users, Zap, Radio, Database, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PerformanceCharts from "../components/server/PerformanceCharts";
import PerformanceForecast from "../components/server/PerformanceForecast";
import BottomConsoleDrawer from "../components/server/BottomConsoleDrawer";
import LiveUptime from "../components/server/LiveUptime";
import AlertRulesPanel from "../components/server/AlertRulesPanel";
import AlertHistoryPanel from "../components/server/AlertHistoryPanel";
import AdminToolsPanel from "../components/server/AdminToolsPanel";
import { T } from "@/components/ui/TerminalCard";

// ── helpers ──────────────────────────────────────────────────────────────────
const pingColor  = (ms)  => ms === null ? T.textFaint : ms < 80 ? T.green : ms < 200 ? T.amber : T.red;
const lossColor  = (pct) => pct === 0 ? T.green : pct < 33 ? T.amber : T.red;
const cpuColor   = (v)   => v > 80 ? T.red : v > 60 ? T.amber : T.green;
const ramColor   = (mb)  => { const p = mb / 32768 * 100; return p > 80 ? T.red : p > 60 ? T.amber : T.cyan; };

// ── Mini stat card ────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, sub, color }) {
  return (
    <motion.div
      className="border p-3 flex flex-col gap-1"
      style={{ borderColor: T.border, background: T.bg1 }}
      whileHover={{ borderColor: color + "88" }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={9} style={{ color: T.textFaint }} />
        <span style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em", fontFamily: "'Orbitron', monospace" }}>{label}</span>
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "13px", fontWeight: "bold", lineHeight: 1 }}
      >
        {value}
      </motion.div>
      {sub && <div style={{ color: T.textFaint, fontSize: "8px" }}>{sub}</div>}
    </motion.div>
  );
}

// ── Gauge bar ─────────────────────────────────────────────────────────────────
function GaugeBar({ label, value, max, unit, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span style={{ color: T.textFaint, fontSize: "9px" }}>{label}</span>
        <span style={{ color, fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>
          {typeof value === "number" ? value.toFixed(0) : value}{unit}
        </span>
      </div>
      <div style={{ height: "3px", background: T.border }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ height: "100%", background: color, boxShadow: `0 0 4px ${color}88` }}
        />
      </div>
    </div>
  );
}

// ── Online status beacon ──────────────────────────────────────────────────────
function StatusBeacon({ online, loading }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ opacity: online ? [1, 0.3, 1] : 1, scale: online ? [1, 1.1, 1] : 1 }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          width: "10px", height: "10px", borderRadius: "50%",
          background: loading ? T.textFaint : online ? T.green : T.red,
          boxShadow: loading ? "none" : `0 0 10px ${online ? T.green : T.red}`,
        }}
      />
      <span style={{ color: loading ? T.textFaint : online ? T.green : T.red, fontFamily: "'Orbitron', monospace", fontSize: "12px", fontWeight: "bold" }}>
        {loading ? "POLLING..." : online ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}

export default function ServerMonitor() {
  const [events, setEvents]               = useState([]);
  const [consoleLines, setConsoleLines]   = useState([
    { text: "> DEAD SIGNAL TERMINAL v1.0", color: T.amber },
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

  // Fetch user to gate admin tools
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
    } catch (e) {
      // silently keep last known
    } finally {
      setStatusLoading(false);
    }
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

  const isAdmin = user?.role === "admin";
  const online = status?.online;
  const cpu = status?.cpu ?? 0;
  const ram = status?.ramUsedMB ?? 0;
  const disk = status?.diskMB ?? 0;
  const players = status?.playerCount ?? 0;
  const ping = status?.responseTime ?? null;
  const loss = status?.packetLoss ?? 0;
  const fps = status?.serverFps ?? 0;
  const rx = ((status?.networkRxKB ?? 0) / 1024).toFixed(2);
  const tx = ((status?.networkTxKB ?? 0) / 1024).toFixed(2);
  const healthPct = online ? Math.max(0, 100 - loss - (ping > 200 ? 30 : ping > 80 ? 10 : 0)) : 0;

  return (
    <div className="p-4 pb-24 space-y-4 max-w-screen-2xl mx-auto">

      {/* Alert banners */}
      <AnimatePresence>
        {alertBanners.map(b => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex items-center justify-between px-3 py-2 border text-xs"
            style={{ borderColor: T.red, background: "#1a0000", color: T.red }}
          >
            <span><AlertTriangle size={10} className="inline mr-2" />{b.message}</span>
            <button onClick={() => setAlertBanners(p => p.filter(x => x.id !== b.id))}><X size={10} /></button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="border px-4 py-3 flex flex-wrap items-center gap-4"
        style={{ borderColor: online ? T.green + "44" : T.red + "44", background: "rgba(0,0,0,0.5)" }}>

        {/* Downtime banner */}
        <AnimatePresence>
          {downtimeAlert && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full flex items-center gap-2 text-xs pb-2 border-b"
              style={{ borderColor: T.red + "44", color: T.red }}
            >
              <AlertTriangle size={10} style={{ animation: "threat-blink 0.8s infinite" }} />
              <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "0.15em" }}>
                ⚠ SERVER OFFLINE — DOWNTIME DETECTED {lastPolled ? `— LAST SEEN ${lastPolled}` : ""}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status */}
        <div className="flex items-center gap-3">
          <Cpu size={12} style={{ color: T.amber }} />
          <span style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "0.2em" }}>SERVER MONITOR</span>
          <span style={{ color: T.border }}>|</span>
          <StatusBeacon online={online} loading={statusLoading} />
        </div>

        {/* Uptime */}
        <div className="flex items-center gap-2">
          <Clock size={9} style={{ color: T.textFaint }} />
          <span style={{ color: T.textFaint, fontSize: "9px" }}>UPTIME</span>
          <LiveUptime initialUptime={status?.uptime || "--:--:--"} statusLoading={statusLoading} />
        </div>

        {/* Health bar */}
        <div className="flex items-center gap-2 flex-1 min-w-40">
          <Activity size={9} style={{ color: T.textFaint }} />
          <span style={{ color: T.textFaint, fontSize: "9px" }}>HEALTH</span>
          <div className="flex gap-0.5 flex-1">
            {Array.from({ length: 20 }).map((_, i) => {
              const filled = i < Math.round(healthPct / 5);
              return (
                <div key={i} style={{
                  flex: 1, height: "5px",
                  background: filled ? (healthPct > 70 ? T.green : healthPct > 40 ? T.amber : T.red) : T.border,
                  opacity: filled ? 1 : 0.3,
                }} />
              );
            })}
          </div>
          <span style={{ color: T.textFaint, fontSize: "8px" }}>{healthPct.toFixed(0)}%</span>
        </div>

        {/* Last polled + refresh */}
        <div className="flex items-center gap-2 ml-auto">
          {lastPolled && <span style={{ color: T.textFaint, fontSize: "8px" }}>POLLED {lastPolled}</span>}
          <button onClick={fetchStatus} className="p-1 hover:opacity-70 transition-opacity" title="Refresh">
            <RefreshCw size={11} style={{ color: T.textDim }} />
          </button>
        </div>
      </div>

      {/* ── STAT PILLS ROW ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <StatPill icon={Users}    label="PLAYERS"     value={statusLoading ? "..." : `${players}/64`} sub={`${Math.round(players / 0.64)}% cap`} color={T.cyan} />
        <StatPill icon={Zap}      label="SERVER FPS"  value={statusLoading ? "..." : fps} sub={fps >= 59 ? "OPTIMAL" : fps > 0 ? "DEGRADED" : "N/A"} color={fps >= 59 ? T.green : T.amber} />
        <StatPill icon={Wifi}     label="PING"        value={statusLoading ? "..." : ping === null ? "---" : `${ping}ms`} sub={ping === null ? "" : ping < 80 ? "EXCELLENT" : "FAIR"} color={pingColor(ping)} />
        <StatPill icon={Radio}    label="PACKET LOSS" value={statusLoading ? "..." : `${loss}%`} sub={loss === 0 ? "CLEAN" : "DEGRADED"} color={lossColor(loss)} />
        <StatPill icon={Cpu}      label="CPU"         value={statusLoading ? "..." : `${cpu.toFixed(0)}%`} sub={cpu > 80 ? "CRITICAL" : cpu > 60 ? "ELEVATED" : "NORMAL"} color={cpuColor(cpu)} />
        <StatPill icon={Database} label="RAM"         value={statusLoading ? "..." : `${(ram / 1024).toFixed(1)}GB`} sub={`${(ram / 32768 * 100).toFixed(0)}% of 32GB`} color={ramColor(ram)} />
        <StatPill icon={Database} label="DISK"        value={statusLoading ? "..." : `${(disk / 1024).toFixed(0)}GB`} sub="used" color={T.amber} />
        <StatPill icon={Activity} label="NETWORK"     value={statusLoading ? "..." : `↓${rx}`} sub={`↑${tx} MB/s`} color={T.cyan} />
      </div>

      {/* ── MAIN GRID: 3 columns ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* LEFT: Gauges + Charts + Forecast */}
        <div className="xl:col-span-2 space-y-4">

          {/* Resource gauges */}
          <div className="border p-4 space-y-3" style={{ borderColor: T.border, background: T.bg1 }}>
            <div style={{ color: T.textFaint, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em", paddingBottom: "4px", borderBottom: `1px solid ${T.border}` }}>
              // RESOURCE UTILIZATION
            </div>
            <GaugeBar label="CPU" value={cpu} max={100} unit="%" color={cpuColor(cpu)} />
            <GaugeBar label="RAM" value={ram / 1024} max={32} unit=" GB" color={ramColor(ram)} />
            <GaugeBar label="DISK" value={disk / 1024} max={1024} unit=" GB" color={T.amber} />
            <div className="grid grid-cols-2 gap-3 pt-1 border-t" style={{ borderColor: T.border }}>
              <div>
                <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "2px" }}>NET DOWNLOAD</div>
                <div style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "12px" }}>↓ {rx} MB/s</div>
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "2px" }}>NET UPLOAD</div>
                <div style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "12px" }}>↑ {tx} MB/s</div>
              </div>
            </div>
          </div>

          {/* Performance time-series charts */}
          <div className="border p-3 space-y-2" style={{ borderColor: T.border, background: T.bg1 }}>
            <div style={{ color: T.textFaint, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em", paddingBottom: "6px", borderBottom: `1px solid ${T.border}` }}>
              // LIVE TIME-SERIES (60s)
            </div>
            <PerformanceCharts status={status} statusLoading={statusLoading} />
          </div>

          {/* Forecast collapsible */}
          <div className="border" style={{ borderColor: T.border, background: T.bg1 }}>
            <button
              onClick={() => setShowForecast(!showForecast)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:opacity-80 transition-opacity"
            >
              <TrendingUp size={10} style={{ color: T.cyan }} />
              <span style={{ color: T.cyan, fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em", flex: 1, textAlign: "left" }}>
                // PERFORMANCE FORECAST (48H)
              </span>
              <span style={{ color: T.textFaint, fontSize: "9px" }}>{showForecast ? "▼ HIDE" : "▶ SHOW"}</span>
            </button>
            <AnimatePresence>
              {showForecast && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-3 pb-3 border-t" style={{ borderColor: T.border }}>
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
        </div>

        {/* RIGHT: Admin Tools */}
        <div className="space-y-3">
          {isAdmin ? (
            <AdminToolsPanel status={status} />
          ) : (
            <div className="border p-6 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
              <div style={{ color: T.textFaint, fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>// ADMIN ACCESS REQUIRED</div>
              <div style={{ color: T.textFaint, fontSize: "9px", marginTop: "8px" }}>Admin tools are only visible to administrators.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM CONSOLE DRAWER ────────────────────────────────────────────── */}
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