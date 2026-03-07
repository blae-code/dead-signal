import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, RefreshCw, Send, Trash2, AlertTriangle, Users, Clock, Wifi, Loader, X } from "lucide-react";
import AlertRulesPanel from "../components/server/AlertRulesPanel";
import AlertHistoryPanel from "../components/server/AlertHistoryPanel";

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
        // Log admin actions to ServerEvent feed
        await base44.entities.ServerEvent.create({
          event_type: "Admin Action",
          message: `RCON: ${raw}`,
          severity: "WARN"
        }).catch(() => {});
      } else {
        setConsoleLines(prev => [...prev, { text: `✗ ${res.data?.error || "Unknown error"}`, color: "#ff2020" }]);
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
      {alertBanners.map(b => (
        <div key={b.id} className="flex items-center justify-between px-3 py-2 border text-xs" style={{ borderColor: "#ff2020", background: "#1a0000", color: "#ff2020" }}>
          <span><AlertTriangle size={10} className="inline mr-2" />{b.message}</span>
          <button onClick={() => dismissBanner(b.id)}><X size={10} /></button>
        </div>
      ))}

      <div className="flex items-center gap-3 mb-2">
        <Cpu size={16} style={{ color: "#39ff14" }} />
        <span className="text-sm font-bold tracking-widest" style={{ color: "#39ff14", fontFamily: "'Orbitron', monospace" }}>SERVER MONITOR</span>
        {statusLoading
          ? <span className="text-xs px-2 py-0.5 border" style={{ color: "#39ff1455", borderColor: "#39ff1433" }}>● FETCHING...</span>
          : <span className="text-xs px-2 py-0.5 border" style={{ color: status?.online ? "#39ff14" : "#ff2020", borderColor: status?.online ? "#39ff14" : "#ff2020" }}>
              {status?.online ? "● ONLINE" : "● OFFLINE"}
            </span>
        }
        <button onClick={fetchStatus} className="ml-auto" title="Refresh">
          <RefreshCw size={12} style={{ color: "#39ff1455" }} />
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "STATE", value: statusLoading ? "..." : (status?.state?.toUpperCase() || "UNKNOWN"), icon: Wifi, color: status?.online ? "#39ff14" : "#ff2020" },
          { label: "UPTIME", value: statusLoading ? "..." : (status?.uptime || "--:--:--"), icon: Clock, color: "#ffb000" },
          { label: "NET ↓", value: statusLoading ? "..." : `${status?.networkRxKB ?? 0} KB`, icon: RefreshCw, color: "#00e5ff" },
          { label: "NET ↑", value: statusLoading ? "..." : `${status?.networkTxKB ?? 0} KB`, icon: RefreshCw, color: "#00e5ff" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="border p-3" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={11} style={{ color }} />
              <span className="text-xs" style={{ color: "#39ff1455" }}>{label}</span>
            </div>
            <div className="text-sm font-bold truncate" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* CPU/RAM/Disk stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "CPU LOAD", val: status?.cpu ?? 0, display: `${status?.cpu ?? 0}%`, isPercent: true },
          { label: "RAM USED", val: 0, display: `${status?.ramUsedMB ?? 0} MB`, isPercent: false },
          { label: "DISK USED", val: 0, display: `${status?.diskMB ?? 0} MB`, isPercent: false },
        ].map(({ label, val, display, isPercent }) => (
          <div key={label} className="border p-3" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="flex justify-between mb-2">
              <span className="text-xs" style={{ color: "#39ff1466" }}>{label}</span>
              <span className="text-xs font-bold" style={{ color: isPercent ? barColor(val) : "#39ff14" }}>
                {statusLoading ? "..." : display}
              </span>
            </div>
            {isPercent && (
              <div className="progress-bar-terminal">
                <div className="progress-bar-terminal-fill" style={{ width: statusLoading ? "0%" : `${val}%`, background: barColor(val) }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* RCON Console */}
        <div className="border" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "#1e3a1e" }}>
            <span className="text-xs font-bold" style={{ color: "#00e5ff" }}>RCON TERMINAL</span>
            <button onClick={() => setConsoleLines([{ text: "> Console cleared.", color: "#39ff1488" }])} className="ml-auto">
              <Trash2 size={11} style={{ color: "#39ff1444" }} />
            </button>
          </div>
          <div ref={consoleRef} className="p-3 overflow-y-auto text-xs space-y-0.5" style={{ height: "200px" }}>
            {consoleLines.map((l, i) => (
              <div key={i} style={{ color: l.color, fontFamily: "'Share Tech Mono', monospace" }}>{l.text}</div>
            ))}
          </div>
          <div className="flex border-t" style={{ borderColor: "#1e3a1e" }}>
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
        </div>

        {/* Event log */}
        <div className="border" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b flex-wrap" style={{ borderColor: "#1e3a1e" }}>
            <span className="text-xs font-bold" style={{ color: "#39ff14" }}>EVENT LOG</span>
            <div className="ml-auto flex gap-1">
              {["ALL", "INFO", "WARN", "CRITICAL"].map(f => (
                <button key={f} onClick={() => setLogFilter(f)}
                  className="text-xs px-2 py-0.5 border"
                  style={{ borderColor: logFilter === f ? "#39ff14" : "#1e3a1e", color: logFilter === f ? "#39ff14" : "#39ff1444" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div ref={logRef} className="p-3 overflow-y-auto space-y-1" style={{ height: "235px" }}>
            {filteredEvents.length === 0
              ? <div className="text-xs" style={{ color: "#39ff1433" }}>// NO EVENTS</div>
              : filteredEvents.map(e => (
                <div key={e.id} className="text-xs flex gap-2">
                  <span style={{ color: "#39ff1433", flexShrink: 0 }}>
                    [{new Date(e.created_date).toLocaleTimeString("en-US", { hour12: false })}]
                  </span>
                  <span style={{ color: severityColor(e.severity) }}>[{e.severity}]</span>
                  <span style={{ color: "#39ff1488" }}>{e.message}</span>
                </div>
              ))
            }
          </div>
          <div className="px-3 py-2 border-t flex gap-2" style={{ borderColor: "#1e3a1e" }}>
            <button onClick={() => logEvent("Broadcast", "Server restarting in 10 min", "WARN")}
              className="text-xs px-3 py-1 border" style={{ borderColor: "#ffb000", color: "#ffb000" }}>
              WARN RESTART
            </button>
            <button onClick={() => logEvent("Server Start", "Server online", "INFO")}
              className="text-xs px-3 py-1 border" style={{ borderColor: "#39ff14", color: "#39ff14" }}>
              LOG ONLINE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}