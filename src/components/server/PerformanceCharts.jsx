import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { T } from "@/components/ui/TerminalCard";

export default function PerformanceCharts({ status, statusLoading }) {
  const [cpuHistory, setCpuHistory] = useState([]);
  const [ramHistory, setRamHistory] = useState([]);
  const [diskHistory, setDiskHistory] = useState([]);
  const [lastStatus, setLastStatus] = useState(null);

  // Update history when status changes (30s poll)
  useEffect(() => {
    if (!status) return;
    setLastStatus(status);

    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setCpuHistory(prev => [...prev.slice(-29), { time: now, cpu: status.cpu ?? 0 }]);
    setRamHistory(prev => [...prev.slice(-29), { time: now, ram: Math.round((status.ramUsedMB ?? 0) / 1024 * 10) / 10 }]);
    setDiskHistory(prev => [...prev.slice(-29), { time: now, disk: Math.round((status.diskMB ?? 0) / 1024 * 10) / 10 }]);
  }, [status]);

  // Real-time updates every second (smooth extension without flickering)
  useEffect(() => {
    if (!lastStatus) return;

    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      
      // Extend chart with last known values (no variance, smooth continuation)
      setCpuHistory(prev => prev.length > 0 ? [...prev.slice(-29), { time: now, cpu: prev[prev.length - 1].cpu }] : []);
      setRamHistory(prev => prev.length > 0 ? [...prev.slice(-29), { time: now, ram: prev[prev.length - 1].ram }] : []);
      setDiskHistory(prev => prev.length > 0 ? [...prev.slice(-29), { time: now, disk: prev[prev.length - 1].disk }] : []);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastStatus]);

  const ChartCard = ({ title, data, dataKey, color, unit }) => (
    <motion.div
      className="border p-4 relative overflow-hidden"
      style={{ 
        borderColor: T.border, 
        background: T.bg1,
        boxShadow: `inset 0 0 1px ${color}22`
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        borderColor: color + "88",
        boxShadow: `inset 0 0 1px ${color}44, 0 0 8px ${color}22`,
        transition: { duration: 0.2 }
      }}
    >
      {/* Subtle top accent line */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "1px",
        background: color,
        opacity: 0.3
      }} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-widest font-bold" style={{ color: T.textFaint, fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>{title}</span>
        {data.length > 0 && (
          <motion.span 
            className="text-sm font-bold"
            key={data[data.length - 1][dataKey]}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{ color, fontFamily: "'Orbitron', monospace" }}
          >
            {data[data.length - 1][dataKey]}{unit}
          </motion.span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 8, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={T.border}
            vertical={false}
            opacity={0.3}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 9, fill: T.textFaint }}
            stroke={T.border}
            opacity={0.5}
            interval={Math.floor(data.length / 3) || 0}
          />
          <YAxis
            tick={{ fontSize: 9, fill: T.textFaint }}
            stroke={T.border}
            opacity={0.5}
            width={35}
          />
          <Tooltip
            contentStyle={{
              background: T.bg0,
              border: `1px solid ${color}`,
              borderRadius: 2,
              padding: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: T.textFaint, fontSize: 10 }}
            formatter={(val) => [val, dataKey.toUpperCase()]}
            cursor={{ stroke: color + "44", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            dot={false}
            strokeWidth={2.5}
            isAnimationActive={false}
            filter={`drop-shadow(0 0 4px ${color}44)`}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1, staggerChildren: 0.08 }}
    >
      <ChartCard
        title="CPU HISTORY (30s)"
        data={cpuHistory}
        dataKey="cpu"
        color={cpuHistory.length > 0 ? (cpuHistory[cpuHistory.length - 1].cpu > 80 ? "#ff2020" : cpuHistory[cpuHistory.length - 1].cpu > 60 ? "#ffb000" : "#39ff14") : "#39ff14"}
        unit="%"
      />
      <ChartCard
        title="RAM HISTORY (30s)"
        data={ramHistory}
        dataKey="ram"
        color={T.cyan}
        unit=" GB"
      />
      <ChartCard
        title="DISK HISTORY (30s)"
        data={diskHistory}
        dataKey="disk"
        color={T.amber}
        unit=" GB"
      />
    </motion.div>
  );
}