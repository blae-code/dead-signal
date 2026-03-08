import { useMemo } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Panel, StatGrid, T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const statusColor = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return T.green;
  if (normalized === "mia") return T.amber;
  if (normalized === "kia") return T.red;
  return T.textDim;
};

export default function RosterHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "all";
  const { mapLayers } = useOutletContext();

  const { data: members = [] } = useRealtimeEntityList({
    queryKey: ["roster", "members", "map-layout"],
    entityName: "ClanMember",
    queryFn: () => base44.entities.ClanMember.list("-created_date", 200).catch(() => []),
    refetchInterval: 20_000,
    patchStrategy: "patch",
  });

  const { data: locations = [] } = useRealtimeEntityList({
    queryKey: ["roster", "locations", "map-layout"],
    entityName: "PlayerLocation",
    queryFn: () => base44.entities.PlayerLocation.list("-timestamp", 200).catch(() => []),
    refetchInterval: 10_000,
    patchStrategy: "patch",
  });

  const normalizedLocations = useMemo(() => {
    const callsigns = new Set();
    for (const entry of locations) {
      const callsign = String(entry.player_callsign || "").toLowerCase();
      if (callsign) callsigns.add(callsign);
    }
    return callsigns;
  }, [locations]);

  const roleCounts = useMemo(() => {
    const counts = new Map();
    for (const member of members) {
      const role = member.role || "Unknown";
      counts.set(role, (counts.get(role) || 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [members]);

  const filtered = useMemo(() => {
    if (view === "active") {
      return members.filter((entry) => String(entry.status || "").toLowerCase() === "active");
    }
    if (view === "roles") {
      return [...members].sort((left, right) => String(left.role || "").localeCompare(String(right.role || "")));
    }
    return members;
  }, [members, view]);

  return (
    <div className="p-3 space-y-3">
      <StatGrid
        stats={[
          { label: "TOTAL OPERATORS", value: members.length, color: T.amber },
          { label: "ACTIVE", value: members.filter((entry) => String(entry.status || "").toLowerCase() === "active").length, color: T.green },
          { label: "LOCATED", value: mapLayers?.players?.markers?.length || 0, color: T.cyan },
        ]}
      />

      <Panel title="ROSTER FILTERS" titleColor={T.green}>
        <div className="px-3 py-2 flex flex-wrap gap-2">
          {[
            { label: "ALL", value: "all" },
            { label: "ACTIVE", value: "active" },
            { label: "ROLES", value: "roles" },
          ].map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => {
                if (entry.value === "all") {
                  setSearchParams({});
                  return;
                }
                setSearchParams({ view: entry.value });
              }}
              className="border px-2 py-1 text-[9px]"
              style={{
                borderColor: view === entry.value ? `${T.green}66` : T.border,
                color: view === entry.value ? T.green : T.textDim,
                background: view === entry.value ? `${T.green}12` : "transparent",
                letterSpacing: "0.12em",
                fontFamily: "'Orbitron', monospace",
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </Panel>

      {view === "roles" && (
        <Panel title="ROLE DISTRIBUTION" titleColor={T.cyan}>
          <div className="p-3 space-y-1">
            {roleCounts.map(([role, count]) => (
              <div key={role} className="flex items-center justify-between text-xs border-b pb-1" style={{ borderColor: `${T.border}55` }}>
                <span style={{ color: T.text }}>{role}</span>
                <span style={{ color: T.cyan }}>{count}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="OPERATORS" titleColor={T.amber}>
        <div style={{ maxHeight: "58vh", overflowY: "auto" }}>
          {filtered.map((member) => {
            const online = normalizedLocations.has(String(member.callsign || "").toLowerCase());
            return (
              <Link
                key={member.id}
                to={`/roster/player/${member.id}`}
                className="block px-3 py-2 border-b no-underline"
                style={{ borderColor: `${T.border}66` }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: statusColor(member.status), fontSize: "9px" }}>●</span>
                  <span style={{ color: T.text, fontSize: "11px", flex: 1 }}>{member.callsign || "UNKNOWN"}</span>
                  <span style={{ color: T.textDim, fontSize: "9px" }}>{member.role || "Operator"}</span>
                </div>
                <div style={{ color: online ? T.green : T.textFaint, fontSize: "9px" }}>
                  {online ? "LIVE POSITION AVAILABLE" : "NO LIVE LOCATION"} • STATUS {String(member.status || "Unknown").toUpperCase()}
                </div>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
