import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { resolveCoordinatePoint } from "@/hooks/map/coords";

const statusColor = (status) => {
  const key = String(status || "").toLowerCase();
  if (key === "active") return T.green;
  if (key === "pending") return T.amber;
  if (key === "complete") return T.cyan;
  if (key === "failed" || key === "aborted") return T.red;
  return T.textDim;
};

export const useMapMissionLayer = () => {
  const query = useRealtimeEntityList({
    queryKey: ["map", "missions"],
    entityName: "Mission",
    queryFn: () => base44.entities.Mission.list("-created_date", 300).catch(() => []),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    patchStrategy: "patch",
  });

  const missions = Array.isArray(query.data) ? query.data : [];

  return useMemo(() => {
    const markers = [];
    const unplaced = [];

    for (const mission of missions) {
      const point = resolveCoordinatePoint(mission, ["objective_coords", "location", "sector"]);
      const base = {
        id: `mission-${mission.id}`,
        entityId: mission.id,
        entityType: "Mission",
        kind: "mission",
        label: mission.title || "UNTITLED MISSION",
        status: mission.status || "Unknown",
        priority: mission.priority || "Unknown",
        color: statusColor(mission.status),
        routePath: `/ops/missions/${mission.id}`,
        raw: mission,
      };

      if (!point) {
        unplaced.push(base);
        continue;
      }

      markers.push({
        ...base,
        x: point.x,
        y: point.y,
        coordSource: point.source,
        coordLabel: point.grid || mission.objective_coords || null,
      });
    }

    return {
      markers,
      unplaced,
      loading: query.isLoading,
    };
  }, [missions, query.isLoading]);
};
