import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { T } from "@/components/ui/TerminalCard";

// ── Heart-rate monitor canvas ─────────────────────────────────────────────────
function EkgCanvas({ data, dataKey, color, height = 90 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Scanline background
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(58,42,26,0.5)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += W / 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (data.length < 2) return;

    const vals = data.map(d => d[dataKey]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;

    const toY = v => H - ((v - min) / range) * (H * 0.8) - H * 0.1;

    // How many points fit across the canvas — scroll so latest is always at right edge
    const POINTS = 60;
    const slice  = vals.slice(-POINTS);
    const stepX  = W / (POINTS - 1);

    // Fade trail: older points are dimmer
    // Draw as gradient segments
    for (let i = 1; i < slice.length; i++) {
      const t  = i / slice.length; // 0=oldest, 1=newest
      const x0 = (i - 1) * stepX;
      const x1 = i * stepX;
      const y0 = toY(slice[i - 1]);
      const y1 = toY(slice[i]);

      // Alpha ramps from 0.08 (oldest) to 1 (newest)
      const alpha = 0.08 + t * 0.92;

      ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur  = t > 0.85 ? 10 : 0;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // Leading dot at the newest point
    if (slice.length > 0) {
      const lx = (slice.length - 1) * stepX;
      const ly = toY(slice[slice.length - 1]);

      ctx.shadowColor = color;
      ctx.shadowBlur  = 16;
      ctx.fillStyle   = "#ffffff";
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    // Wipe zone: dark rectangle just ahead of the leading dot (like real ECG)
    if (slice.length < POINTS) {
      // still filling — no wipe needed
    } else {
      const wipeW = stepX * 4;
      const lx = (slice.length - 1) * stepX;
      const wipeX = (lx + stepX) % W;
      ctx.fillStyle = "rgba(10,7,4,0.92)";
      ctx.fillRect(wipeX, 0, wipeW, H);
    }

  }, [data, dataKey, color]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={height}
      style={{ width: "100%", height: `${height}px`, display: "block" }}
    />
  );
}

// ── Chart card ────────────────────────────────────────────────────────────────
function ChartCard({ title, data, dataKey, color, unit, threshold, maxValue }) {
  const latest = data.length > 0 ? data[data.length - 1][dataKey] : 0;
  const thresholdValue = threshold || maxValue;
  const latestColor =
    thresholdValue && latest > thresholdValue * 0.9 ? T.red :
    thresholdValue && latest > thresholdValue * 0.7 ? T.amber :
    color;

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

      {/* EKG canvas */}
      <div style={{ padding: "2px 0 0", background: "rgba(0,0,0,0.3)" }}>
        {data.length < 2 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: "90px", color: T.textFaint, fontSize: "8px", letterSpacing: "0.15em" }}
          >
            // AWAITING SIGNAL...
          </div>
        ) : (
          <EkgCanvas data={data} dataKey={dataKey} color={color} />
        )}
      </div>

      {/* Threshold marker */}
      {(threshold || maxValue) && (
        <div className="flex items-center justify-between px-3 py-1 border-t" style={{ borderColor: T.border + "55" }}>
          <span style={{ color: T.textFaint, fontSize: "7px", letterSpacing: "0.1em" }}>MAX</span>
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