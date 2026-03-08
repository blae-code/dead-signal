import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import { T } from "@/components/ui/TerminalCard";
import { useAnimationEnabled } from "@/hooks/use-animation-enabled";
import { resolveNormalizedPoint } from "@/lib/map-transform";

const PIN_COLORS = {
  "Loot Cache": T.amber, "Safe House": T.green, "Danger Zone": T.red,
  "Resource Node": T.cyan, "Enemy Sighting": T.red, "Clan Base": T.green,
  "Vehicle Spawn": T.cyan, "Objective": T.orange, "Horde Sighting": "#ff2020",
  "Rally Point": "#ff00ff", "Route Waypoint": T.textDim, "Other": T.textDim,
};
const PIN_ICONS = {
  "Loot Cache": "◆", "Safe House": "⌂", "Danger Zone": "☢",
  "Resource Node": "◉", "Enemy Sighting": "☠", "Clan Base": "⚑",
  "Vehicle Spawn": "⊞", "Objective": "✦", "Horde Sighting": "🧟",
  "Rally Point": "★", "Route Waypoint": "◈", "Other": "●",
};

const WORLD_BOUNDS = {
  minLng: -180,
  maxLng: 180,
  minLat: -85,
  maxLat: 85,
};

const BASE_SOURCE_ID = "tt-base-source";
const BASE_LAYER_ID = "tt-base-layer";
const ROUTE_SOURCE_ID = "tt-routes-source";
const ROUTE_LAYER_ID = "tt-routes-layer";
const TRAIL_SOURCE_ID = "tt-trails-source";
const TRAIL_LAYER_ID = "tt-trails-layer";
const HEAT_SOURCE_ID = "tt-heat-source";
const HEAT_LAYER_ID = "tt-heat-layer";
const FOG_SOURCE_ID = "tt-fog-source";
const FOG_LAYER_ID = "tt-fog-layer";
const OVERLAY_POLY_SOURCE_ID = "tt-overlays-poly-source";
const OVERLAY_POLY_LAYER_ID = "tt-overlays-poly-layer";
const OVERLAY_CIRCLE_SOURCE_ID = "tt-overlays-circle-source";
const OVERLAY_CIRCLE_LAYER_ID = "tt-overlays-circle-layer";

