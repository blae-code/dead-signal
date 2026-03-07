import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, RefreshCw, Send, Trash2, AlertTriangle, Clock, Wifi, Loader, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AlertRulesPanel from "../components/server/AlertRulesPanel";
import AlertHistoryPanel from "../components/server/AlertHistoryPanel";
import RconHistoryPanel from "../components/server/RconHistoryPanel";
import PerformanceCharts from "../components/server/PerformanceCharts";
import PerformanceForecast from "../components/server/PerformanceForecast";
import { T, PageHeader, ActionBtn } from "@/components/ui/TerminalCard";

// Animated value display component
function AnimatedValue({ value, color = T.green, format = (v) => v }) {
  return (
    <motion.div
      key={value}
      initial={{ opacity: 0.5, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{ color, fontFamily: "'Orbitron', monospace" }}
      className="text-sm font-bold"
    >
      {format(value)}
    </motion.div>
  );
}

export default function ServerMonitor() {
  const [events, setEvents] = useState([]);
  const [consoleLines, setConsoleLines] = useState([
    { text: "> DEAD SIGNAL TERMINAL v1.0", color: "#ffb000" },
    { text: "> Connecting to HumanitZ server...", color: "#39ff14" },
    { text: "> Type HELP for available commands.", color: "#39ff1488" },
  ]);
  const [cmd, setCmd] = useState("");
  const [rconLoading, setRconLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [logFilter, setLogFilter] = useState("ALL");
  const [alertBanners, setAlertBanners] = useState([]);
  const [alertRefreshTick, setAlertRefreshTick] = useState(0);
  const [showForecast, setShowForecast] = useState(false);
  const logRef = useRef(null);
  const consoleRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await base44.functions.invoke('getServerStatus', {});
      if (res.data && !res.data.error) setStatus(res.data);
    } catch (e) {
      // silently fail, keep last known status
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    base44.entities.ServerEvent.list("-created_date", 50).then(setEvents).catch(() => {});
    const unsub = base44.entities.ServerEvent.subscribe((ev) => {
      if (ev.type === "create") setEvents(prev => [ev.data, ...prev.slice(0, 49)]);
    });

    fetchStatus();
    const pollInterval = setInterval(fetchStatus, 30000); // refresh every 30s
    return () => {
      unsub();
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleLines]);

  const handleCommand = async () => {
    if (!cmd.trim() || rconLoading) return;
    const input = cmd.trim().toUpperCase();
    const raw = cmd.trim();
    setConsoleLines(prev => [...prev, { text: `> ${raw}`, color: "#00e5ff" }]);
    setCmd("");

    // Local-only commands
    if (input === "HELP") {
      setConsoleLines(prev => [...prev,
        { text: "Tip: Commands are sent live to your server via RCON.", color: "#39ff1488" },
        { text: "Examples: kick PlayerName | say Hello! | status | players", color: "#39ff1488" },
        { text: "Type CLEAR to wipe the console.", color: "#39ff1488" },
      ]);
      return;
    }
    if (input === "CLEAR") {
      setConsoleLines([{ text: "> Console cleared.", color: "#39ff1488" }]);
      return;
    }

    // All other commands go live to the server
    setRconLoading(true);
    setConsoleLines(prev => [...prev, { text: `Sending to server...`, color: "#39ff1444" }]);
    try {
      const res = await base44.functions.invoke('sendRconCommand', { command: raw });
      if (res.data?.success) {
        setConsoleLines(prev => [...prev, { text: `✓ ${res.data.output}`, color: "#39ff14" }]);
        await Promise.all([
          base44.entities.ServerEvent.create({ event_type: "Admin Action", message: `RCON: ${raw}`, severity: "WARN" }),
          base44.entities.RconHistory.create({ command: raw, output: res.data.output, success: true }),
        ]).catch(() => {});
      } else {
        setConsoleLines(prev => [...prev, { text: `✗ ${res.data?.error || "Unknown error"}`, color: "#ff2020" }]);
        base44.entities.RconHistory.create({ command: raw, output: res.data?.error || "Unknown error", success: false }).catch(() => {});
      }
    } catch (err) {
      setConsoleLines(prev => [...prev, { text: `✗ ${err.message}`, color: "#ff2020" }]);
    } finally {
      setRconLoading(false);
    }
  };

  const logEvent = async (type, msg, severity = "INFO") => {
    await base44.entities.ServerEvent.create({ event_type: type, message: msg, severity }).catch(() => {});
    setEvents(prev => [{ id: Date.now(), event_type: type, message: msg, severity, created_date: new Date().toISOString() }, ...prev]);
  };

  const filteredEvents = logFilter === "ALL" ? events : events.filter(e => e.severity === logFilter);

  const severityColor = (s) => ({ CRITICAL: "#ff2020", ALERT: "#ff8000", WARN: "#ffb000", INFO: "#39ff1488" }[s] || "#39ff1488");

  const barColor = (val) => val > 80 ? "#ff2020" : val > 60 ? "#ffb000" : "#39ff14";

  const handleTriggered = (triggered) => {
    const banners = triggered.map(t => ({
      id: Date.now() + Math.random(),
      message: `ALERT: ${t.rule} — ${t.metric} is ${t.actual} (threshold: ${t.threshold})`,
    }));
    setAlertBanners(prev => [...banners, ...prev].slice(0, 5));
    setAlertRefreshTick(n => n + 1);
  };

  const dismissBanner = (id) => setAlertBanners(prev => prev.filter(b => b.id !== id));

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* In-app alert banners */}
      <AnimatePresence>
        {alertBanners.map(b => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between px-3 py-2 border text-xs"
            style={{ borderColor: "#ff2020", background: "#1a0000", color: "#ff2020" }}
          >
            <span><AlertTriangle size={10} className="inline mr-2" />{b.message}</span>
            <button onClick={() => dismissBanner(b.id)}><X size={10} /></button>
          </motion.div>
        ))}
      </AnimatePresence>

      <PageHeader icon={Cpu} title="SERVER MONITOR" color={T.green}>
        {statusLoading
          ? <span className="text-xs px-2 py-0.5 border" style={{ color: T.textFaint, borderColor: T.border }}>● FETCHING...</span>
          : <span className="text-xs px-2 py-0.5 border" style={{ color: status?.online ? T.green : T.red, borderColor: status?.online ? T.green + "66" : T.red + "66" }}>
              {status?.online ? "● ONLINE" : "● OFFLINE"}
            </span>
        }
        <button onClick={fetchStatus} className="p-1 hover:opacity-70 transition-opacity" title="Refresh">
          <RefreshCw size={11} style={{ color: T.textDim }} />
        </button>
      </PageHeader>

      {/* Status cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {[
          { label: "STATE",  value: statusLoading ? "..." : (status?.state?.toUpperCase() || "UNKNOWN"), icon: Wifi,      color: status?.online ? T.green : T.red },
          { label: "UPTIME", value: statusLoading ? "..." : (status?.uptime || "--:--:--"),               icon: Clock,     color: T.amber },
          { label: "NET ↓",  value: statusLoading ? "..." : `${status?.networkRxKB ?? 0} KB`,             icon: RefreshCw, color: T.cyan },
          { label: "NET ↑",  value: statusLoading ? "..." : `${status?.networkTxKB ?? 0} KB`,             icon: RefreshCw, color: T.cyan },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            className="border p-3"
            style={{ borderColor: T.border, background: T.bg1 }}
            whileHover={{ borderColor: color + "66", transition: { duration: 0.2 } }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={10} style={{ color: T.textFaint }} />
              <span className="text-xs tracking-widest" style={{ color: T.textFaint, fontSize: "9px" }}>{label}</span>
            </div>
            <AnimatedValue value={value} color={color} />
          </motion.div>
        ))}
      </motion.div>

      {/* CPU/RAM/Disk stats */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
        {[
          { label: "CPU LOAD", val: status?.cpu ?? 0, display: `${status?.cpu ?? 0}%`, isPercent: true },
          { label: "RAM USED", val: 0, display: `${status?.ramUsedMB ?? 0} MB`, isPercent: false },
          { label: "DISK USED", val: 0, display: `${status?.diskMB ?? 0} MB`, isPercent: false },
        ].map(({ label, val, display, isPercent }) => (
          <motion.div
            key={label}
            className="border p-3"
            style={{ borderColor: T.border, background: T.bg1 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ borderColor: barColor(val) + "66", transition: { duration: 0.2 } }}
          >
            <div className="flex justify-between mb-2">
              <span className="text-xs tracking-widest" style={{ color: T.textFaint, fontSize: "9px" }}>{label}</span>
              <AnimatedValue value={display} color={isPercent ? barColor(val) : T.green} />
            </div>
            {isPercent && (
              <motion.div className="progress-bar-terminal">
                <motion.div
                  className="progress-bar-terminal-fill"
                  initial={{ width: 0 }}
                  animate={{ width: statusLoading ? "0%" : `${val}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ background: barColor(val) }}
                />
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Performance charts */}
      <PerformanceCharts status={status} statusLoading={statusLoading} />

      {/* Forecast toggle and section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => setShowForecast(!showForecast)}>
          <span
            className="text-xs font-bold tracking-widest px-2 py-1 border"
            style={{
              color: showForecast ? T.cyan : T.textFaint,
              borderColor: showForecast ? T.cyan : T.border,
              fontFamily: "'Orbitron', monospace",
              fontSize: "10px",
            }}
          >
            {showForecast ? "▼" : "▶"} FORECAST
          </span>
        </div>
        <AnimatePresence>
          {showForecast && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PerformanceForecast status={status} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* RCON Console */}
        <motion.div className="border" style={{ borderColor: T.border, background: T.bg1 }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border }}>
            <span className="text-xs font-bold tracking-widest" style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>RCON TERMINAL</span>
            <button onClick={() => setConsoleLines([{ text: "> Console cleared.", color: T.textFaint }])} className="ml-auto hover:opacity-70 transition-opacity">
              <Trash2 size={10} style={{ color: T.textFaint }} />
            </button>
          </div>
          <div ref={consoleRef} className="p-3 overflow-y-auto text-xs space-y-0.5" style={{ height: "200px" }}>
            <AnimatePresence mode="popLayout">
              {consoleLines.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: l.color, fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {l.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex border-t" style={{ borderColor: T.border }}>
            <span className="px-3 py-2 text-xs" style={{ color: "#39ff14" }}>&gt;</span>
            <input
              className="flex-1 bg-transparent text-xs py-2 pr-2 outline-none border-0"
              style={{ color: "#39ff14", fontFamily: "'Share Tech Mono', monospace" }}
              value={cmd}
              onChange={e => setCmd(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCommand()}
              placeholder="enter command..."
            />
            <button onClick={handleCommand} className="px-3 py-2" disabled={rconLoading}>
              {rconLoading
                ? <Loader size={12} style={{ color: "#39ff1488", animation: "spin 1s linear infinite" }} />
                : <Send size={12} style={{ color: "#39ff14" }} />
              }
            </button>
          </div>
        </motion.div>

        {/* Event log */}
        <motion.div className="border" style={{ borderColor: T.border, background: T.bg1 }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b flex-wrap" style={{ borderColor: T.border }}>
            <span className="text-xs font-bold tracking-widest" style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>EVENT LOG</span>
            <div className="ml-auto flex gap-1">
              {["ALL", "INFO", "WARN", "CRITICAL"].map(f => (
                <motion.button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className="text-xs px-2 py-0.5 border"
                  whileHover={{ borderColor: logFilter === f ? T.green : T.borderHi, scale: 1.05 }}
                  style={{ borderColor: logFilter === f ? T.green : T.border, color: logFilter === f ? T.green : T.textFaint }}
                >
                  {f}
                </motion.button>
              ))}
            </div>
          </div>
          <div ref={logRef} className="p-3 overflow-y-auto space-y-1" style={{ height: "235px" }}>
            <AnimatePresence mode="popLayout">
              {filteredEvents.length === 0
                ? <motion.div key="no-events" className="text-xs" style={{ color: T.textFaint }}>// NO EVENTS</motion.div>
                : filteredEvents.map(e => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs flex gap-2"
                  >
                    <span style={{ color: T.textFaint, flexShrink: 0 }}>
                      [{new Date(e.created_date).toLocaleTimeString("en-US", { hour12: false })}]
                    </span>
                    <span style={{ color: severityColor(e.severity) }}>[{e.severity}]</span>
                    <span style={{ color: T.textDim }}>{e.message}</span>
                  </motion.div>
                ))
              }
            </AnimatePresence>
          </div>
          <div className="px-3 py-2 border-t flex gap-2" style={{ borderColor: T.border }}>
            <button onClick={() => logEvent("Broadcast", "Server restarting in 10 min", "WARN")}
              className="text-xs px-3 py-1 border transition-opacity hover:opacity-80" style={{ borderColor: T.amber + "88", color: T.amber }}>
              WARN RESTART
            </button>
            <button onClick={() => logEvent("Server Start", "Server online", "INFO")}
              className="text-xs px-3 py-1 border transition-opacity hover:opacity-80" style={{ borderColor: T.green + "88", color: T.green }}>
              LOG ONLINE
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* RCON History */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <RconHistoryPanel onRerun={(cmd) => setCmd(cmd)} />
      </motion.div>

      {/* Alerts section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AlertRulesPanel onTriggered={handleTriggered} />
        <AlertHistoryPanel refreshTick={alertRefreshTick} />
      </motion.div>
    </div>
  );
}