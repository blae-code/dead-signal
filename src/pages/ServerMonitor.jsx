import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, RefreshCw, AlertTriangle, Clock, Wifi, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AlertRulesPanel from "../components/server/AlertRulesPanel";
import AlertHistoryPanel from "../components/server/AlertHistoryPanel";
import PerformanceCharts from "../components/server/PerformanceCharts";
import PerformanceForecast from "../components/server/PerformanceForecast";
import BottomConsoleDrawer from "../components/server/BottomConsoleDrawer";
import LiveUptime from "../components/server/LiveUptime";
import ServerMetricsWidget from "../components/server/ServerMetricsWidget";
import ServerInsightsWidget from "../components/server/ServerInsightsWidget";
import LiveHealthBar from "../components/server/LiveHealthBar";
import { T, PageHeader } from "@/components/ui/TerminalCard";
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";
import { invokeFunctionOrFallback } from "@/api/function-invoke";

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

const fetchStatus = async () => {
  return invokeFunctionOrFallback("getServerStatus", {}, () => ({
    online: null,
    state: null,
    cpu: null,
    ramUsedMB: null,
    diskMB: null,
    uptime: null,
    uptimeSeconds: null,
    networkRxKB: null,
    networkTxKB: null,
    playerCount: null,
    serverFps: null,
    responseTime: null,
    processCount: null,
    activeConnections: null,
    retrieved_at: new Date().toISOString(),
    target_id: null,
    metric_source: {},
    metric_available: {},
    metrics: {},
    stale: true,
    stale_after_ms: 30_000,
    data_source: "unavailable",
  }));
};

