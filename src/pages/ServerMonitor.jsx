import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, RefreshCw, Send, Trash2, AlertTriangle, Clock, Wifi, Loader, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AlertRulesPanel from "../components/server/AlertRulesPanel";
import AlertHistoryPanel from "../components/server/AlertHistoryPanel";
import RconHistoryPanel from "../components/server/RconHistoryPanel";
import PerformanceCharts from "../components/server/PerformanceCharts";
import PerformanceForecast from "../components/server/PerformanceForecast";
import BottomConsoleDrawer from "../components/server/BottomConsoleDrawer";
import LiveUptime from "../components/server/LiveUptime";
import ServerMetricsWidget from "../components/server/ServerMetricsWidget";
import ServerInsightsWidget from "../components/server/ServerInsightsWidget";
import LiveHealthBar from "../components/server/LiveHealthBar";
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
  const [rconHistory, setRconHistory] = useState([]);
  const [lastPolled, setLastPolled] = useState(null);
  const [downtimeAlert, setDowntimeAlert] = useState(false);
  const prevOnlineRef = useRef(null);
  const logRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await base44.functions.invoke('getServerStatus', {});
      if (res.data && !res.data.error) {
        const newStatus = res.data;
        setStatus(newStatus);
        setLastPolled(new Date().toLocaleTimeString("en-US", { hour12: false }));
        // Detect transition to offline
        if (prevOnlineRef.current === true && newStatus.online === false) {
          setDowntimeAlert(true);
          logEvent("Downtime", "Server went offline — downtime detected", "CRITICAL");
        }
        if (newStatus.online === true) setDowntimeAlert(false);
        prevOnlineRef.current = newStatus.online;
      }
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

    base44.entities.RconHistory.list("-created_date", 50).then(setRconHistory).catch(() => {});
    const unsubHistory = base44.entities.RconHistory.subscribe((ev) => {
      if (ev.type === "create") setRconHistory(prev => [ev.data, ...prev.slice(0, 49)]);
    });

    fetchStatus();
    const pollInterval = setInterval(fetchStatus, 10000); // refresh every 10s for live feel
    return () => {
      unsub();
      unsubHistory();
      clearInterval(pollInterval);
    };
  }, []);



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
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-96">
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
           { label: "STATE",  value: statusLoading ? "..." : (status?.state?.toUpperCase() || "UNKNOWN"), icon: Wifi,  color: status?.online ? T.green : T.red, isUptime: false },
           { label: "UPTIME", value: statusLoading ? "..." : (status?.uptime || "--:--:--"),               icon: Clock, color: T.amber, isUptime: true },
         ].map(({ label, value, icon: Icon, color, isUptime }) => (
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
             {isUptime ? (
               <LiveUptime initialUptime={value} statusLoading={statusLoading} />
             ) : (
               <AnimatedValue value={value} color={color} />
             )}
           </motion.div>
         ))}
      </motion.div>

      {/* Server Insights: Players, FPS, Latency, Processes, Connections */}
      <ServerInsightsWidget status={status} statusLoading={statusLoading} />

      {/* CPU/RAM/Disk stats */}
      {/* Advanced Metrics Widgets */}
      <ServerMetricsWidget status={status} statusLoading={statusLoading} />

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

      {/* Bottom Console Drawer */}
      <BottomConsoleDrawer
        consoleLines={consoleLines}
        onConsoleInput={handleCommand}
        onConsoleClear={() => setConsoleLines([{ text: "> Console cleared.", color: T.textFaint }])}
        events={events}
        logFilter={logFilter}
        onLogFilterChange={setLogFilter}
        onLogEvent={logEvent}
        rconHistory={rconHistory}
        onRconRerun={(cmd) => setCmd(cmd)}
        onRconClear={() => setRconHistory([])}
        cmd={cmd}
        onCmdChange={setCmd}
        rconLoading={rconLoading}
      />
    </div>
  );
}