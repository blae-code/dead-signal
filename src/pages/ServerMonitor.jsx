import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, RefreshCw, Send, Trash2, AlertTriangle, Users, Clock, Wifi, Loader } from "lucide-react";

const MOCK_STATUS = {
  online: true,
  players: 3,
  maxPlayers: 16,
  uptime: "14:32:07",
  map: "HumanitZ_World",
  version: "1.0.4",
  ping: 42,
  cpu: 34,
  ram: 61,
};

export default function ServerMonitor() {
  const [events, setEvents] = useState([]);
  const [consoleLines, setConsoleLines] = useState([
    { text: "> DEAD SIGNAL TERMINAL v1.0", color: "#ffb000" },
    { text: "> Connected to HumanitZ server...", color: "#39ff14" },
    { text: "> Type HELP for available commands.", color: "#39ff1488" },
  ]);
  const [cmd, setCmd] = useState("");
  const [rconLoading, setRconLoading] = useState(false);
  const [status] = useState(MOCK_STATUS);
  const [logFilter, setLogFilter] = useState("ALL");
  const logRef = useRef(null);
  const consoleRef = useRef(null);

  useEffect(() => {
    base44.entities.ServerEvent.list("-created_date", 50).then(setEvents).catch(() => {});
    const unsub = base44.entities.ServerEvent.subscribe((ev) => {
      if (ev.type === "create") setEvents(prev => [ev.data, ...prev.slice(0, 49)]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleLines]);

  const handleCommand = async () => {
    if (!cmd.trim()) return;
    const input = cmd.trim().toUpperCase();
    setConsoleLines(prev => [...prev, { text: `> ${cmd}`, color: "#00e5ff" }]);
    setCmd("");

    if (input === "HELP") {
      setConsoleLines(prev => [...prev,
        { text: "Available: STATUS | PLAYERS | CLEAR | RESTART | KICK [name] | BAN [name]", color: "#39ff1488" }
      ]);
    } else if (input === "STATUS") {
      setConsoleLines(prev => [...prev,
        { text: `Server: ${status.online ? "ONLINE" : "OFFLINE"} | Players: ${status.players}/${status.maxPlayers} | Ping: ${status.ping}ms`, color: "#39ff14" }
      ]);
    } else if (input === "PLAYERS") {
      setConsoleLines(prev => [...prev,
        { text: `Active players: ${status.players} / ${status.maxPlayers}`, color: "#39ff14" }
      ]);
    } else if (input === "CLEAR") {
      setConsoleLines([{ text: "> Console cleared.", color: "#39ff1488" }]);
    } else if (input.startsWith("KICK")) {
      const name = cmd.split(" ").slice(1).join(" ");
      setConsoleLines(prev => [...prev, { text: `KICK command sent for: ${name || "(no name)"}`, color: "#ffb000" }]);
      await base44.entities.ServerEvent.create({ event_type: "Admin Action", message: `KICK: ${name}`, severity: "WARN" }).catch(() => {});
    } else if (input.startsWith("BAN")) {
      const name = cmd.split(" ").slice(1).join(" ");
      setConsoleLines(prev => [...prev, { text: `BAN command sent for: ${name || "(no name)"}`, color: "#ff2020" }]);
      await base44.entities.ServerEvent.create({ event_type: "Admin Action", message: `BAN: ${name}`, severity: "CRITICAL" }).catch(() => {});
    } else {
      setConsoleLines(prev => [...prev, { text: `Unknown command: ${cmd}. Type HELP.`, color: "#ff2020" }]);
    }
  };

  const logEvent = async (type, msg, severity = "INFO") => {
    await base44.entities.ServerEvent.create({ event_type: type, message: msg, severity }).catch(() => {});
    setEvents(prev => [{ id: Date.now(), event_type: type, message: msg, severity, created_date: new Date().toISOString() }, ...prev]);
  };

  const filteredEvents = logFilter === "ALL" ? events : events.filter(e => e.severity === logFilter);

  const severityColor = (s) => ({ CRITICAL: "#ff2020", ALERT: "#ff8000", WARN: "#ffb000", INFO: "#39ff1488" }[s] || "#39ff1488");

  const barColor = (val) => val > 80 ? "#ff2020" : val > 60 ? "#ffb000" : "#39ff14";

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Cpu size={16} style={{ color: "#39ff14" }} />
        <span className="text-sm font-bold tracking-widest" style={{ color: "#39ff14", fontFamily: "'Orbitron', monospace" }}>SERVER MONITOR</span>
        <span className="text-xs px-2 py-0.5 border" style={{ color: status.online ? "#39ff14" : "#ff2020", borderColor: status.online ? "#39ff14" : "#ff2020" }}>
          {status.online ? "● ONLINE" : "● OFFLINE"}
        </span>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "PLAYERS", value: `${status.players}/${status.maxPlayers}`, icon: Users, color: "#00e5ff" },
          { label: "PING", value: `${status.ping}ms`, icon: Wifi, color: status.ping > 100 ? "#ff2020" : "#39ff14" },
          { label: "UPTIME", value: status.uptime, icon: Clock, color: "#ffb000" },
          { label: "MAP", value: status.map, icon: Cpu, color: "#39ff14" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="border p-3" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={11} style={{ color }} />
              <span className="text-xs" style={{ color: "#39ff1455" }}>{label}</span>
            </div>
            <div className="text-sm font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* CPU/RAM bars */}
      <div className="grid grid-cols-2 gap-3">
        {[{ label: "CPU LOAD", val: status.cpu }, { label: "RAM USAGE", val: status.ram }].map(({ label, val }) => (
          <div key={label} className="border p-3" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="flex justify-between mb-2">
              <span className="text-xs" style={{ color: "#39ff1466" }}>{label}</span>
              <span className="text-xs font-bold" style={{ color: barColor(val) }}>{val}%</span>
            </div>
            <div className="progress-bar-terminal">
              <div className="progress-bar-terminal-fill" style={{ width: `${val}%`, background: barColor(val) }} />
            </div>
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
            <button onClick={handleCommand} className="px-3 py-2">
              <Send size={12} style={{ color: "#39ff14" }} />
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