export default function ServerMonitor() {
  const queryClient = useQueryClient();
  const [consoleLines, setConsoleLines] = useState([
    { text: "> DEAD SIGNAL TERMINAL v1.0", color: "#ffb000" },
    { text: "> Connecting to HumanitZ server...", color: "#39ff14" },
    { text: "> Type HELP for available commands.", color: "#39ff1488" },
  ]);
  const [cmd, setCmd] = useState("");
  const [rconLoading, setRconLoading] = useState(false);
  const [logFilter, setLogFilter] = useState("ALL");
  const [alertBanners, setAlertBanners] = useState([]);
  const [alertRefreshTick, setAlertRefreshTick] = useState(0);
  const [showForecast, setShowForecast] = useState(false);
  const [lastPolled, setLastPolled] = useState(null);
  const [downtimeAlert, setDowntimeAlert] = useState(false);
  const prevOnlineRef = useRef(null);
  const alertBannerCounterRef = useRef(0);

  const { data: status = null, isLoading: loadingStatus, isFetching: fetchingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["server-monitor", "status"],
    queryFn: fetchStatus,
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 1,
  });
  const { samples: telemetrySamples = [] } = useLiveTelemetry({
    windowMinutes: 180,
    enabled: true,
    refetchInterval: 5_000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["server-monitor", "events"],
    queryFn: () => base44.entities.ServerEvent.list("-created_date", 50),
    staleTime: 10_000,
  });

  const { data: rconHistory = [] } = useQuery({
    queryKey: ["server-monitor", "rcon-history"],
    queryFn: () => base44.entities.RconHistory.list("-created_date", 50),
    staleTime: 10_000,
  });

  const statusLoading = loadingStatus && !status;

  useEffect(() => {
    const unsubEvents = base44.entities.ServerEvent.subscribe((event) => {
      if (event.type === "create") {
        queryClient.setQueryData(["server-monitor", "events"], (prev = []) => [event.data, ...prev].slice(0, 50));
      }
    });
    const unsubHistory = base44.entities.RconHistory.subscribe((event) => {
      if (event.type === "create") {
        queryClient.setQueryData(["server-monitor", "rcon-history"], (prev = []) => [event.data, ...prev].slice(0, 50));
      }
    });
    return () => {
      unsubEvents();
      unsubHistory();
    };
  }, [queryClient]);

  const logEvent = async (type, message, severity = "INFO") => {
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      event_type: type,
      message,
      severity,
      created_date: new Date().toISOString(),
    };
    queryClient.setQueryData(["server-monitor", "events"], (prev = []) => [optimistic, ...prev].slice(0, 50));
    const created = await base44.entities.ServerEvent.create({ event_type: type, message, severity }).catch(() => null);
    if (created) {
      queryClient.setQueryData(["server-monitor", "events"], (prev = []) =>
        [created, ...prev.filter((entry) => entry.id !== optimistic.id)].slice(0, 50),
      );
    }
  };

  useEffect(() => {
    if (!status) return;
    const liveTimestamp = typeof status?.retrieved_at === "string" ? status.retrieved_at : null;
    setLastPolled(
      liveTimestamp
        ? new Date(liveTimestamp).toLocaleTimeString("en-US", { hour12: false })
        : null,
    );

    const onlineAvailable = status?.metric_available?.online === true || typeof status?.online === "boolean";
    if (onlineAvailable && prevOnlineRef.current === true && status.online === false) {
      setDowntimeAlert(true);
      logEvent("Downtime", "Server went offline — downtime detected", "CRITICAL");
    }
    if (onlineAvailable && status.online === true) {
      setDowntimeAlert(false);
    }
    prevOnlineRef.current = onlineAvailable ? status.online : prevOnlineRef.current;
  }, [status]);

  const handleCommand = async () => {
    if (!cmd.trim() || rconLoading) return;
    const normalized = cmd.trim().toUpperCase();
    const raw = cmd.trim();
    setConsoleLines((prev) => [...prev, { text: `> ${raw}`, color: "#00e5ff" }]);
    setCmd("");

    if (normalized === "HELP") {
      setConsoleLines((prev) => [
        ...prev,
        { text: "Tip: Commands are sent live to your server via RCON.", color: "#39ff1488" },
        { text: "Examples: kick PlayerName | say Hello! | status | players", color: "#39ff1488" },
        { text: "Type CLEAR to wipe the console.", color: "#39ff1488" },
      ]);
      return;
    }

    if (normalized === "CLEAR") {
      setConsoleLines([{ text: "> Console cleared.", color: "#39ff1488" }]);
      return;
    }

    setRconLoading(true);
    setConsoleLines((prev) => [...prev, { text: "Sending to server...", color: "#39ff1444" }]);
    try {
      const response = await base44.functions.invoke("sendRconCommand", { command: raw });
      if (response.data?.success) {
        setConsoleLines((prev) => [...prev, { text: `✓ ${response.data.output}`, color: "#39ff14" }]);
        const [createdEvent, createdHistory] = await Promise.all([
          base44.entities.ServerEvent.create({ event_type: "Admin Action", message: `RCON: ${raw}`, severity: "WARN" }).catch(() => null),
          base44.entities.RconHistory.create({ command: raw, output: response.data.output, success: true }).catch(() => null),
        ]);
        if (createdEvent) {
          queryClient.setQueryData(["server-monitor", "events"], (prev = []) => [createdEvent, ...prev].slice(0, 50));
        }
        if (createdHistory) {
          queryClient.setQueryData(["server-monitor", "rcon-history"], (prev = []) => [createdHistory, ...prev].slice(0, 50));
        }
      } else {
        const errorText = response.data?.error || "Unknown error";
        setConsoleLines((prev) => [...prev, { text: `✗ ${errorText}`, color: "#ff2020" }]);
        const failed = await base44.entities.RconHistory
          .create({ command: raw, output: errorText, success: false })
          .catch(() => null);
        if (failed) {
          queryClient.setQueryData(["server-monitor", "rcon-history"], (prev = []) => [failed, ...prev].slice(0, 50));
        }
      }
    } catch (error) {
      setConsoleLines((prev) => [...prev, { text: `✗ ${error.message}`, color: "#ff2020" }]);
    } finally {
      setRconLoading(false);
      refetchStatus();
    }
  };

  const handleTriggered = (triggered) => {
    const banners = triggered.map((item) => ({
      id: `alert-${Date.now()}-${alertBannerCounterRef.current++}`,
      message: `ALERT: ${item.rule} — ${item.metric} is ${item.actual} (threshold: ${item.threshold})`,
    }));
    setAlertBanners((prev) => [...banners, ...prev].slice(0, 5));
    setAlertRefreshTick((tick) => tick + 1);
    queryClient.invalidateQueries({ queryKey: ["server-monitor", "events"] });
  };

  const dismissBanner = (id) => setAlertBanners((prev) => prev.filter((entry) => entry.id !== id));

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-96">
      <AnimatePresence>
        {alertBanners.map((banner) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between px-3 py-2 border text-xs"
            style={{ borderColor: "#ff2020", background: "#1a0000", color: "#ff2020" }}
          >
            <span><AlertTriangle size={10} className="inline mr-2" />{banner.message}</span>
            <button onClick={() => dismissBanner(banner.id)}><X size={10} /></button>
          </motion.div>
        ))}
      </AnimatePresence>

      <PageHeader icon={Cpu} title="SERVER MONITOR" color={T.green}>
        {statusLoading
          ? <span className="text-xs px-2 py-0.5 border" style={{ color: T.textFaint, borderColor: T.border }}>● FETCHING...</span>
          : <span className="text-xs px-2 py-0.5 border" style={{ color: status?.metric_available?.online ? (status?.online ? T.green : T.red) : T.textFaint, borderColor: status?.metric_available?.online ? (status?.online ? T.green + "66" : T.red + "66") : T.border }}>
              {status?.metric_available?.online ? (status?.online ? "● ONLINE" : "● OFFLINE") : "● UNAVAILABLE"}
            </span>
        }
        <button onClick={() => refetchStatus()} className="p-1 hover:opacity-70 transition-opacity" title="Refresh">
          <RefreshCw size={11} style={{ color: T.textDim }} />
        </button>
      </PageHeader>

      <LiveHealthBar
        status={status}
        statusLoading={statusLoading || fetchingStatus}
        lastPolled={lastPolled}
        downtimeAlert={downtimeAlert}
      />

      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {[
          {
            label: "STATE",
            value: statusLoading
              ? "..."
              : (status?.metric_available?.state ? (status?.state?.toUpperCase() || "UNAVAILABLE") : "UNAVAILABLE"),
            icon: Wifi,
            color: status?.metric_available?.state ? (status?.online ? T.green : T.red) : T.textFaint,
            isUptime: false,
          },
          {
            label: "UPTIME",
            value: statusLoading
              ? "..."
              : (status?.metric_available?.uptime ? (status?.uptime || "UNAVAILABLE") : "UNAVAILABLE"),
            icon: Clock,
            color: status?.metric_available?.uptime ? T.amber : T.textFaint,
            isUptime: true,
          },
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

      <ServerInsightsWidget status={status} statusLoading={statusLoading} />
      <ServerMetricsWidget status={status} statusLoading={statusLoading} />
      <PerformanceCharts status={status} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => setShowForecast((prev) => !prev)}>
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
              <PerformanceForecast samples={telemetrySamples} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AlertRulesPanel onTriggered={handleTriggered} />
        <AlertHistoryPanel refreshTick={alertRefreshTick} />
      </motion.div>

      <BottomConsoleDrawer
        consoleLines={consoleLines}
        onConsoleInput={handleCommand}
        onConsoleClear={() => setConsoleLines([{ text: "> Console cleared.", color: T.textFaint }])}
        events={events}
        logFilter={logFilter}
        onLogFilterChange={setLogFilter}
        onLogEvent={logEvent}
        rconHistory={rconHistory}
        onRconRerun={(value) => setCmd(value)}
        onRconClear={() => queryClient.setQueryData(["server-monitor", "rcon-history"], [])}
        cmd={cmd}
        onCmdChange={setCmd}
        rconLoading={rconLoading}
      />
    </div>
  );
}
