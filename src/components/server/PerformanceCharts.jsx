import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { T } from "@/components/ui/TerminalCard";
import { useLiveMetric } from "@/hooks/use-live-metric";

const toTimeLabel = () =>
  new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const pushPoint = (previous, key, value) => [
  ...previous.slice(-59),
  { time: toTimeLabel(), [key]: value },
];

function ChartCard({ title, data, dataKey, color, unit, available, source }) {
  const latest = data.length > 0 ? data[data.length - 1][dataKey] : null;
  return (
    <motion.div
      className="border p-3"
      style={{ borderColor: T.border, background: T.bg1 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs tracking-widest" style={{ color: T.textFaint, fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color }}>
            {typeof latest === "number" ? `${latest}${unit}` : "UNAVAILABLE"}
          </span>
          <span className="text-[9px] px-1 border" style={{ color: available ? T.green : T.red, borderColor: available ? T.green + "55" : T.red + "55" }}>
            {source || "unavailable"}
          </span>
        </div>
      </div>
      <div style={{ width: "100%", height: "150px" }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis stroke={T.textFaint} width={34} tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: T.bg1, border: `1px solid ${T.border}`, color: T.text, fontSize: "11px" }}
              formatter={(value) => (typeof value === "number" ? `${value}${unit}` : "UNAVAILABLE")}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default function PerformanceCharts({ status }) {
  const cpuMetric = useLiveMetric(status, "cpu");
  const ramMetric = useLiveMetric(status, "ramUsedMB");
  const diskMetric = useLiveMetric(status, "diskMB");

  const [cpuHistory, setCpuHistory] = useState([]);
  const [ramHistory, setRamHistory] = useState([]);
  const [diskHistory, setDiskHistory] = useState([]);

  useEffect(() => {
    if (!status) return;
    setCpuHistory((prev) => pushPoint(prev, "cpu", cpuMetric.available ? Number(cpuMetric.value) : null));
    setRamHistory((prev) => pushPoint(prev, "ram", ramMetric.available ? Math.round((Number(ramMetric.value) / 1024) * 10) / 10 : null));
    setDiskHistory((prev) => pushPoint(prev, "disk", diskMetric.available ? Math.round((Number(diskMetric.value) / 1024) * 10) / 10 : null));
  }, [status, cpuMetric.available, cpuMetric.value, ramMetric.available, ramMetric.value, diskMetric.available, diskMetric.value]);

  const cpuColor = useMemo(() => {
    const valid = cpuHistory.filter((entry) => typeof entry.cpu === "number");
    if (valid.length === 0) return T.textFaint;
    const cpu = valid[valid.length - 1].cpu;
    if (cpu > 80) return T.red;
    if (cpu > 60) return T.amber;
    return T.green;
  }, [cpuHistory]);

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <ChartCard title="CPU HISTORY" data={cpuHistory} dataKey="cpu" color={cpuColor} unit="%" available={cpuMetric.available} source={cpuMetric.source} />
      <ChartCard title="RAM HISTORY" data={ramHistory} dataKey="ram" color={T.cyan} unit=" GB" available={ramMetric.available} source={ramMetric.source} />
      <ChartCard title="DISK HISTORY" data={diskHistory} dataKey="disk" color={T.amber} unit=" GB" available={diskMetric.available} source={diskMetric.source} />
    </motion.div>
  );
}

