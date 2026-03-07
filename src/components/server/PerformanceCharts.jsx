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
    setCpuHistory((prev) => [...prev.slice(-29), { time: now, cpu: status.cpu ?? 0 }]);
    setRamHistory((prev) => [...prev.slice(-29), { time: now, ram: Math.round((status.ramUsedMB ?? 0) / 1024 * 10) / 10 }]);
    setDiskHistory((prev) => [...prev.slice(-29), { time: now, disk: Math.round((status.diskMB ?? 0) / 1024 * 10) / 10 }]);
  }, [status]);

  // Real-time updates every second (smooth extension without flickering)
  useEffect(() => {
    if (!lastStatus) return;

    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

      // Extend chart with last known values (no variance, smooth continuation)
      setCpuHistory((prev) => prev.length > 0 ? [...prev.slice(-29), { time: now, cpu: prev[prev.length - 1].cpu }] : []);
      setRamHistory((prev) => prev.length > 0 ? [...prev.slice(-29), { time: now, ram: prev[prev.length - 1].ram }] : []);
      setDiskHistory((prev) => prev.length > 0 ? [...prev.slice(-29), { time: now, disk: prev[prev.length - 1].disk }] : []);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastStatus]);

  const ChartCard = ({ title, data, dataKey, color, unit }) => null;

























































































  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1, staggerChildren: 0.08 }}>

      <ChartCard
        title="CPU HISTORY (30s)"
        data={cpuHistory}
        dataKey="cpu"
        color={cpuHistory.length > 0 ? cpuHistory[cpuHistory.length - 1].cpu > 80 ? "#ff2020" : cpuHistory[cpuHistory.length - 1].cpu > 60 ? "#ffb000" : "#39ff14" : "#39ff14"}
        unit="%" />

      <ChartCard
        title="RAM HISTORY (30s)"
        data={ramHistory}
        dataKey="ram"
        color={T.cyan}
        unit=" GB" />

      <ChartCard
        title="DISK HISTORY (30s)"
        data={diskHistory}
        dataKey="disk"
        color={T.amber}
        unit=" GB" />

    </motion.div>);

}