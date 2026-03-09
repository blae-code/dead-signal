import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Activity } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { EmptyState, Panel, StatGrid, StatusBadge, T, rowAccent } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { invokeFunctionOrFallback } from "@/api/function-invoke";
import VoiceChannelPanel from "@/components/voice/VoiceChannelPanel";

const SEV_COLOR = {
  critical: T.red,
  alert:    T.red,
  warn:     T.amber,
  warning:  T.amber,
  info:     T.cyan,
};

const sevColor = (sev) => SEV_COLOR[String(sev || "info").toLowerCase()] || T.cyan;

const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso.slice(11, 19) || "";
  }
};

export default function SystemsHome() {
  const { mapLayers } = useOutletContext();
  const { data: status = null } = useQuery({
    queryKey: ["systems", "status", "overview"],
    queryFn: () => invokeFunctionOrFallback("getServerStatus", {}, () => null),
    refetchInterval: 12_000,
    staleTime: 5_000,
  });

  const { data: events = [] } = useRealtimeEntityList({
    queryKey: ["systems", "events", "overview"],
    entityName: "ServerEvent",
    queryFn: () => base44.entities.ServerEvent.list("-created_date", 25).catch(() => []),
    refetchInterval: 10_000,
    patchStrategy: "patch",
  });

  const { data: alerts = [] } = useRealtimeEntityList({
    queryKey: ["systems", "alerts", "overview"],
    entityName: "AlertHistory",
    queryFn: () => base44.entities.AlertHistory.list("-created_date", 25).catch(() => []),
    refetchInterval: 12_000,
    patchStrategy: "patch",
  });

  const criticalAlerts = alerts.filter((entry) =>
    ["critical", "alert"].includes(String(entry.severity || "").toLowerCase()),
  );

  return (
    <div className="p-3 space-y-3">
      <StatGrid
        stats={[
          { label: "SERVER STATE", value: status?.state ? String(status.state).toUpperCase() : "UNAVAIL", color: status?.online ? T.green : T.red },
          { label: "ACTIVE ALERTS", value: criticalAlerts.length, color: criticalAlerts.length > 0 ? T.red : T.green },
          { label: "SYSTEM MARKERS", value: mapLayers?.systems?.markers?.length || 0, color: T.cyan },
        ]}
      />

      <Panel
        title="SYSTEMS PANELS"
        titleColor={T.cyan}
        headerRight={(
          <div className="flex items-center gap-2">
            {[
              { label: "SERVER", to: "/systems/server", color: T.green },
              { label: "ALERTS", to: "/systems/alerts", color: T.red },
              { label: "AUTO", to: "/systems/automation", color: T.cyan },
            ].map(({ label, to, color }) => (
              <Link
                key={to}
                to={to}
                style={{
                  color, fontSize: "9px", textDecoration: "none", letterSpacing: "0.1em",
                  border: `1px solid ${color}44`, background: `${color}0e`,
                  padding: "2px 8px", fontFamily: "'Orbitron', monospace",
                }}
              >
                {label} →
              </Link>
            ))}
          </div>
        )}
      >
        <div className="p-3 text-xs" style={{ color: T.textDim, lineHeight: 1.6 }}>
          Systems overlays run on top of the map canvas so you can inspect live events and alerts without leaving operational context.
        </div>
      </Panel>

      <Panel title="RECENT SYSTEM EVENTS" titleColor={T.orange}>
        {events.length === 0 ? (
          <EmptyState icon={Activity} message="NO RECENT SERVER EVENTS" sub="All systems nominal" />
        ) : (
          <div>
            {events.map((event) => {
              const sc = sevColor(event.severity);
              return (
                <div
                  key={event.id}
                  className="relative px-3 py-2 border-b"
                  style={{ borderColor: `${T.border}66` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${sc}08`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={rowAccent(sc)} />
                  <div className="flex items-center gap-2 pl-2 flex-wrap">
                    <StatusBadge label={(event.severity || "INFO").toUpperCase()} color={sc} />
                    <span style={{ color: T.text, fontSize: "10px", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {event.message || "SYSTEM EVENT"}
                    </span>
                    <span style={{ color: T.textFaint, fontSize: "9px", flexShrink: 0 }}>
                      {fmtDate(event.created_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <VoiceChannelPanel
        title="ON-CALL VOICE"
        titleColor={T.cyan}
        includeMissionRooms={false}
        includeClanRoom={false}
        includeOpsRoom={true}
      />
    </div>
  );
}
