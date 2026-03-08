import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Zap, Wifi, Activity } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";
import { useLiveMetric } from "@/hooks/use-live-metric";

function InsightCard({ icon: Icon, label, value, sublabel, color, isLoading, source }) {
  return (
    <motion.div
      className="border p-4 relative overflow-hidden"
      style={{ borderColor: T.border, background: T.bg1, boxShadow: `inset 0 0 1px ${color}22` }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ borderColor: color + "88", boxShadow: `inset 0 0 1px ${color}44, 0 0 8px ${color}22`, transition: { duration: 0.2 } }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: color, opacity: 0.3 }} />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={12} style={{ color: T.textFaint }} />
          <span className="text-xs tracking-widest font-bold" style={{ color: T.textFaint, fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>
            {label}
          </span>
        </div>
        <span className="text-[9px] px-1 border" style={{ color: source === "live" ? T.green : T.red, borderColor: source === "live" ? T.green + "55" : T.red + "55" }}>
          {source}
        </span>
      </div>

      {isLoading ? (
        <div style={{ color: T.textFaint, fontSize: "12px" }}>...</div>
      ) : (
        <div>
          <motion.div key={value} initial={{ opacity: 0.5, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-xl font-bold mb-1" style={{ color, fontFamily: "'Orbitron', monospace" }}>
            {value}
          </motion.div>
          {sublabel && <div className="text-xs" style={{ color: T.textDim, fontSize: "9px" }}>{sublabel}</div>}
        </div>
      )}
    </motion.div>
  );
}

export default function ServerInsightsWidget({ status, statusLoading }) {
  const playerMetric = useLiveMetric(status, "playerCount");
  const fpsMetric = useLiveMetric(status, "serverFps");
  const latencyMetric = useLiveMetric(status, "responseTime");
  const processMetric = useLiveMetric(status, "processCount");
  const connectionMetric = useLiveMetric(status, "activeConnections");
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((value) => value + 1);
  }, [playerMetric.value, fpsMetric.value, latencyMetric.value, processMetric.value, connectionMetric.value]);

  const players = playerMetric.available && typeof playerMetric.value === "number" ? playerMetric.value : null;
  const fps = fpsMetric.available && typeof fpsMetric.value === "number" ? fpsMetric.value : null;
  const latency = latencyMetric.available && typeof latencyMetric.value === "number" ? latencyMetric.value : null;
  const processCount = processMetric.available && typeof processMetric.value === "number" ? processMetric.value : null;
  const connections = connectionMetric.available && typeof connectionMetric.value === "number" ? connectionMetric.value : null;

  return (
    <motion.div className="grid grid-cols-2 md:grid-cols-5 gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, staggerChildren: 0.08 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        <InsightCard
          key={`players-${animKey}`}
          icon={Users}
          label="PLAYERS"
          value={statusLoading ? "..." : (players === null ? "UNAVAILABLE" : `${players}/64`)}
          sublabel={statusLoading ? "" : (players === null ? "NO LIVE SOURCE" : `${Math.round(players / 0.64)}% capacity`)}
          color={players === null ? T.textFaint : "#00e5ff"}
          isLoading={statusLoading}
          source={playerMetric.source}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <InsightCard
          key={`fps-${animKey}`}
          icon={Zap}
          label="SERVER FPS"
          value={statusLoading ? "..." : (fps === null ? "UNAVAILABLE" : `${fps}`)}
          sublabel={statusLoading ? "" : (fps === null ? "NO LIVE SOURCE" : fps >= 59 ? "OPTIMAL" : "DEGRADED")}
          color={fps === null ? T.textFaint : (fps >= 59 ? "#39ff14" : "#ffb000")}
          isLoading={statusLoading}
          source={fpsMetric.source}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <InsightCard
          key={`response-${animKey}`}
          icon={Activity}
          label="LATENCY"
          value={statusLoading ? "..." : (latency === null ? "UNAVAILABLE" : `${latency}ms`)}
          sublabel={statusLoading ? "" : (latency === null ? "NO LIVE SOURCE" : latency <= 100 ? "EXCELLENT" : "FAIR")}
          color={latency === null ? T.textFaint : (latency <= 100 ? "#39ff14" : "#ffb000")}
          isLoading={statusLoading}
          source={latencyMetric.source}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
        <InsightCard
          key={`processes-${animKey}`}
          icon={Activity}
          label="PROCESSES"
          value={statusLoading ? "..." : (processCount === null ? "UNAVAILABLE" : `${processCount}`)}
          sublabel={statusLoading ? "" : (processCount === null ? "NO LIVE SOURCE" : "running")}
          color={processCount === null ? T.textFaint : "#ffb000"}
          isLoading={statusLoading}
          source={processMetric.source}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
        <InsightCard
          key={`connections-${animKey}`}
          icon={Wifi}
          label="CONNECTIONS"
          value={statusLoading ? "..." : (connections === null ? "UNAVAILABLE" : `${connections}`)}
          sublabel={statusLoading ? "" : (connections === null ? "NO LIVE SOURCE" : "active")}
          color={connections === null ? T.textFaint : "#ff8000"}
          isLoading={statusLoading}
          source={connectionMetric.source}
        />
      </motion.div>
    </motion.div>
  );
}