const asFeatureCollection = (features) => ({
  type: "FeatureCollection",
  features,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizedToLngLat = (x, y) => {
  const nx = clamp(Number(x), 0, 100);
  const ny = clamp(Number(y), 0, 100);
  const lng = WORLD_BOUNDS.minLng + (nx / 100) * (WORLD_BOUNDS.maxLng - WORLD_BOUNDS.minLng);
  const lat = WORLD_BOUNDS.maxLat - (ny / 100) * (WORLD_BOUNDS.maxLat - WORLD_BOUNDS.minLat);
  return [lng, lat];
};

const lngLatToNormalized = (lng, lat) => {
  const nx = ((lng - WORLD_BOUNDS.minLng) / (WORLD_BOUNDS.maxLng - WORLD_BOUNDS.minLng)) * 100;
  const ny = ((WORLD_BOUNDS.maxLat - lat) / (WORLD_BOUNDS.maxLat - WORLD_BOUNDS.minLat)) * 100;
  return {
    x: clamp(Number(nx.toFixed(3)), 0, 100),
    y: clamp(Number(ny.toFixed(3)), 0, 100),
  };
};

const resolveMapAsset = (config) => {
  if (!config || typeof config !== "object") return null;
  if (typeof config.tile_url_template === "string" && config.tile_url_template.trim()) {
    return { type: "tile", url: config.tile_url_template.trim() };
  }
  if (typeof config.image_url === "string" && config.image_url.trim()) {
    return { type: "image", url: config.image_url.trim() };
  }
  return null;
};

const removeLayerAndSource = (map, layerId, sourceId) => {
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
};

const getPinAlpha = (pin, now) => {
  if (!pin.expires_at) return 1;
  const msLeft = new Date(pin.expires_at).getTime() - now;
  const totalMs = 6 * 3600 * 1000;
  if (msLeft <= 0) return 0.15;
  return Math.max(0.2, Math.min(1, msLeft / totalMs));
};

const getTelemetryState = (timestamp, now) => {
  const parsed = typeof timestamp === "string" ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(parsed)) return { key: "stale", color: T.red };
  const ageMs = Math.max(0, now - parsed);
  if (ageMs <= 5_000) return { key: "fresh", color: T.green };
  if (ageMs <= 30_000) return { key: "delayed", color: T.amber };
  return { key: "stale", color: T.red };
};

const toMapPoint = (row, config) => resolveNormalizedPoint(row, config);

const routeFeatures = (routes, routePoints, config) => {
  const features = [];
  routes.forEach((route, index) => {
    const points = Array.isArray(route?.points) ? route.points : [];
    const coordinates = points
      .map((point) => toMapPoint(point, config))
      .filter(Boolean)
      .map((point) => normalizedToLngLat(point.x, point.y));
    if (coordinates.length >= 2) {
      features.push({
        type: "Feature",
        id: route.id || `route-${index}`,
        properties: { type: "saved_route" },
        geometry: { type: "LineString", coordinates },
      });
    }
  });
  const draftCoordinates = routePoints
    .map((point) => toMapPoint(point, config))
    .filter(Boolean)
    .map((point) => normalizedToLngLat(point.x, point.y));
  if (draftCoordinates.length >= 2) {
    features.push({
      type: "Feature",
      id: "draft-route",
      properties: { type: "draft_route" },
      geometry: { type: "LineString", coordinates: draftCoordinates },
    });
  }
  return features;
};

const trailFeatures = (trails, config) => Object.entries(trails).flatMap(([callsign, points]) => {
  const coordinates = (Array.isArray(points) ? points : [])
    .map((point) => toMapPoint(point, config))
    .filter(Boolean)
    .map((point) => normalizedToLngLat(point.x, point.y));
  if (coordinates.length < 2) return [];
  return [{
    type: "Feature",
    id: `trail-${callsign}`,
    properties: { callsign },
    geometry: { type: "LineString", coordinates },
  }];
});

const heatFeatures = (points, config) => points.map((point, index) => {
  const mapPoint = toMapPoint(point, config);
  if (!mapPoint) return null;
  return {
    type: "Feature",
    id: `heat-${index}`,
    properties: {
      color: point.color || T.red,
    },
    geometry: {
      type: "Point",
      coordinates: normalizedToLngLat(mapPoint.x, mapPoint.y),
    },
  };
}).filter(Boolean);

const fogFeatures = (showFog, fogSectors) => {
  if (!showFog) return [];
  const features = [];
  for (let col = 0; col < 10; col += 1) {
    for (let row = 0; row < 8; row += 1) {
      const key = `${col}-${row}`;
      if (fogSectors.has(key)) continue;
      const x0 = col * 10;
      const x1 = (col + 1) * 10;
      const y0 = row * 12.5;
      const y1 = (row + 1) * 12.5;
      const ring = [
        normalizedToLngLat(x0, y0),
        normalizedToLngLat(x1, y0),
        normalizedToLngLat(x1, y1),
        normalizedToLngLat(x0, y1),
        normalizedToLngLat(x0, y0),
      ];
      features.push({
        type: "Feature",
        id: key,
        properties: { key },
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      });
    }
  }
  return features;
};

const overlayFeatures = (overlays, config) => {
  const polygons = [];
  const circles = [];
  overlays.forEach((overlay, index) => {
    const geometry = typeof overlay?.geometry === "string" ? overlay.geometry.toLowerCase() : "circle";
    const color = typeof overlay?.color === "string" ? overlay.color : "#ff2020";
    const opacity = Number.isFinite(Number(overlay?.opacity)) ? Number(overlay.opacity) : 0.25;
    if (geometry === "polygon" && Array.isArray(overlay?.points)) {
      const coordinates = overlay.points
        .map((point) => toMapPoint(point, config))
        .filter(Boolean)
        .map((point) => normalizedToLngLat(point.x, point.y));
      if (coordinates.length >= 3) {
        polygons.push({
          type: "Feature",
          id: overlay.id || `overlay-poly-${index}`,
          properties: { color, opacity },
          geometry: {
            type: "Polygon",
            coordinates: [[...coordinates, coordinates[0]]],
          },
        });
      }
      return;
    }
    const center = toMapPoint({
      normalized_x: overlay?.center_x,
      normalized_y: overlay?.center_y,
      x: overlay?.center_x,
      y: overlay?.center_y,
    }, config);
    if (!center) return;
    circles.push({
      type: "Feature",
      id: overlay.id || `overlay-circle-${index}`,
      properties: {
        color,
        opacity,
        radius: Number.isFinite(Number(overlay?.radius)) ? Number(overlay.radius) : 12,
      },
      geometry: {
        type: "Point",
        coordinates: normalizedToLngLat(center.x, center.y),
      },
    });
  });
  return { polygons, circles };
};

const styleSpec = {
  version: 8,
  sources: {},
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  layers: [
    {
      id: "tt-background",
      type: "background",
      paint: {
        "background-color": "#0a0806",
      },
    },
  ],
};

export { PIN_COLORS, PIN_ICONS };

export default function MapCanvas({
  canvasRef,
  mapConfig,
  pins,
  playerLocs,
  playerTrails,
  myCallsign,
  pendingCoords,
  routePoints,
  routes = [],
  overlays = [],
  broadcasts,
  showFog,
  fogSectors,
  fogClearable,
  showHeatmap,
  heatmapPoints,
  placingMode,
  onClick,
  onPinClick,
  hordeSightingType = "",
  rallyPointType = "",
  nowMs,
}) {
  const animationEnabled = useAnimationEnabled();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const loadedRef = useRef(false);
  const now = nowMs ?? Date.now();

  const routeGeoJson = useMemo(
    () => asFeatureCollection(routeFeatures(routes, routePoints, mapConfig)),
    [mapConfig, routePoints, routes],
  );
  const trailGeoJson = useMemo(
    () => asFeatureCollection(trailFeatures(playerTrails, mapConfig)),
    [mapConfig, playerTrails],
  );
  const heatGeoJson = useMemo(
    () => asFeatureCollection(showHeatmap ? heatFeatures(heatmapPoints, mapConfig) : []),
    [heatmapPoints, mapConfig, showHeatmap],
  );
  const fogGeoJson = useMemo(
    () => asFeatureCollection(fogFeatures(showFog, fogSectors)),
    [fogSectors, showFog],
  );
  const overlayGeoJson = useMemo(
    () => overlayFeatures(overlays, mapConfig),
    [mapConfig, overlays],
  );

  useEffect(() => {
    if (!containerRef.current) return undefined;
    if (mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleSpec,
      center: [0, 0],
      zoom: Number.isFinite(Number(mapConfig?.default_zoom)) ? Number(mapConfig.default_zoom) : 1,
      minZoom: Number.isFinite(Number(mapConfig?.min_zoom)) ? Number(mapConfig.min_zoom) : 0.25,
      maxZoom: Number.isFinite(Number(mapConfig?.max_zoom)) ? Number(mapConfig.max_zoom) : 5,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    });
    mapRef.current = map;
    if (canvasRef) {
      canvasRef.current = containerRef.current;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      loadedRef.current = true;
      map.fitBounds(
        [[WORLD_BOUNDS.minLng, WORLD_BOUNDS.minLat], [WORLD_BOUNDS.maxLng, WORLD_BOUNDS.maxLat]],
        { padding: 20, duration: 0 },
      );
      map.setMaxBounds([[WORLD_BOUNDS.minLng, WORLD_BOUNDS.minLat], [WORLD_BOUNDS.maxLng, WORLD_BOUNDS.maxLat]]);
    });

    map.on("click", (event) => {
      const point = lngLatToNormalized(event.lngLat.lng, event.lngLat.lat);
      if (showFog && fogClearable) {
        const col = Math.min(9, Math.max(0, Math.floor(point.x / 10)));
        const row = Math.min(7, Math.max(0, Math.floor(point.y / 12.5)));
        const key = `${col}-${row}`;
        if (!fogSectors.has(key)) {
          fogClearable(key);
          return;
        }
      }
      if (onClick) {
        onClick({
          normalizedX: point.x,
          normalizedY: point.y,
          originalEvent: event.originalEvent,
          lngLat: event.lngLat,
        });
      }
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [canvasRef, fogClearable, fogSectors, mapConfig?.default_zoom, mapConfig?.max_zoom, mapConfig?.min_zoom, onClick, showFog]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const asset = resolveMapAsset(mapConfig);

    removeLayerAndSource(map, BASE_LAYER_ID, BASE_SOURCE_ID);
    if (!asset) return;

    if (asset.type === "tile") {
      map.addSource(BASE_SOURCE_ID, {
        type: "raster",
        tiles: [asset.url],
        tileSize: 256,
      });
      map.addLayer({
        id: BASE_LAYER_ID,
        type: "raster",
        source: BASE_SOURCE_ID,
        paint: {
          "raster-opacity": 0.88,
        },
      });
      return;
    }

    map.addSource(BASE_SOURCE_ID, {
      type: "image",
      url: asset.url,
      coordinates: [
        [WORLD_BOUNDS.minLng, WORLD_BOUNDS.maxLat],
        [WORLD_BOUNDS.maxLng, WORLD_BOUNDS.maxLat],
        [WORLD_BOUNDS.maxLng, WORLD_BOUNDS.minLat],
        [WORLD_BOUNDS.minLng, WORLD_BOUNDS.minLat],
      ],
    });
    map.addLayer({
      id: BASE_LAYER_ID,
      type: "raster",
      source: BASE_SOURCE_ID,
      paint: {
        "raster-opacity": 0.88,
      },
    });
  }, [mapConfig]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    if (!map.getSource(ROUTE_SOURCE_ID)) {
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: asFeatureCollection([]) });
    }
    if (!map.getLayer(ROUTE_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "type"], "draft_route"],
            T.cyan,
            T.green,
          ],
          "line-width": 2,
          "line-opacity": 0.8,
          "line-dasharray": [2, 1.5],
        },
      });
    }
    map.getSource(ROUTE_SOURCE_ID).setData(routeGeoJson);
  }, [routeGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    if (!map.getSource(TRAIL_SOURCE_ID)) {
      map.addSource(TRAIL_SOURCE_ID, { type: "geojson", data: asFeatureCollection([]) });
    }
    if (!map.getLayer(TRAIL_LAYER_ID)) {
      map.addLayer({
        id: TRAIL_LAYER_ID,
        type: "line",
        source: TRAIL_SOURCE_ID,
        paint: {
          "line-color": T.cyan,
          "line-width": 1.2,
          "line-opacity": 0.45,
          "line-dasharray": [1, 2.5],
        },
      });
    }
    map.getSource(TRAIL_SOURCE_ID).setData(trailGeoJson);
  }, [trailGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    if (!map.getSource(HEAT_SOURCE_ID)) {
      map.addSource(HEAT_SOURCE_ID, { type: "geojson", data: asFeatureCollection([]) });
    }
    if (!map.getLayer(HEAT_LAYER_ID)) {
      map.addLayer({
        id: HEAT_LAYER_ID,
        type: "circle",
        source: HEAT_SOURCE_ID,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 24,
          "circle-opacity": 0.26,
          "circle-blur": 0.8,
        },
      });
    }
    map.getSource(HEAT_SOURCE_ID).setData(heatGeoJson);
  }, [heatGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (!map.getSource(FOG_SOURCE_ID)) {
      map.addSource(FOG_SOURCE_ID, { type: "geojson", data: asFeatureCollection([]) });
    }
    if (!map.getLayer(FOG_LAYER_ID)) {
      map.addLayer({
        id: FOG_LAYER_ID,
        type: "fill",
        source: FOG_SOURCE_ID,
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0.72,
          "fill-outline-color": "rgba(57,255,20,0.08)",
        },
      });
    }
    map.getSource(FOG_SOURCE_ID).setData(fogGeoJson);
  }, [fogGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (!map.getSource(OVERLAY_POLY_SOURCE_ID)) {
      map.addSource(OVERLAY_POLY_SOURCE_ID, { type: "geojson", data: asFeatureCollection([]) });
    }
    if (!map.getLayer(OVERLAY_POLY_LAYER_ID)) {
      map.addLayer({
        id: OVERLAY_POLY_LAYER_ID,
        type: "fill",
        source: OVERLAY_POLY_SOURCE_ID,
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#ff2020"],
          "fill-opacity": ["coalesce", ["get", "opacity"], 0.25],
          "fill-outline-color": ["coalesce", ["get", "color"], "#ff2020"],
        },
      });
    }
    map.getSource(OVERLAY_POLY_SOURCE_ID).setData(asFeatureCollection(overlayGeoJson.polygons));

    if (!map.getSource(OVERLAY_CIRCLE_SOURCE_ID)) {
      map.addSource(OVERLAY_CIRCLE_SOURCE_ID, { type: "geojson", data: asFeatureCollection([]) });
    }
    if (!map.getLayer(OVERLAY_CIRCLE_LAYER_ID)) {
      map.addLayer({
        id: OVERLAY_CIRCLE_LAYER_ID,
        type: "circle",
        source: OVERLAY_CIRCLE_SOURCE_ID,
        paint: {
          "circle-color": ["coalesce", ["get", "color"], "#ff2020"],
          "circle-opacity": ["coalesce", ["get", "opacity"], 0.25],
          "circle-radius": ["coalesce", ["get", "radius"], 10],
          "circle-stroke-color": ["coalesce", ["get", "color"], "#ff2020"],
          "circle-stroke-opacity": 0.7,
          "circle-stroke-width": 1,
        },
      });
    }
    map.getSource(OVERLAY_CIRCLE_SOURCE_ID).setData(asFeatureCollection(overlayGeoJson.circles));
  }, [overlayGeoJson.circles, overlayGeoJson.polygons]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.getCanvas().style.cursor = placingMode ? "crosshair" : "grab";
  }, [placingMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    pins.forEach((pin) => {
      const point = toMapPoint(pin, mapConfig);
      if (!point) return;
      const markerEl = document.createElement("button");
      markerEl.type = "button";
      markerEl.title = pin.title || "pin";
      markerEl.style.background = "transparent";
      markerEl.style.border = "none";
      markerEl.style.padding = "0";
      markerEl.style.margin = "0";
      markerEl.style.cursor = "pointer";
      markerEl.style.color = PIN_COLORS[pin.type] || T.textDim;
      markerEl.style.fontSize = "16px";
      markerEl.style.textShadow = `0 0 6px ${PIN_COLORS[pin.type] || T.textDim}`;
      markerEl.style.opacity = String(getPinAlpha(pin, now));
      markerEl.textContent = PIN_ICONS[pin.type] || "●";
      markerEl.addEventListener("click", (event) => {
        event.stopPropagation();
        onPinClick?.(pin);
      });
      const marker = new maplibregl.Marker({
        element: markerEl,
        anchor: "center",
      }).setLngLat(normalizedToLngLat(point.x, point.y)).addTo(map);
      markerRefs.current.push(marker);
    });

    playerLocs.forEach((loc) => {
      const point = toMapPoint(loc, mapConfig);
      if (!point) return;
      const isMe = loc.player_callsign === myCallsign;
      const freshness = getTelemetryState(loc.timestamp, now);
      const markerEl = document.createElement("div");
      markerEl.style.position = "relative";
      markerEl.style.width = "12px";
      markerEl.style.height = "12px";
      markerEl.style.borderRadius = "50%";
      markerEl.style.background = isMe ? T.green : freshness.color;
      markerEl.style.border = `2px solid ${isMe ? T.green : freshness.color}`;
      markerEl.style.boxShadow = `0 0 8px ${isMe ? T.green : freshness.color}`;
      if (animationEnabled) {
        markerEl.className = "layout-nav-dot-pulse";
      }
      const label = document.createElement("div");
      label.style.position = "absolute";
      label.style.left = "50%";
      label.style.top = "12px";
      label.style.transform = "translateX(-50%)";
      label.style.whiteSpace = "nowrap";
      label.style.fontSize = "8px";
      label.style.color = isMe ? T.green : freshness.color;
      label.style.textShadow = `0 0 4px ${isMe ? T.green : freshness.color}`;
      label.textContent = `${loc.player_callsign || "PLAYER"}${loc.in_vehicle ? " VEH" : ""}${freshness.key !== "fresh" ? ` ${freshness.key.toUpperCase()}` : ""}`;
      markerEl.appendChild(label);
      const marker = new maplibregl.Marker({
        element: markerEl,
        anchor: "center",
      }).setLngLat(normalizedToLngLat(point.x, point.y)).addTo(map);
      markerRefs.current.push(marker);
    });

    broadcasts.forEach((broadcast) => {
      const point = toMapPoint(broadcast, mapConfig);
      if (!point) return;
      const markerEl = document.createElement("div");
      markerEl.style.background = "rgba(255,0,255,0.12)";
      markerEl.style.border = "1px solid #ff00ff";
      markerEl.style.color = "#ff00ff";
      markerEl.style.padding = "3px 8px";
      markerEl.style.fontSize = "9px";
      markerEl.style.whiteSpace = "nowrap";
      markerEl.style.fontFamily = "'Orbitron', monospace";
      markerEl.style.letterSpacing = "0.08em";
      if (animationEnabled) markerEl.className = "threat-blink";
      markerEl.textContent = `⚡ ${broadcast.message}`;
      const marker = new maplibregl.Marker({
        element: markerEl,
        anchor: "bottom",
      }).setLngLat(normalizedToLngLat(point.x, point.y)).addTo(map);
      markerRefs.current.push(marker);
    });

    if (pendingCoords) {
      const point = toMapPoint(pendingCoords, mapConfig);
      if (point) {
        const markerEl = document.createElement("div");
        markerEl.style.width = "12px";
        markerEl.style.height = "12px";
        markerEl.style.border = "2px solid #ffffff";
        markerEl.style.background = "transparent";
        markerEl.style.borderRadius = "50%";
        markerEl.style.boxShadow = "0 0 8px rgba(255,255,255,0.7)";
        if (animationEnabled) markerEl.className = "layout-nav-dot-pulse";
        const marker = new maplibregl.Marker({
          element: markerEl,
          anchor: "center",
        }).setLngLat(normalizedToLngLat(point.x, point.y)).addTo(map);
        markerRefs.current.push(marker);
      }
    }

    routePoints.forEach((point) => {
      const mapPoint = toMapPoint(point, mapConfig);
      if (!mapPoint) return;
      const markerEl = document.createElement("div");
      markerEl.style.width = "8px";
      markerEl.style.height = "8px";
      markerEl.style.borderRadius = "50%";
      markerEl.style.background = T.cyan;
      markerEl.style.border = `1px solid ${T.cyan}`;
      markerEl.style.boxShadow = `0 0 5px ${T.cyan}`;
      const marker = new maplibregl.Marker({
        element: markerEl,
        anchor: "center",
      }).setLngLat(normalizedToLngLat(mapPoint.x, mapPoint.y)).addTo(map);
      markerRefs.current.push(marker);
    });
  }, [animationEnabled, broadcasts, hordeSightingType, mapConfig, myCallsign, now, onPinClick, pendingCoords, pins, playerLocs, rallyPointType, routePoints]);

  return (
    <div
      ref={containerRef}
      className="relative border overflow-hidden select-none"
      style={{
        borderColor: T.border,
        background: "#040a04",
        aspectRatio: "16/10",
      }}
    />
  );
}
