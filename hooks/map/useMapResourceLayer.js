import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { normalizeXYPoint } from "@/hooks/map/coords";

const RESOURCE_PIN_TYPES = new Set([
  "Loot Cache",
  "Resource Node",
  "Supply Cache",
  "Clan Base",
  "Vehicle Spawn",
]);

const pickColor = (kind) => {
  if (kind === "supply") return T.teal;
  if (kind === "hotspot") return T.gold;
  return T.cyan;
};

export const useMapResourceLayer = () => {
  const pinsQuery = useRealtimeEntityList({
    queryKey: ["map", "pins"],
    entityName: "MapPin",
    queryFn: () => base44.entities.MapPin.list("-created_date", 400).catch(() => []),
    refetchInterval: 25_000,
    refetchIntervalInBackground: true,
    patchStrategy: "patch",
  });

  const cacheQuery = useRealtimeEntityList({
    queryKey: ["map", "supply-caches"],
    entityName: "SupplyCacheLocation",
    queryFn: () => base44.entities.SupplyCacheLocation.list("-created_date", 300).catch(() => []),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    patchStrategy: "patch",
  });

  const hotspotQuery = useRealtimeEntityList({
    queryKey: ["map", "loot-hotspots"],
    entityName: "LootHotspot",
    queryFn: () => base44.entities.LootHotspot.list("-created_date", 300).catch(() => []),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    patchStrategy: "patch",
  });

  const pins = Array.isArray(pinsQuery.data) ? pinsQuery.data : [];
  const caches = Array.isArray(cacheQuery.data) ? cacheQuery.data : [];
  const hotspots = Array.isArray(hotspotQuery.data) ? hotspotQuery.data : [];

  return useMemo(() => {
    const markers = [];

    for (const pin of pins) {
      if (!RESOURCE_PIN_TYPES.has(pin.type)) continue;
      const point = normalizeXYPoint(pin);
      if (!point) continue;

      markers.push({
        id: `resource-pin-${pin.id}`,
        entityId: pin.id,
        entityType: "MapPin",
        kind: "resource",
        label: pin.title || pin.type || "RESOURCE NODE",
        status: pin.status || "Unknown",
        color: pickColor("pin"),
        x: point.x,
        y: point.y,
        routePath: `/logistics/inventory?resource=${encodeURIComponent(pin.id)}`,
        raw: pin,
      });
    }

    for (const cache of caches) {
      const point = normalizeXYPoint(cache);
      if (!point) continue;
      markers.push({
        id: `resource-cache-${cache.id}`,
        entityId: cache.id,
        entityType: "SupplyCacheLocation",
        kind: "resource",
        label: cache.name || cache.cache_name || "SUPPLY CACHE",
        status: cache.status || "Tracked",
        color: pickColor("supply"),
        x: point.x,
        y: point.y,
        routePath: `/logistics/inventory?cache=${encodeURIComponent(cache.id)}`,
        raw: cache,
      });
    }

    for (const hotspot of hotspots) {
      const point = normalizeXYPoint(hotspot);
      if (!point) continue;
      markers.push({
        id: `resource-hotspot-${hotspot.id}`,
        entityId: hotspot.id,
        entityType: "LootHotspot",
        kind: "resource",
        label: hotspot.name || hotspot.location_name || "LOOT HOTSPOT",
        status: hotspot.status || "Active",
        color: pickColor("hotspot"),
        x: point.x,
        y: point.y,
        routePath: `/logistics/inventory?hotspot=${encodeURIComponent(hotspot.id)}`,
        raw: hotspot,
      });
    }

    return {
      markers,
      loading: pinsQuery.isLoading || cacheQuery.isLoading || hotspotQuery.isLoading,
    };
  }, [cacheQuery.isLoading, caches, hotspotQuery.isLoading, hotspots, pins, pinsQuery.isLoading]);
};
