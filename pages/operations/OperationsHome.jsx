import { Link, useOutletContext } from "react-router-dom";
import { useMemo } from "react";
import { AlertTriangle, Crosshair, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { T, Panel, StatGrid, EmptyState, StatusBadge, GlowDot, rowAccent } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const isMissionActive = (status) => {
  const normalized = String(status || "").toLowerCase();
  return normalized === "active" || normalized === "pending" || normalized === "in_progress";
};

const STATUS_COLOR = {
  active:      T.green,
  pending:     T.amber,
  in_progress: T.cyan,
  complete:    T.textFaint,
  failed:      T.red,
  aborted:     T.textGhost,
};

const missionAccent = (status) =>
  STATUS_COLOR[String(status || "").toLowerCase()] || T.textDim;

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
        title="ACTIVE OPERATIONS"
        titleColor={T.amber}
        headerRight={(
          <Link
            to="/ops/missions"
            style={{
              color: T.amber, fontSize: "9px", textDecoration: "none", letterSpacing: "0.1em",
              border: `1px solid ${T.amber}44`, background: `${T.amber}0e`,
              padding: "2px 8px", fontFamily: "'Orbitron', monospace",
            }}
          >
            MISSION BOARD →
          </Link>
        )}
      >
        <div>
          {activeMissions.length === 0 ? (
            <EmptyState icon={Crosshair} message="NO ACTIVE MISSIONS" sub="All operations standing down" />
          ) : (
            activeMissions.slice(0, 8).map((mission) => {
              const accent = missionAccent(mission.status);
              return (
                <Link
                  key={mission.id}
                  to={`/ops/missions/${mission.id}`}
                  className="relative block px-3 py-2 border-b no-underline"
                  style={{ borderColor: `${T.border}66`, color: T.text }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}08`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={rowAccent(accent)} />
                  <div className="flex items-center justify-between gap-2 pl-2">
                    <span style={{ fontSize: "11px", color: T.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {mission.title || "UNTITLED MISSION"}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge label={mission.priority || "—"} color={accent} />
                      <GlowDot color={accent} size={5} />
                      <span style={{ color: accent, fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>
                        {String(mission.status || "UNKNOWN").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {mission.objective_coords && (
                    <div className="pl-2 flex items-center gap-1 mt-0.5">
                      <MapPin size={8} style={{ color: T.textGhost }} />
                      <span style={{ color: T.textFaint, fontSize: "9px" }}>
                        OBJ {mission.objective_coords}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </Panel>

      {unplacedMissions.length > 0 && (
        <Panel title="UNPLACED MISSIONS" titleColor={T.red}>
          <div>
            {unplacedMissions.slice(0, 12).map((mission) => (
              <div
                key={mission.id}
                className="relative px-3 py-2 border-b flex items-center justify-between gap-2"
                style={{ borderColor: `${T.border}66` }}
              >
                <div style={rowAccent(T.red)} />
                <div className="pl-2 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={9} style={{ color: T.red, flexShrink: 0 }} />
                    <span style={{ color: T.text, fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {mission.label}
                    </span>
                  </div>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>
                    Coordinates could not be parsed — needs edit
                  </div>
                </div>
                <Link
                  to={`/ops/missions/${mission.entityId}`}
                  className="no-underline flex-shrink-0"
                  style={{
                    color: T.amber, fontSize: "8px", letterSpacing: "0.12em",
                    border: `1px solid ${T.amber}44`, background: `${T.amber}0e`,
                    padding: "2px 8px", fontFamily: "'Orbitron', monospace",
                  }}
                >
                  QUICK EDIT
                </Link>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
