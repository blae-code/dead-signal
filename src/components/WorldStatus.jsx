import { useQuery } from "@tanstack/react-query";
import { useLiveMetric } from "@/hooks/use-live-metric";
import { invokeFunctionOrFallback } from "@/api/function-invoke";

const C = {
  text: "#e0d4c0",
  textDim: "#b8a890",
  textFaint: "#8a7a6a",
  border: "#3a2a1a",
  green: "#39ff14",
  amber: "#ffb000",
  red: "#ff2020",
  cyan: "#00e5ff",
};

const fetchStatus = async () => {
  return invokeFunctionOrFallback("getServerStatus", {}, () => ({
    online: null,
    state: null,
    playerCount: null,
    serverFps: null,
    responseTime: null,
    retrieved_at: new Date().toISOString(),
    data_source: "unavailable",
    metric_source: {},
    metric_available: {},
    metrics: {},
    stale: true,
    stale_after_ms: 30_000,
  }));
};

function StatusBlock({ label, value, color = C.textDim, source = "unavailable" }) {
  return (
    <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
      <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
        {value}
      </span>
      <span style={{ color: source === "live" ? C.green : C.red, fontSize: "7px", letterSpacing: "0.1em" }}>
        {source}
      </span>
    </div>
  );
}

export default function WorldStatus({ weather }) {
  const { data: status = null } = useQuery({
    queryKey: ["world-status", "server"],
    queryFn: fetchStatus,
    staleTime: 10_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const state = useLiveMetric(status, "state");
  const players = useLiveMetric(status, "playerCount");
  const latency = useLiveMetric(status, "responseTime");
  const fps = useLiveMetric(status, "serverFps");

  return (
    <div className="flex items-center gap-4 px-2">
      <StatusBlock
        label="SERVER"
        value={state.available && typeof state.value === "string" ? state.value.toUpperCase() : "UNAVAILABLE"}
        color={state.available ? C.green : C.textFaint}
        source={state.source}
      />

      <span style={{ color: C.border, fontSize: "16px" }}>|</span>

      <StatusBlock
        label="PLAYERS"
        value={players.available && typeof players.value === "number" ? `${players.value}/64` : "UNAVAILABLE"}
        color={players.available ? C.cyan : C.textFaint}
        source={players.source}
      />

      <span style={{ color: C.border, fontSize: "16px" }}>|</span>

      <StatusBlock
        label="LATENCY"
        value={latency.available && typeof latency.value === "number" ? `${latency.value}ms` : "UNAVAILABLE"}
        color={latency.available ? C.amber : C.textFaint}
        source={latency.source}
      />

      <span style={{ color: C.border, fontSize: "16px" }}>|</span>

      <StatusBlock
        label="FPS"
        value={fps.available && typeof fps.value === "number" ? `${fps.value}` : "UNAVAILABLE"}
        color={fps.available ? C.green : C.textFaint}
        source={fps.source}
      />

      {weather && (
        <>
          <span style={{ color: C.border, fontSize: "16px" }}>|</span>
          <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
            <span style={{ color: C.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>IRL WEATHER</span>
            <span style={{ color: C.textDim, fontSize: "10px" }}>
              {weather.temp}°F {weather.shortForecast?.split(" ").slice(0, 2).join(" ")}
            </span>
            <span style={{ color: C.green, fontSize: "7px", letterSpacing: "0.1em" }}>live</span>
          </div>
        </>
      )}
    </div>
  );
}

