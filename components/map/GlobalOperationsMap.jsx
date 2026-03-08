import { useEffect, useMemo } from "react";
import { Circle, CircleMarker, MapContainer, Pane, Polyline, Rectangle, Tooltip, useMap } from "react-leaflet";
import { CRS } from "leaflet";
import { T } from "@/components/ui/TerminalCard";

const MAP_BOUNDS = [
  [0, 0],
  [100, 100],
];

const HQ_POINT = [94, 6];

const markerColorByKind = {
  mission: T.amber,
  player: T.cyan,
  resource: T.teal,
  system: T.red,
};

const markerRadiusByKind = {
  mission: 6,
  player: 5,
  resource: 5,
  system: 7,
};

const layerOrder = {
  system: 4,
  mission: 3,
  player: 2,
  resource: 1,
};

const toLatLng = (marker) => [100 - marker.y, marker.x];

function MapFocusController({ focusPoint }) {
  const map = useMap();

  useEffect(() => {
    if (!focusPoint) return;
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom < 3 ? 3 : currentZoom;
    map.flyTo(focusPoint, targetZoom, {
      duration: 0.45,
      easeLinearity: 0.25,
    });
  }, [focusPoint, map]);

  return null;
}

export default function GlobalOperationsMap({
  markers = [],
  selectedMarker = null,
  onMarkerSelect,
  showGrid = true,
  className = "",
}) {
  const sortedMarkers = useMemo(
    () =>
      [...markers].sort((left, right) => {
        const leftOrder = layerOrder[left.kind] ?? 0;
        const rightOrder = layerOrder[right.kind] ?? 0;
        return leftOrder - rightOrder;
      }),
    [markers],
  );

  const selectedPoint = selectedMarker ? toLatLng(selectedMarker) : null;
  const markerCounts = useMemo(() => {
    const counts = {
      mission: 0,
      player: 0,
      resource: 0,
      system: 0,
    };
    for (const marker of markers) {
      const key = marker.kind;
      if (key in counts) {
        counts[key] += 1;
      }
    }
    return counts;
  }, [markers]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer
        center={[50, 50]}
        zoom={2}
        minZoom={2}
        maxZoom={5}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={0.8}
        crs={CRS.Simple}
        zoomControl={false}
        attributionControl={false}
        className="ds-global-map"
      >
        <Pane name="base" style={{ zIndex: 100 }} />
        <Pane name="grid" style={{ zIndex: 250 }} />
        <Pane name="paths" style={{ zIndex: 350 }} />
        <Pane name="markers" style={{ zIndex: 500 }} />
        <Pane name="focus" style={{ zIndex: 700 }} />

        <Rectangle
          bounds={MAP_BOUNDS}
          pane="base"
          pathOptions={{
            stroke: false,
            fillColor: "#111218",
            fillOpacity: 0.94,
          }}
        />

        {showGrid &&
          Array.from({ length: 11 }).map((_, index) => {
            const coord = index * 10;
            return (
              <Polyline
                key={`grid-v-${coord}`}
                positions={[
                  [0, coord],
                  [100, coord],
                ]}
                pane="grid"
                pathOptions={{
                  color: "rgba(62,44,24,0.35)",
                  weight: 1,
                  opacity: 0.4,
                  dashArray: "2 4",
                }}
              />
            );
          })}

        {showGrid &&
          Array.from({ length: 11 }).map((_, index) => {
            const coord = index * 10;
            return (
              <Polyline
                key={`grid-h-${coord}`}
                positions={[
                  [coord, 0],
                  [coord, 100],
                ]}
                pane="grid"
                pathOptions={{
                  color: "rgba(62,44,24,0.35)",
                  weight: 1,
                  opacity: 0.4,
                  dashArray: "2 4",
                }}
              />
            );
          })}

        {selectedMarker?.kind === "mission" && selectedPoint && (
          <Polyline
            pane="paths"
            positions={[HQ_POINT, selectedPoint]}
            pathOptions={{
              color: selectedMarker.color || T.amber,
              weight: 2,
              opacity: 0.75,
              dashArray: "5 6",
            }}
          />
        )}

        {sortedMarkers.map((marker) => {
          const latLng = toLatLng(marker);
          const color = marker.color || markerColorByKind[marker.kind] || T.textDim;
          const radius = markerRadiusByKind[marker.kind] ?? 5;
          const selected = Boolean(selectedMarker && selectedMarker.id === marker.id);

          return (
            <CircleMarker
              key={marker.id}
              center={latLng}
              pane="markers"
              radius={selected ? radius + 2 : radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: selected ? 0.86 : 0.65,
                weight: selected ? 2 : 1,
                opacity: selected ? 1 : 0.75,
              }}
              eventHandlers={{
                click: () => onMarkerSelect?.(marker),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.96}>
                <div style={{ minWidth: "140px" }}>
                  <div style={{ color, fontSize: "10px", letterSpacing: "0.08em", fontFamily: "'Orbitron', monospace" }}>
                    {marker.label}
                  </div>
                  <div style={{ color: T.textDim, fontSize: "10px" }}>{marker.status || marker.kind}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {selectedPoint && (
          <Circle
            center={selectedPoint}
            pane="focus"
            radius={selectedMarker?.kind === "player" ? 7 : selectedMarker?.kind === "system" ? 9 : 8}
            pathOptions={{
              color: selectedMarker?.color || T.amber,
              fillColor: selectedMarker?.color || T.amber,
              fillOpacity: 0.05,
              weight: 1.4,
              opacity: 0.9,
              dashArray: "5 5",
            }}
          />
        )}

        <MapFocusController focusPoint={selectedPoint} />
      </MapContainer>

      <div
        className="pointer-events-none absolute left-2 bottom-2 border px-2 py-1.5 flex items-center gap-3"
        style={{
          borderColor: `${T.border}bb`,
          background: "rgba(17, 18, 24, 0.82)",
          color: T.textDim,
          fontSize: "9px",
          letterSpacing: "0.08em",
        }}
      >
        <span style={{ color: markerColorByKind.mission }}>MIS {markerCounts.mission}</span>
        <span style={{ color: markerColorByKind.player }}>OPS {markerCounts.player}</span>
        <span style={{ color: markerColorByKind.resource }}>RES {markerCounts.resource}</span>
        <span style={{ color: markerColorByKind.system }}>SYS {markerCounts.system}</span>
      </div>
    </div>
  );
}
