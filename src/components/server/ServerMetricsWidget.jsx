import { motion } from "framer-motion";
import { T } from "@/components/ui/TerminalCard";
import { useLiveMetric } from "@/hooks/use-live-metric";

function MetricUnavailable({ label }) {
  return (
    <div className="text-xs" style={{ color: T.textFaint }}>
      {label}: UNAVAILABLE
    </div>
  );
}

function RadialGauge({ value, max = 100, color, label, available }) {
  if (!available || typeof value !== "number") {
    return (
      <div className="flex flex-col items-center justify-center h-[120px]">
        <MetricUnavailable label={label} />
      </div>
    );
  }
  const percentage = Math.min((value / max) * 100, 100);
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

function BarIndicator({ label, value, max, color, available }) {
  if (!available || typeof value !== "number") {
    return <MetricUnavailable label={label} />;
  }
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: T.textFaint }}>{label}</span>
        <span className="text-xs" style={{ color }}>{value.toFixed(1)}/{max}</span>
      </div>
      <div className="h-1 border" style={{ borderColor: T.border, background: T.bg0 }}>
        <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ background: color }} />
      </div>
    </div>
  );
}

function NetworkWidget({ rxMetric, txMetric }) {
  const rxMB = rxMetric.available && typeof rxMetric.value === "number" ? rxMetric.value / 1024 : null;
  const txMB = txMetric.available && typeof txMetric.value === "number" ? txMetric.value / 1024 : null;

  return (
    <div className="relative overflow-hidden h-full" style={{ border: `1px solid ${T.cyan}33`, background: `linear-gradient(160deg, ${T.bg2} 0%, ${T.bg3} 100%)`, boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${T.cyan}88 40%, ${T.cyan}cc 50%, ${T.cyan}88 60%, transparent)` }} />
      <div style={{ position: "absolute", top: 4, left: 4, width: 7, height: 7, borderTop: `1px solid ${T.cyan}44`, borderLeft: `1px solid ${T.cyan}44` }} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div style={{ width: 3, height: 11, background: T.cyan, boxShadow: `0 0 5px ${T.cyan}` }} />
          <span style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "0.18em", textShadow: `0 0 8px ${T.cyan}55` }}>NETWORK</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: "RX ↓", val: rxMB, color: T.cyan }, { label: "TX ↑", val: txMB, color: T.amber }].map(({ label, val, color }) => (
            <div key={label} className="relative overflow-hidden" style={{ border: `1px solid ${color}22`, background: `${color}08`, padding: "8px 10px" }}>
              <div style={{ color: T.textGhost, fontSize: "7px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.14em", marginBottom: 4 }}>{label}</div>
              <motion.div key={val ?? "na"} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
                style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "12px", fontWeight: 700, textShadow: val !== null ? `0 0 8px ${color}66` : "none" }}>
                {val === null ? "N/A" : `${val.toFixed(2)}`}
              </motion.div>
              {val !== null && <div style={{ color: color + "66", fontSize: "7.5px" }}>MB/s</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ServerMetricsWidget({ status }) {
  const cpuMetric = useLiveMetric(status, "cpu");
  const ramMetric = useLiveMetric(status, "ramUsedMB");
  const diskMetric = useLiveMetric(status, "diskMB");
  const rxMetric = useLiveMetric(status, "networkRxKB");
  const txMetric = useLiveMetric(status, "networkTxKB");

  const getColor = (val, thresholds = [60, 80]) => {
    if (val > thresholds[1]) return T.red;
    if (val > thresholds[0]) return T.amber;
    return T.green;
  };

  const ramPercent = ramMetric.available && typeof ramMetric.value === "number"
    ? (ramMetric.value / 32768) * 100
    : null;
  const diskPercent = diskMetric.available && typeof diskMetric.value === "number"
    ? (diskMetric.value / 1048576) * 100
    : null;

  const cpuColor = getColor(Number(cpuMetric.value || 0));
  const ramColor = ramPercent === null ? T.textFaint : getColor(ramPercent);
  const diskColor = diskPercent === null ? T.textFaint : getColor(diskPercent);

  const MetricPanel = ({ color, title, children, delay }) => (
    <motion.div className="relative overflow-hidden" style={{ border: `1px solid ${color}33`, background: `linear-gradient(160deg, ${T.bg2} 0%, ${T.bg3} 100%)`, boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}88 40%, ${color}cc 50%, ${color}88 60%, transparent)` }} />
      <div style={{ position: "absolute", top: 4, left: 4, width: 7, height: 7, borderTop: `1px solid ${color}44`, borderLeft: `1px solid ${color}44` }} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div style={{ width: 3, height: 11, background: color, boxShadow: `0 0 5px ${color}` }} />
          <span style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "0.18em", textShadow: `0 0 8px ${color}55` }}>{title}</span>
        </div>
        {children}
      </div>
    </motion.div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* CPU — radial gauge */}
      <MetricPanel color={cpuColor} title="CPU" delay={0}>
        <div className="flex justify-center">
          <RadialGauge value={typeof cpuMetric.value === "number" ? cpuMetric.value : null} max={100} color={cpuColor} label="CPU" available={cpuMetric.available} />
        </div>
      </MetricPanel>

      {/* RAM */}
      <MetricPanel color={ramColor} title="RAM USAGE" delay={0.08}>
        <BarIndicator label="Used" value={typeof ramMetric.value === "number" ? ramMetric.value : null} max={32768} color={ramColor} available={ramMetric.available} />
        <div style={{ color: ramColor, fontSize: "18px", fontFamily: "'Orbitron', monospace", fontWeight: 700, marginTop: 8, textShadow: `0 0 12px ${ramColor}66` }}>
          {ramPercent === null ? "N/A" : `${ramPercent.toFixed(1)}%`}
        </div>
      </MetricPanel>

      {/* DISK */}
      <MetricPanel color={diskColor} title="DISK USAGE" delay={0.16}>
        <BarIndicator label="Used" value={typeof diskMetric.value === "number" ? diskMetric.value : null} max={1048576} color={diskColor} available={diskMetric.available} />
        <div style={{ color: diskColor, fontSize: "18px", fontFamily: "'Orbitron', monospace", fontWeight: 700, marginTop: 8, textShadow: `0 0 12px ${diskColor}66` }}>
          {diskPercent === null ? "N/A" : `${diskPercent.toFixed(1)}%`}
        </div>
      </MetricPanel>

      {/* NETWORK */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}>
        <NetworkWidget rxMetric={rxMetric} txMetric={txMetric} />
      </motion.div>
    </div>
  );
}