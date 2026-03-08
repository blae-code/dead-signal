import { Link, useOutletContext } from "react-router-dom";
import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { T, Panel, StatGrid, EmptyState } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const isMissionActive = (status) => {
  const normalized = String(status || "").toLowerCase();
  return normalized === "active" || normalized === "pending" || normalized === "in_progress";
};

export default function OperationsHome() {
  const { mapLayers } = useOutletContext();
  const unplacedMissions = mapLayers?.unplacedMissions || [];

  const { data: missions = [] } = useRealtimeEntityList({
    queryKey: ["ops", "missions", "overview"],
    entityName: "Mission",
    queryFn: () => base44.entities.Mission.list("-created_date", 50).catch(() => []),
    refetchInterval: 20_000,
    patchStrategy: "patch",
  });
  const { data: events = [] } = useRealtimeEntityList({
    queryKey: ["ops", "events", "overview"],
    entityName: "ServerEvent",
    queryFn: () => base44.entities.ServerEvent.list("-created_date", 40).catch(() => []),
    refetchInterval: 12_000,
    patchStrategy: "patch",
  });
  const { data: members = [] } = useRealtimeEntityList({
    queryKey: ["ops", "members", "overview"],
    entityName: "ClanMember",
    queryFn: () => base44.entities.ClanMember.list("-created_date", 60).catch(() => []),
    refetchInterval: 20_000,
    patchStrategy: "patch",
  });

  const activeMissions = useMemo(() => missions.filter((entry) => isMissionActive(entry.status)), [missions]);
  const activeOperators = useMemo(
    () => members.filter((entry) => String(entry.status || "").toLowerCase() === "active"),
    [members],
  );

  return (
    <div className="p-3 space-y-3">
      <StatGrid
        stats={[
          { label: "ACTIVE MISSIONS", value: activeMissions.length, color: T.amber },
          { label: "ONLINE OPERATORS", value: activeOperators.length, color: T.green },
          { label: "SYSTEM EVENTS", value: events.length, color: T.cyan },
        ]}
      />

      <Panel
        title="OPERATIONS OVERLAY"
        titleColor={T.amber}
        headerRight={(
          <Link to="/ops/missions" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none", letterSpacing: "0.1em" }}>
            OPEN MISSION BOARD →
          </Link>
        )}
      >
        <div>
          {activeMissions.length === 0 ? (
            <EmptyState message="NO ACTIVE MISSIONS" />
          ) : (
            activeMissions.slice(0, 8).map((mission) => (
              <Link
                key={mission.id}
                to={`/ops/missions/${mission.id}`}
                className="block px-3 py-2 border-b no-underline"
                style={{ borderColor: `${T.border}66`, color: T.text }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: "11px" }}>{mission.title || "UNTITLED MISSION"}</span>
                  <span style={{ color: T.textFaint, fontSize: "9px" }}>{mission.priority || "Unrated"}</span>
                </div>
                <div style={{ color: T.textDim, fontSize: "9px" }}>
                  STATUS {String(mission.status || "Unknown").toUpperCase()}
                  {mission.objective_coords ? ` • OBJ ${mission.objective_coords}` : ""}
                </div>
              </Link>
            ))
          )}
        </div>
      </Panel>

      <Panel title="UNPLACED MISSIONS" titleColor={T.red}>
        <div>
          {unplacedMissions.length === 0 ? (
            <EmptyState message="ALL MISSIONS MAPPED" />
          ) : (
            unplacedMissions.slice(0, 12).map((mission) => (
              <div key={mission.id} className="px-3 py-2 border-b flex items-center justify-between gap-2" style={{ borderColor: `${T.border}66` }}>
                <div>
                  <div style={{ color: T.text, fontSize: "10px" }}>{mission.label}</div>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>
                    Could not parse coordinates from mission record.
                  </div>
                </div>
                <Link
                  to={`/ops/missions/${mission.entityId}`}
                  className="border px-2 py-1 no-underline"
                  style={{ borderColor: `${T.amber}66`, color: T.amber, fontSize: "8px", letterSpacing: "0.12em" }}
                >
                  QUICK EDIT
                </Link>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
