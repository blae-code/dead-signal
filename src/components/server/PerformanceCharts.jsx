import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { T } from "@/components/ui/TerminalCard";

// ── Heart-rate monitor canvas ─────────────────────────────────────────────────
function EkgCanvas({ data, dataKey, color, height = 90, minVal = 0, maxVal = 100 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Grid lines (optimized: less frequent redraws)
    ctx.strokeStyle = "rgba(58,42,26,0.3)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += W / 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (data.length < 2) return;

    const vals = data.map(d => d[dataKey]);
    const min = Math.max(minVal, Math.min(...vals) * 0.95);
    const max = Math.min(maxVal, Math.max(...vals) * 1.05);
    const range = max - min || 1;

    const toY = v => H - ((v - min) / range) * (H * 0.8) - H * 0.1;

    const POINTS = 60;
    const slice  = vals.slice(-POINTS);
    const stepX  = W / (POINTS - 1);

    // Draw line segments without individual shadow calls (huge perf boost)
    ctx.strokeStyle = color + "dd";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(0, toY(slice[0]));
    for (let i = 1; i < slice.length; i++) {
      const x = i * stepX;
      const y = toY(slice[i]);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Leading dot
    if (slice.length > 0) {
      const lx = (slice.length - 1) * stepX;
      const ly = toY(slice[slice.length - 1]);

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(lx, ly, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

  }, [data, dataKey, color, minVal, maxVal]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={height}
      style={{ width: "100%", height: `${height}px`, display: "block" }}
    />
  );
}

// ── Chart card ────────────────────────────────────────────────────────────────
function ChartCard({ title, data, dataKey, color, unit, threshold, maxValue, minVal = 0 }) {
  const latest = data.length > 0 ? data[data.length - 1][dataKey] : 0;
  const thresholdValue = threshold || maxValue;
  const latestColor =
    thresholdValue && latest > thresholdValue * 0.9 ? T.red :
    thresholdValue && latest > thresholdValue * 0.7 ? T.amber :
    color;

  const displayMin = minVal;
  const displayMax = thresholdValue || maxValue || 100;

  return (
    <div
      className="border"
      style={{
        borderColor: T.border,
        background: "linear-gradient(180deg, #0a0704 0%, #080502 100%)",
        boxShadow: `inset 0 1px 0 ${color}11`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: T.border }}
      >
        <span style={{ color: T.textFaint, fontSize: "8.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.18em" }}>
          {title}
        </span>
        <span
          style={{ color: latestColor, fontSize: "12px", fontFamily: "'Orbitron', monospace", fontWeight: "bold",
            textShadow: `0 0 8px ${latestColor}88` }}
        >
          {latest.toFixed(1)}{unit}
        </span>
      </div>

      {/* Chart container with Y-axis labels */}
      <div style={{ display: "flex", padding: "2px 0 0" }}>
        {/* Y-axis labels */}
        <div style={{ width: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between", paddingRight: "4px", paddingTop: "2px", paddingBottom: "4px" }}>
          <span style={{ color: T.textFaint, fontSize: "6.5px", lineHeight: "1", textAlign: "right" }}>
            {displayMax}
          </span>
          <span style={{ color: T.textFaint, fontSize: "6.5px", lineHeight: "1", textAlign: "right", opacity: 0.6 }}>
            {((displayMax + displayMin) / 2).toFixed(0)}
          </span>
          <span style={{ color: T.textFaint, fontSize: "6.5px", lineHeight: "1", textAlign: "right" }}>
            {displayMin}
          </span>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, background: "rgba(0,0,0,0.3)" }}>
          {data.length < 2 ? (
            <div
              className="flex items-center justify-center"
              style={{ height: "90px", color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}
            >
              // AWAITING SIGNAL...
            </div>
          ) : (
            <EkgCanvas data={data} dataKey={dataKey} color={color} minVal={displayMin} maxVal={displayMax} />
          )}
        </div>
      </div>

      {/* Threshold marker */}
      {(threshold || maxValue) && (
        <div className="flex items-center justify-between px-3 py-1 border-t" style={{ borderColor: T.border + "55" }}>
          <span style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.1em" }}>THRESHOLD</span>
          <span style={{ color: T.amber + "99", fontSize: "7px", fontFamily: "'Orbitron', monospace" }}>{(threshold || maxValue)}{unit}</span>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PerformanceCharts({ status, statusLoading }) {
  const [cpuHistory,  setCpuHistory]  = useState([]);
  const [ramHistory,  setRamHistory]  = useState([]);
  const [diskHistory, setDiskHistory] = useState([]);
  const [fpsHistory,  setFpsHistory]  = useState([]);
  const [lastStatus,  setLastStatus]  = useState(null);

  useEffect(() => {
    if (!status) return;
    setLastStatus(status);
    const now = new Date().toLocaleTimeString("en-US", { hour12: false });
    setCpuHistory(p  => [...p.slice(-59),  { time: now, cpu:  status.cpu ?? 0 }]);
    setRamHistory(p  => [...p.slice(-59),  { time: now, ram:  Math.round((status.ramUsedMB  ?? 0) / 1024 * 10) / 10 }]);
    setDiskHistory(p => [...p.slice(-59),  { time: now, disk: Math.round((status.diskMB     ?? 0) / 1024 * 10) / 10 }]);
    setFpsHistory(p  => [...p.slice(-59),  { time: now, fps:  status.serverFps ?? 0 }]);
  }, [status]);

  useEffect(() => {
    if (!lastStatus) return;
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString("en-US", { hour12: false });
      setCpuHistory(p  => p.length > 0 ? [...p.slice(-59),  { time: now, cpu:  p[p.length - 1].cpu  }] : []);
      setRamHistory(p  => p.length > 0 ? [...p.slice(-59),  { time: now, ram:  p[p.length - 1].ram  }] : []);
      setDiskHistory(p => p.length > 0 ? [...p.slice(-59),  { time: now, disk: p[p.length - 1].disk }] : []);
      setFpsHistory(p  => p.length > 0 ? [...p.slice(-59),  { time: now, fps:  p[p.length - 1].fps  }] : []);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastStatus]);

  const ramMax = lastStatus?.ramTotal ? Math.round((lastStatus.ramTotal ?? 32768) / 1024) : 32;
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <ChartCard title="CPU %"     data={cpuHistory}  dataKey="cpu"  color={T.green}   unit="%"   threshold={80} />
      <ChartCard title="RAM (GB)"  data={ramHistory}  dataKey="ram"  color={T.cyan}    unit=" GB" maxValue={ramMax} />
      <ChartCard title="DISK (GB)" data={diskHistory} dataKey="disk" color={T.gold}    unit=" GB" />
      <ChartCard title="SRV FPS"   data={fpsHistory}  dataKey="fps"  color={T.olive}   unit=""    threshold={60} />
    </div>
  );
}