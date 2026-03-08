import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { T, Panel } from "@/components/ui/TerminalCard";
import SafeResponsiveContainer from "@/components/ui/SafeResponsiveContainer";

const FORECAST_HOURS = 48;

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function predictTrend(series, forecastHours = FORECAST_HOURS) {
  if (!Array.isArray(series) || series.length < 4) return [];
  const values = series.map((entry) => toFiniteNumber(entry)).filter((entry) => entry !== null);
  if (values.length < 4) return [];

  const n = values.length;
  const xValues = values.map((_, index) => index);
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = values.reduce((sum, y) => sum + y, 0) / n;
  const numerator = xValues.reduce((sum, x, index) => sum + (x - xMean) * (values[index] - yMean), 0);
  const denominator = xValues.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  return Array.from({ length: forecastHours }, (_, index) => {
    const x = n + index;
    return {
      hour: index,
      predicted: Math.max(0, intercept + slope * x),
    };
  });
}

function RiskIndicator({ value, threshold }) {
  if (value === null) {
    return <span style={{ color: T.textFaint, fontSize: "10px" }}>UNAVAILABLE</span>;
  }
  const risk = value > threshold ? "CRITICAL" : value > threshold * 0.75 ? "ELEVATED" : "NORMAL";
  const colors = {
    NORMAL: T.green,
    ELEVATED: T.amber,
    CRITICAL: T.red,
  };

  return (
    <div className="flex items-center gap-2">
      {risk !== "NORMAL" && <AlertTriangle size={12} style={{ color: colors[risk] }} />}
      <span style={{ color: colors[risk], fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>
        {risk}
      </span>
    </div>
  );
}

function ForecastCard({ title, color, history, threshold = 80 }) {
  const forecast = useMemo(() => predictTrend(history), [history]);
  if (forecast.length === 0) {
    return (
      <Panel title={title} titleColor={color} accentBorder={color + "55"}>
        <div className="p-3 text-xs" style={{ color: T.textFaint }}>
          INSUFFICIENT LIVE HISTORY
        </div>
      </Panel>
    );
  }

  const maxPredicted = Math.max(...forecast.map((entry) => entry.predicted), 0);
  const avgPredicted = forecast.reduce((sum, entry) => sum + entry.predicted, 0) / forecast.length;
  const bottleneckHours = forecast.filter((entry) => entry.predicted > threshold).length;

  return (
    <Panel title={title} titleColor={color} accentBorder={color + "55"}>
      <div className="p-3 space-y-3">
        <SafeResponsiveContainer height={140} minHeight={120}>
            <LineChart data={forecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: T.textFaint }} />
              <YAxis tick={{ fontSize: 9, fill: T.textFaint }} />
              <Tooltip
                contentStyle={{ background: T.bg0, border: `1px solid ${color}`, fontSize: "10px", color }}
                formatter={(value) => `${Number(value).toFixed(1)}%`}
              />
              <Line type="monotone" dataKey="predicted" stroke={color} dot={false} strokeWidth={1.5} isAnimationActive={false} />
              <Line type="monotone" dataKey={() => threshold} stroke={T.amber + "88"} strokeDasharray="2 2" dot={false} strokeWidth={1} isAnimationActive={false} />
            </LineChart>
        </SafeResponsiveContainer>

        <div className="grid grid-cols-3 gap-2 text-center border-t" style={{ borderColor: T.border, paddingTop: "8px" }}>
          <div>
            <div style={{ color: T.textFaint, fontSize: "8px" }}>PEAK</div>
            <div style={{ color, fontSize: "11px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
              {maxPredicted.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ color: T.textFaint, fontSize: "8px" }}>AVG</div>
            <div style={{ color, fontSize: "11px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
              {avgPredicted.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ color: T.textFaint, fontSize: "8px" }}>AT RISK</div>
            <RiskIndicator value={maxPredicted} threshold={threshold} />
          </div>
        </div>

        {bottleneckHours > 0 && (
          <div
            className="p-2 text-xs border"
            style={{ borderColor: T.amber + "88", background: T.amber + "11", color: T.amber, fontSize: "10px" }}
          >
            POTENTIAL BOTTLENECK IN {bottleneckHours}h ({Math.round((bottleneckHours / FORECAST_HOURS) * 100)}% OF WINDOW)
          </div>
        )}
      </div>
    </Panel>
  );
}

const toHistory = (samples, field) => {
  if (!Array.isArray(samples)) return [];
  return samples
    .map((sample) => toFiniteNumber(sample?.[field]))
    .filter((value) => value !== null)
    .slice(-120);
};

export default function PerformanceForecast({ samples = [] }) {
  const cpuHistory = useMemo(() => toHistory(samples, "cpu_percent"), [samples]);
  const ramHistory = useMemo(() => toHistory(samples, "ram_used_mb").map((value) => value / 32768 * 100), [samples]);
  const diskHistory = useMemo(() => toHistory(samples, "disk_used_mb").map((value) => value / 1048576 * 100), [samples]);

  if (cpuHistory.length < 4 && ramHistory.length < 4 && diskHistory.length < 4) {
    return (
      <Panel title="// FORECAST SYSTEM" titleColor={T.cyan}>
        <div className="p-3 text-xs text-center" style={{ color: T.textFaint }}>
          INSUFFICIENT LIVE HISTORY
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <ForecastCard title="// CPU FORECAST" color={T.cyan} history={cpuHistory} threshold={85} />
      <ForecastCard title="// RAM FORECAST" color={T.green} history={ramHistory} threshold={80} />
      <ForecastCard title="// DISK FORECAST" color={T.orange} history={diskHistory} threshold={90} />
    </div>
  );
}

