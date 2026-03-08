import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { T } from "@/components/ui/TerminalCard";

function ChartCard({ title, data, dataKey, color, unit, threshold }) {
  const latest = data.length > 0 ? data[data.length - 1][dataKey] : 0;
  const latestColor = threshold && latest > threshold * 0.9 ? T.red : threshold && latest > threshold * 0.7 ? T.amber : color;

  return (
    <div className="border" style={{ borderColor: T.border, background: T.bg1 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: T.border }}>
        <span style={{ color: T.textFaint, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em" }}>{title}</span>
        <motion.span
          key={latest}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          style={{ color: latestColor, fontSize: "11px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}
        >
          {latest.toFixed(1)}{unit}
        </motion.span>
      </div>
      <div style={{ height: "100px", padding: "4px 0" }}>
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: T.textFaint }}>// COLLECTING DATA...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 8, fill: T.textFaint }} />
              {threshold && <ReferenceLine y={threshold} stroke={T.amber + "66"} strokeDasharray="3 3" />}
              <Tooltip
                contentStyle={{ background: "#0d0a07", border: `1px solid ${color}88`, fontSize: "10px", color }}
                formatter={(v) => [`${v.toFixed(1)}${unit}`, ""]}
                labelFormatter={() => ""}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={latestColor}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function PerformanceCharts({ status, statusLoading }) {
  const [cpuHistory, setCpuHistory] = useState([]);
  const [ramHistory, setRamHistory] = useState([]);
  const [diskHistory, setDiskHistory] = useState([]);
  const [fpsHistory, setFpsHistory] = useState([]);
  const [lastStatus, setLastStatus] = useState(null);

  useEffect(() => {
    if (!status) return;
    setLastStatus(status);
    const now = new Date().toLocaleTimeString("en-US", { hour12: false });
    setCpuHistory(p => [...p.slice(-59), { time: now, cpu: status.cpu ?? 0 }]);
    setRamHistory(p => [...p.slice(-59), { time: now, ram: Math.round((status.ramUsedMB ?? 0) / 1024 * 10) / 10 }]);
    setDiskHistory(p => [...p.slice(-59), { time: now, disk: Math.round((status.diskMB ?? 0) / 1024 * 10) / 10 }]);
    setFpsHistory(p => [...p.slice(-59), { time: now, fps: status.serverFps ?? 0 }]);
  }, [status]);

  useEffect(() => {
    if (!lastStatus) return;
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString("en-US", { hour12: false });
      setCpuHistory(p => p.length > 0 ? [...p.slice(-59), { time: now, cpu: p[p.length - 1].cpu }] : []);
      setRamHistory(p => p.length > 0 ? [...p.slice(-59), { time: now, ram: p[p.length - 1].ram }] : []);
      setDiskHistory(p => p.length > 0 ? [...p.slice(-59), { time: now, disk: p[p.length - 1].disk }] : []);
      setFpsHistory(p => p.length > 0 ? [...p.slice(-59), { time: now, fps: p[p.length - 1].fps }] : []);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastStatus]);

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ChartCard title="CPU %" data={cpuHistory} dataKey="cpu" color={T.green} unit="%" threshold={80} />
      <ChartCard title="RAM (GB)" data={ramHistory} dataKey="ram" color={T.cyan} unit=" GB" threshold={28} />
      <ChartCard title="DISK (GB)" data={diskHistory} dataKey="disk" color={T.amber} unit=" GB" />
      <ChartCard title="SERVER FPS" data={fpsHistory} dataKey="fps" color="#b48aff" unit="" />
    </motion.div>
  );
}