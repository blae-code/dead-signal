import { motion } from "framer-motion";
import { T, accentLine } from "@/components/ui/TerminalCard";
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
    <div className="relative overflow-hidden p-4" style={{ border: `1px solid ${T.borderHi}`, background: `linear-gradient(160deg, ${T.bg2} 0%, ${T.bg3} 100%)`, boxShadow: `inset 0 1px 0 rgba(78,58,34,0.2), 0 4px 16px rgba(0,0,0,0.7), inset 0 0 20px ${T.cyan}05` }}>
      <div style={accentLine(T.cyan)} />
      <div style={{ color: T.textFaint, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em", marginBottom: 12 }}>
        NETWORK
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <motion.div key={`rx-${rxMB ?? "na"}`} initial={{ opacity: 0.5, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-sm font-bold" style={{ color: T.cyan, fontFamily: "'Orbitron', monospace" }}>
            {rxMB === null ? "UNAVAILABLE" : `↓ ${rxMB.toFixed(2)} MB/s`}
          </motion.div>
          <div style={{ color: T.textFaint, fontSize: "9px", marginTop: "4px" }}>RX</div>
        </div>
        <div>
          <motion.div key={`tx-${txMB ?? "na"}`} initial={{ opacity: 0.5, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-sm font-bold" style={{ color: T.amber, fontFamily: "'Orbitron', monospace" }}>
            {txMB === null ? "UNAVAILABLE" : `↑ ${txMB.toFixed(2)} MB/s`}
          </motion.div>
          <div style={{ color: T.textFaint, fontSize: "9px", marginTop: "4px" }}>TX</div>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <motion.div className="relative overflow-hidden p-4 flex justify-center items-center" style={{ border: `1px solid ${T.borderHi}`, background: `linear-gradient(160deg, ${T.bg2} 0%, ${T.bg3} 100%)`, boxShadow: "inset 0 1px 0 rgba(78,58,34,0.2), 0 4px 16px rgba(0,0,0,0.7)" }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <RadialGauge value={typeof cpuMetric.value === "number" ? cpuMetric.value : null} max={100} color={getColor(Number(cpuMetric.value || 0))} label="CPU" available={cpuMetric.available} />
        </div>
      </motion.div>

      <motion.div className="relative overflow-hidden p-4" style={{ border: `1px solid ${T.borderHi}`, background: `linear-gradient(160deg, ${T.bg2} 0%, ${T.bg3} 100%)`, boxShadow: "inset 0 1px 0 rgba(78,58,34,0.2), 0 4px 16px rgba(0,0,0,0.7)" }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <div style={accentLine(ramPercent !== null ? (ramPercent > 80 ? T.red : ramPercent > 60 ? T.amber : T.green) : T.textFaint)} />
        <div className="text-xs font-bold tracking-widest mb-3" style={{ color: T.textFaint, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em" }}>RAM USAGE</div>
        <BarIndicator label="Used" value={typeof ramMetric.value === "number" ? ramMetric.value : null} max={32768} color={ramPercent === null ? T.textFaint : getColor(ramPercent)} available={ramMetric.available} />
        <div className="text-xs mt-2" style={{ color: ramPercent === null ? T.textFaint : getColor(ramPercent) }}>
          {ramPercent === null ? "UNAVAILABLE" : `${ramPercent.toFixed(1)}%`}
        </div>
      </motion.div>

      <motion.div className="relative overflow-hidden p-4" style={{ border: `1px solid ${T.borderHi}`, background: `linear-gradient(160deg, ${T.bg2} 0%, ${T.bg3} 100%)`, boxShadow: "inset 0 1px 0 rgba(78,58,34,0.2), 0 4px 16px rgba(0,0,0,0.7)" }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <div style={accentLine(diskPercent !== null ? (diskPercent > 80 ? T.red : diskPercent > 60 ? T.amber : T.green) : T.textFaint)} />
        <div className="text-xs font-bold tracking-widest mb-3" style={{ color: T.textFaint, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em" }}>DISK USAGE</div>
        <BarIndicator label="Used" value={typeof diskMetric.value === "number" ? diskMetric.value : null} max={1048576} color={diskPercent === null ? T.textFaint : getColor(diskPercent)} available={diskMetric.available} />
        <div className="text-xs mt-2" style={{ color: diskPercent === null ? T.textFaint : getColor(diskPercent) }}>
          {diskPercent === null ? "UNAVAILABLE" : `${diskPercent.toFixed(1)}%`}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <NetworkWidget rxMetric={rxMetric} txMetric={txMetric} />
      </motion.div>
    </div>
  );
}