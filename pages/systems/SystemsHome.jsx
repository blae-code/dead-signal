import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { EmptyState, Panel, StatGrid, T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { invokeFunctionOrFallback } from "@/api/function-invoke";
import VoiceChannelPanel from "@/components/voice/VoiceChannelPanel";

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
          { label: "SERVER STATE", value: status?.state ? String(status.state).toUpperCase() : "UNAVAILABLE", color: status?.online ? T.green : T.red },
          { label: "ACTIVE ALERTS", value: criticalAlerts.length, color: criticalAlerts.length > 0 ? T.red : T.green },
          { label: "SYSTEM MARKERS", value: mapLayers?.systems?.markers?.length || 0, color: T.cyan },
        ]}
      />

      <Panel
        title="SYSTEMS PANELS"
        titleColor={T.cyan}
        headerRight={(
          <div className="flex items-center gap-1">
            <Link to="/systems/server" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
              SERVER →
            </Link>
            <Link to="/systems/alerts" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
              ALERTS →
            </Link>
            <Link to="/systems/automation" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
              AUTOMATION →
            </Link>
          </div>
        )}
      >
        <div className="p-3 text-xs" style={{ color: T.textDim, lineHeight: 1.5 }}>
          Systems overlays run on top of the map canvas so you can inspect live events and alerts without leaving
          operational context.
        </div>
      </Panel>

      <Panel title="RECENT SYSTEM EVENTS" titleColor={T.orange}>
        {events.length === 0 ? (
          <EmptyState message="NO RECENT SERVER EVENTS" />
        ) : (
          <div>
            {events.map((event) => (
              <div key={event.id} className="px-3 py-2 border-b" style={{ borderColor: `${T.border}66` }}>
                <div style={{ color: T.text, fontSize: "10px" }}>{event.message || "SYSTEM EVENT"}</div>
                <div style={{ color: T.textFaint, fontSize: "9px" }}>
                  {(event.severity || "INFO").toUpperCase()} • {event.created_date?.slice(0, 19)?.replace("T", " ")}
                </div>
              </div>
            ))}
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
