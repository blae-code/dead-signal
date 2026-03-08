import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { normalizeXYPoint } from "@/hooks/map/coords";

const ACTIVE_WINDOW_MS = 10 * 60 * 1000;

export const useMapPlayerLayer = () => {
  const locationsQuery = useRealtimeEntityList({
    queryKey: ["map", "player-locations"],
    entityName: "PlayerLocation",
    queryFn: () => base44.entities.PlayerLocation.list("-timestamp", 300).catch(() => []),
    refetchInterval: 7_500,
    refetchIntervalInBackground: true,
    patchStrategy: "patch",
  });

  const membersQuery = useRealtimeEntityList({
    queryKey: ["map", "clan-members"],
    entityName: "ClanMember",
    queryFn: () => base44.entities.ClanMember.list("-created_date", 300).catch(() => []),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    patchStrategy: "patch",
  });

  const locations = Array.isArray(locationsQuery.data) ? locationsQuery.data : [];
  const members = Array.isArray(membersQuery.data) ? membersQuery.data : [];

  return useMemo(() => {
    const memberByCallsign = new Map();
    const memberByEmail = new Map();

    for (const member of members) {
      if (member.callsign) {
        memberByCallsign.set(String(member.callsign).toLowerCase(), member);
      }
      if (member.user_email) {
        memberByEmail.set(String(member.user_email).toLowerCase(), member);
      }
    }

    const seen = new Set();
    const markers = [];
    const now = Date.now();

    for (const loc of locations) {
      const point = normalizeXYPoint(loc);
      if (!point) continue;

      const tsRaw = loc.timestamp || loc.updated_date || loc.created_date;
      const ts = Date.parse(tsRaw);
      if (Number.isFinite(ts) && now - ts > ACTIVE_WINDOW_MS) {
        continue;
      }

      const identity = String(loc.player_callsign || loc.player_email || loc.id || "unknown").toLowerCase();
      if (seen.has(identity)) continue;
      seen.add(identity);

      const member = memberByCallsign.get(String(loc.player_callsign || "").toLowerCase())
        || memberByEmail.get(String(loc.player_email || "").toLowerCase())
        || null;

      const routePath = member?.id ? `/roster/player/${member.id}` : "/roster";
      markers.push({
        id: `player-${loc.id || identity}`,
        entityId: member?.id || loc.id,
        entityType: "PlayerLocation",
        kind: "player",
        label: loc.player_callsign || member?.callsign || "UNKNOWN OPERATOR",
        status: member?.status || "Active",
        color: member?.status === "Active" ? T.green : T.cyan,
        x: point.x,
        y: point.y,
        routePath,
        raw: { ...loc, member },
      });
    }

    return {
      markers,
      loading: locationsQuery.isLoading || membersQuery.isLoading,
    };
  }, [locations, locationsQuery.isLoading, members, membersQuery.isLoading]);
};
