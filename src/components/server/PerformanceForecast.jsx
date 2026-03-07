import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle } from "lucide-react";
import { T, Panel } from "@/components/ui/TerminalCard";

// Simple linear regression for trend prediction
function predictTrend(data, forecastHours = 48) {
  if (data.length < 2) return [];

  const n = data.length;
  const xValues = data.map((_, i) => i);
  const yValues = data.map(v => v);

  const xMean = xValues.reduce((a, b) => a + b) / n;
  const yMean = yValues.reduce((a, b) => a + b) / n;

  const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean), 0);
  const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  const forecast = [];
  for (let i = 0; i < forecastHours; i++) {
    const x = n + i;
    forecast.push({
      hour: i,
      predicted: Math.max(0, Math.min(100, intercept + slope * x)),
    });
  }

  return forecast;
}

function RiskIndicator({ value, threshold = 80 }) {
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

function ForecastCard({ title, color, data, threshold = 80 }) {
  const forecast = useMemo(() => predictTrend(data, 48), [data]);

  const maxPredicted = Math.max(...forecast.map(d => d.predicted), 0);
  const avgPredicted = forecast.reduce((sum, d) => sum + d.predicted, 0) / forecast.length;
  const bottleneckHours = forecast.filter(d => d.predicted > threshold).length;

  return (
    <Panel title={title} titleColor={color} accentBorder={color + "55"}>
      <div className="p-3 space-y-3">
        {/* Forecast chart */}
        <div style={{ width: "100%", height: "140px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 9, fill: T.textFaint }}
                label={{ value: "Hours", offset: 0, fontSize: 9, fill: T.textFaint }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: T.textFaint }}
                label={{ value: "%", angle: -90, position: "insideLeft", fontSize: 9, fill: T.textFaint }}
              />
              <Tooltip
                contentStyle={{ background: T.bg0, border: `1px solid ${color}`, fontSize: "10px", color }}
                formatter={(value) => value.toFixed(1) + "%"}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={color}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
              {/* Threshold line */}
              <Line
                type="monotone"
                dataKey={() => threshold}
                stroke={T.amber + "88"}
                strokeDasharray="2 2"
                dot={false}
                strokeWidth={1}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center border-t" style={{ borderColor: T.border, paddingTop: "8px" }}>
          <div>
            <div className="text-xs" style={{ color: T.textFaint, fontSize: "8px" }}>PEAK</div>
            <div style={{ color, fontSize: "11px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
              {maxPredicted.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: T.textFaint, fontSize: "8px" }}>AVG</div>
            <div style={{ color, fontSize: "11px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
              {avgPredicted.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: T.textFaint, fontSize: "8px" }}>AT RISK</div>
            <RiskIndicator value={maxPredicted} threshold={threshold} />
          </div>
        </div>

        {/* Bottleneck warning */}
        {bottleneckHours > 0 && (
          <div
            className="p-2 text-xs border"
            style={{
              borderColor: T.amber + "88",
              background: T.amber + "11",
              color: T.amber,
              fontSize: "10px",
            }}
          >
            ⚠ Potential bottleneck in {bottleneckHours}h ({Math.round((bottleneckHours / 48) * 100)}% of forecast period)
          </div>
        )}
      </div>
    </Panel>
  );
}

export default function PerformanceForecast({ status }) {
  if (!status) {
    return (
      <Panel title="// FORECAST SYSTEM" titleColor={T.cyan}>
        <div className="p-3 text-xs text-center" style={{ color: T.textFaint }}>
          Waiting for server data...
        </div>
      </Panel>
    );
  }

  // Collect historical data (you'd normally pull this from a database)
  // For now, we'll use current value as baseline and add some variation
  const cpuHistory = Array.from({ length: 12 }, (_, i) => {
    const baseVariation = Math.sin(i * 0.5) * 10;
    return status.cpu + baseVariation + Math.random() * 5 - 2.5;
  });

  const ramHistory = Array.from({ length: 12 }, (_, i) => {
    const baseVariation = Math.cos(i * 0.3) * 5;
    return status.ramUsedMB / 1024 + baseVariation + Math.random() * 3 - 1.5;
  });

  const diskHistory = Array.from({ length: 12 }, (_, i) => {
    const baseVariation = Math.sin(i * 0.2) * 2;
    return status.diskMB / 1024 + baseVariation + Math.random() * 2 - 1;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <ForecastCard title="// CPU FORECAST" color={T.cyan} data={cpuHistory} threshold={85} />
      <ForecastCard title="// RAM FORECAST" color={T.green} data={ramHistory} threshold={80} />
      <ForecastCard title="// DISK FORECAST" color={T.orange} data={diskHistory} threshold={90} />
    </div>
  );
}