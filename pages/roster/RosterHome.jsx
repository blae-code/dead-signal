import { useMemo } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Panel, StatGrid, T, GlowDot, StatusBadge, FilterPill, EmptyState, rowAccent } from "@/components/ui/TerminalCard";
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

      <Panel title="FILTER" titleColor={T.green}>
        <div className="px-3 py-2 flex flex-wrap gap-2">
          {[
            { label: "ALL", value: "all" },
            { label: "ACTIVE", value: "active" },
            { label: "ROLES", value: "roles" },
          ].map((entry) => (
            <FilterPill
              key={entry.value}
              label={entry.label}
              active={view === entry.value}
              color={T.green}
              onClick={() => {
                if (entry.value === "all") {
                  setSearchParams({});
                  return;
                }
                setSearchParams({ view: entry.value });
              }}
            />
          ))}
        </div>
      </Panel>

      {view === "roles" && (
        <Panel title="ROLE DISTRIBUTION" titleColor={T.cyan}>
          <div className="p-3 space-y-1">
            {roleCounts.map(([role, count]) => (
              <div
                key={role}
                className="relative flex items-center justify-between border-b pb-1"
                style={{ borderColor: `${T.border}55` }}
              >
                <span style={{ color: T.text, fontSize: "10px" }}>{role}</span>
                <span style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>{count}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="OPERATORS" titleColor={T.amber}>
        <div style={{ maxHeight: "58vh", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <EmptyState icon={Users} message="NO OPERATORS FOUND" />
          ) : (
            filtered.map((member) => {
              const online = normalizedLocations.has(String(member.callsign || "").toLowerCase());
              const sc = statusColor(member.status);
              return (
                <Link
                  key={member.id}
                  to={`/roster/player/${member.id}`}
                  className="relative block px-3 py-2 border-b no-underline"
                  style={{ borderColor: `${T.border}66` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${sc}08`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={rowAccent(sc)} />
                  <div className="flex items-center gap-2 pl-2">
                    <GlowDot color={sc} size={5} pulse={String(member.status || "").toLowerCase() === "active"} />
                    <span style={{ color: T.text, fontSize: "11px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {member.callsign || "UNKNOWN"}
                    </span>
                    <StatusBadge label={member.role || "Operator"} color={T.textDim} />
                  </div>
                  <div className="flex items-center gap-2 pl-2 mt-0.5">
                    <GlowDot color={online ? T.green : T.textFaint} size={4} pulse={online} />
                    <span style={{ color: online ? T.green : T.textFaint, fontSize: "9px" }}>
                      {online ? "ACTIVE LOCATION" : "NO LOCATION"}
                    </span>
                    <span style={{ color: T.textFaint, fontSize: "9px", marginLeft: "auto" }}>
                      {String(member.status || "Unknown").toUpperCase()}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}
