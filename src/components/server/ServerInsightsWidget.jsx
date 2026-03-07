import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Zap, Wifi, Activity } from "lucide-react";
import { T } from "@/components/ui/TerminalCard";

function InsightCard({ icon: Icon, label, value, sublabel, color, isLoading }) {
  return (
    <motion.div
      className="border p-4 relative overflow-hidden"
      style={{
        borderColor: T.border,
        background: T.bg1,
        boxShadow: `inset 0 0 1px ${color}22`,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{
        borderColor: color + "88",
        boxShadow: `inset 0 0 1px ${color}44, 0 0 8px ${color}22`,
        transition: { duration: 0.2 },
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: color,
          opacity: 0.3,
        }}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={12} style={{ color: T.textFaint }} />
          <span
            className="text-xs tracking-widest font-bold"
            style={{ color: T.textFaint, fontSize: "10px", fontFamily: "'Orbitron', monospace" }}
          >
            {label}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: T.textFaint, fontSize: "12px" }}>...</div>
      ) : (
        <div>
          <motion.div
            key={value}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-xl font-bold mb-1"
            style={{ color, fontFamily: "'Orbitron', monospace" }}
          >
            {value}
          </motion.div>
          {sublabel && (
            <div
              className="text-xs"
              style={{ color: T.textDim, fontSize: "9px" }}
            >
              {sublabel}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function ServerInsightsWidget({ status, statusLoading }) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [status?.playerCount, status?.serverFps, status?.responseTime, status?.processCount, status?.activeConnections]);

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-5 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, staggerChildren: 0.08 }}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        <InsightCard
          key={`players-${animKey}`}
          icon={Users}
          label="PLAYERS"
          value={statusLoading ? "..." : `${status?.playerCount ?? 0}/64`}
          sublabel={statusLoading ? "" : `${Math.round((status?.playerCount ?? 0) / 0.64)}% capacity`}
          color="#00e5ff"
          isLoading={statusLoading}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <InsightCard
          key={`fps-${animKey}`}
          icon={Zap}
          label="SERVER FPS"
          value={statusLoading ? "..." : `${status?.serverFps ?? 0}`}
          sublabel={statusLoading ? "" : status?.serverFps >= 59 ? "OPTIMAL" : "DEGRADED"}
          color={statusLoading ? "#39ff14" : (status?.serverFps >= 59 ? "#39ff14" : "#ffb000")}
          isLoading={statusLoading}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <InsightCard
          key={`response-${animKey}`}
          icon={Activity}
          label="LATENCY"
          value={statusLoading ? "..." : `${status?.responseTime ?? 0}ms`}
          sublabel={statusLoading ? "" : status?.responseTime <= 100 ? "EXCELLENT" : "FAIR"}
          color={statusLoading ? "#39ff14" : (status?.responseTime <= 100 ? "#39ff14" : "#ffb000")}
          isLoading={statusLoading}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
        <InsightCard
          key={`processes-${animKey}`}
          icon={Activity}
          label="PROCESSES"
          value={statusLoading ? "..." : `${status?.processCount ?? 0}`}
          sublabel={statusLoading ? "" : "running"}
          color="#ffb000"
          isLoading={statusLoading}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
        <InsightCard
          key={`connections-${animKey}`}
          icon={Wifi}
          label="CONNECTIONS"
          value={statusLoading ? "..." : `${status?.activeConnections ?? 0}`}
          sublabel={statusLoading ? "" : "active"}
          color="#ff8000"
          isLoading={statusLoading}
        />
      </motion.div>
    </motion.div>
  );
}