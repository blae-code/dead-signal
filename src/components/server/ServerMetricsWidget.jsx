import { motion } from "framer-motion";
import { T } from "@/components/ui/TerminalCard";

function RadialGauge({ value, max = 100, color, label }) {
  const percentage = Math.min(value / max * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="transform -rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke={T.border} strokeWidth="2" />
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center mt-2">
        <div className="text-sm font-bold" style={{ color }}>{percentage.toFixed(0)}%</div>
        <div className="text-xs" style={{ color: T.textFaint }}>{label}</div>
      </div>
    </div>
  );
}

function NetworkWidget({ status }) {
  const rxMB = (status?.networkRxKB ?? 0) / 1024;
  const txMB = (status?.networkTxKB ?? 0) / 1024;

  return (
    <div className="border p-4" style={{ borderColor: T.border, background: T.bg1 }}>
      <div className="text-xs font-bold tracking-widest mb-3" style={{ color: T.textFaint, fontSize: "10px" }}>NETWORK</div>
      <div className="grid grid-cols-2 gap-3 text-center text-xs">
        <div>
          <div style={{ color: T.cyan }}>↓ {rxMB.toFixed(2)} MB/s</div>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>RX</div>
        </div>
        <div>
          <div style={{ color: T.amber }}>↑ {txMB.toFixed(2)} MB/s</div>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>TX</div>
        </div>
      </div>
    </div>
  );
}

function BarIndicator({ label, value, max, color }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: T.textFaint }}>{label}</span>
        <span className="text-xs" style={{ color }}>{value.toFixed(1)}/{max}</span>
      </div>
      <div className="h-1 border" style={{ borderColor: T.border, background: T.bg0 }}>
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export default function ServerMetricsWidget({ status, statusLoading }) {
  const getColor = (val, thresholds = [60, 80]) => {
    if (val > thresholds[1]) return T.red;
    if (val > thresholds[0]) return T.amber;
    return T.green;
  };

  const ramPercent = status?.ramUsedMB ? (status.ramUsedMB / 32768) * 100 : 0;
  const diskPercent = status?.diskMB ? (status.diskMB / 1048576) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* CPU Radial Gauge */}
      <motion.div
        className="border p-4 relative flex justify-center items-center"
        style={{ borderColor: T.border, background: T.bg1 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <RadialGauge
            value={status?.cpu ?? 0}
            max={100}
            color={getColor(status?.cpu ?? 0)}
            label="CPU"
          />
        </div>
      </motion.div>

      {/* RAM Bar Indicator */}
      <motion.div
        className="border p-4"
        style={{ borderColor: T.border, background: T.bg1 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="text-xs font-bold tracking-widest mb-3" style={{ color: T.textFaint, fontSize: "10px" }}>RAM USAGE</div>
        <BarIndicator
          label="Used"
          value={status?.ramUsedMB ?? 0}
          max={32768}
          color={getColor(ramPercent)}
        />
        <div className="text-xs mt-2" style={{ color: getColor(ramPercent) }}>
          {(ramPercent).toFixed(1)}%
        </div>
      </motion.div>

      {/* DISK Bar Indicator */}
      <motion.div
        className="border p-4"
        style={{ borderColor: T.border, background: T.bg1 }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="text-xs font-bold tracking-widest mb-3" style={{ color: T.textFaint, fontSize: "10px" }}>DISK USAGE</div>
        <BarIndicator
          label="Used"
          value={status?.diskMB ?? 0}
          max={1048576}
          color={getColor(diskPercent)}
        />
        <div className="text-xs mt-2" style={{ color: getColor(diskPercent) }}>
          {(diskPercent).toFixed(1)}%
        </div>
      </motion.div>

      {/* Network Widget */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <NetworkWidget status={status} />
      </motion.div>
    </div>
  );
}