import { useMemo } from "react";
import { useMapMissionLayer } from "@/hooks/map/useMapMissionLayer";
import { useMapPlayerLayer } from "@/hooks/map/useMapPlayerLayer";
import { useMapResourceLayer } from "@/hooks/map/useMapResourceLayer";
import { useMapSystemsLayer } from "@/hooks/map/useMapSystemsLayer";

export const useMapLayers = () => {
  const missionLayer = useMapMissionLayer();
  const playerLayer = useMapPlayerLayer();
  const resourceLayer = useMapResourceLayer();
  const systemsLayer = useMapSystemsLayer();

  return useMemo(() => {
    const markers = [
      ...missionLayer.markers,
      ...playerLayer.markers,
      ...resourceLayer.markers,
      ...systemsLayer.markers,
    ];

    return {
      markers,
      missions: missionLayer,
      players: playerLayer,
      resources: resourceLayer,
      systems: systemsLayer,
      unplacedMissions: missionLayer.unplaced,
      loading: missionLayer.loading || playerLayer.loading || resourceLayer.loading || systemsLayer.loading,
    };
  }, [missionLayer, playerLayer, resourceLayer, systemsLayer]);
};
