import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Zap, Wifi, Activity } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";
import { useLiveMetric } from "@/hooks/use-live-metric";

function InsightCard({ icon: Icon, label, value, sublabel, color, isLoading, source }) {
  return (
    <motion.div
      className="relative overflow-hidden"
      style={{
        border: `1px solid ${color}33`,
        background: `linear-gradient(160deg, ${T.bg2} 0%, ${T.bg3} 100%)`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)`,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ borderColor: color + "66", boxShadow: `0 4px 20px rgba(0,0,0,0.7), 0 0 12px ${color}18`, transition: { duration: 0.15 } }}
    >
      {/* Top accent hairline */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}88 40%, ${color}cc 50%, ${color}88 60%, transparent)`, pointerEvents: "none" }} />
      {/* Corner bracket TL */}
      <div style={{ position: "absolute", top: 4, left: 4, width: 7, height: 7, borderTop: `1px solid ${color}55`, borderLeft: `1px solid ${color}55` }} />
      {/* Corner glow */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 40, height: 40, background: `radial-gradient(circle at 0 0, ${color}10, transparent 70%)`, pointerEvents: "none" }} />

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Icon size={10} style={{ color: color + "99" }} />
            <span style={{ color: T.textGhost, fontSize: "7.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.18em" }}>
              {label}
            </span>
          </div>
          <span style={{
            fontSize: "7px", padding: "1px 4px",
            color: source === "live" ? T.green : T.red,
            border: `1px solid ${source === "live" ? T.green + "44" : T.red + "44"}`,
            fontFamily: "'Orbitron', monospace", letterSpacing: "0.06em",
          }}>
            {source}
          </span>
        </div>

        {isLoading ? (
          <div style={{ color: T.textGhost, fontSize: "18px", fontFamily: "'Orbitron', monospace" }}>···</div>
        ) : (
          <>
            <motion.div
              key={value}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "20px", fontWeight: 700, lineHeight: 1, textShadow: `0 0 16px ${color}77` }}
            >
              {value}
            </motion.div>
            {sublabel && <div style={{ color: color + "77", fontSize: "8px", marginTop: 4, fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em" }}>{sublabel}</div>}
          </>
        )}
      </div>
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
          color={players === null ? T.textFaint : "#00e8ff"}
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
          color={fps === null ? T.textFaint : (fps >= 59 ? "#39ff14" : "#ffaa00")}
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
          color={latency === null ? T.textFaint : (latency <= 100 ? "#39ff14" : "#ffaa00")}
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
          color={processCount === null ? T.textFaint : "#ffaa00"}
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
          color={connections === null ? T.textFaint : "#ff6a00"}
          isLoading={statusLoading}
          source={connectionMetric.source}
        />
      </motion.div>
    </motion.div>
  );
}