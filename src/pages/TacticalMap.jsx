import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Map as MapIcon } from "lucide-react";
import { T, PageHeader, ActionBtn } from "@/components/ui/TerminalCard";
import LiveStatusStrip from "@/components/live/LiveStatusStrip";

import MapCanvas, { PIN_COLORS, PIN_ICONS } from "@/components/map/MapCanvas";
import MapToolbar from "@/components/map/MapToolbar";
import PinForm from "@/components/map/PinForm";
import PinDetail from "@/components/map/PinDetail";
import MapSidebar from "@/components/map/MapSidebar";
import BroadcastModal from "@/components/map/BroadcastModal";
import MapCalibrationPanel from "@/components/map/MapCalibrationPanel";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useMapRuntimeConfig } from "@/hooks/use-map-runtime-config";
import { normalizedToWorld, worldToNormalized } from "@/lib/map-transform";

const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";
const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";

const buildEmptyPin = (pinTypes, pinStatuses, hordeDirections) => ({
  title: "",
  type: pickFirst(pinTypes),
  note: "",
  status: pickFirst(pinStatuses),
  horde_size: 0,
  horde_direction: pickFirst(hordeDirections),
  rallyMins: 10,
});

const normalizeRole = (role) => (typeof role === "string" ? role.trim().toLowerCase() : "");

const canManageTacticalByRole = (userRole, clanRole) => {
  const globalRole = normalizeRole(userRole);
  const memberRole = normalizeRole(clanRole);
  return globalRole === "admin" || memberRole === "commander" || memberRole === "lieutenant" || memberRole === "officer";
};

export default function TacticalMap() {
  const runtimeConfig = useRuntimeConfig();
  const mapRuntime = useMapRuntimeConfig();
  const mapConfig = mapRuntime.config || null;
  const pinTypes = runtimeConfig.getArray(["taxonomy", "map_pin_types"]);
  const hordeDirections = runtimeConfig.getArray(["taxonomy", "map_horde_directions"]);
  const pinStatuses = runtimeConfig.getArray(["taxonomy", "map_pin_statuses"]);
  const activePinStatus = useMemo(() => pickByToken(pinStatuses, "active") || pickFirst(pinStatuses), [pinStatuses]);
  const routeWaypointType = useMemo(() => pickByToken(pinTypes, "route waypoint") || pickFirst(pinTypes), [pinTypes]);
  const rallyPointType = useMemo(() => pickByToken(pinTypes, "rally point"), [pinTypes]);
  const hordeSightingType = useMemo(() => pickByToken(pinTypes, "horde sighting"), [pinTypes]);
  const dangerZoneType = useMemo(() => pickByToken(pinTypes, "danger zone"), [pinTypes]);
  const canvasRef = useRef(null);
  const broadcastTimeoutsRef = useRef(new globalThis.Map());

  const [pins, setPins] = useState([]);
  const [playerLocs, setPlayerLocs] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [fogSectors, setFogSectors] = useState(new Set());

  const [user, setUser] = useState(null);
  const [myCallsign, setMyCallsign] = useState("");
  const [myClanRole, setMyClanRole] = useState("");
  const isAdmin = user?.role === "admin";
  const canManageTactical = canManageTacticalByRole(user?.role, myClanRole);

  const [placing, setPlacing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const [showFog, setShowFog] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [filterType, setFilterType] = useState("ALL");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [syncingMapData, setSyncingMapData] = useState(false);
  const [mapSyncError, setMapSyncError] = useState(null);
  const [lastSharedPoint, setLastSharedPoint] = useState(null);

  const [newPin, setNewPin] = useState(() => buildEmptyPin(pinTypes, pinStatuses, hordeDirections));
  const [expiryHours, setExpiryHours] = useState("0");
  const [pendingCoords, setPendingCoords] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  const [routePoints, setRoutePoints] = useState([]);
  const [playerTrails, setPlayerTrails] = useState({});

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    setNewPin((prev) => {
      if (prev.type && prev.status && prev.horde_direction) return prev;
      return buildEmptyPin(pinTypes, pinStatuses, hordeDirections);
    });
  }, [pinTypes, pinStatuses, hordeDirections]);

  const buildTrails = useCallback((locs) => {
    const trails = {};
    [...locs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach((loc) => {
      if (!trails[loc.player_callsign]) trails[loc.player_callsign] = [];
      const trail = trails[loc.player_callsign];
      const last = trail[trail.length - 1];
      const point = {
        x: Number.isFinite(Number(loc.normalized_x)) ? Number(loc.normalized_x) : Number(loc.x),
        y: Number.isFinite(Number(loc.normalized_y)) ? Number(loc.normalized_y) : Number(loc.y),
      };
      if (!last || last.x !== point.x || last.y !== point.y) {
        trail.push(point);
        if (trail.length > 10) trail.shift();
      }
    });
    return trails;
  }, []);

  const appendTrailPoint = useCallback((trails, loc) => {
    const next = { ...trails };
    const key = loc.player_callsign;
    const existing = next[key] ? [...next[key]] : [];
    const last = existing[existing.length - 1];
    const point = {
      x: Number.isFinite(Number(loc.normalized_x)) ? Number(loc.normalized_x) : Number(loc.x),
      y: Number.isFinite(Number(loc.normalized_y)) ? Number(loc.normalized_y) : Number(loc.y),
    };
    if (!last || last.x !== point.x || last.y !== point.y) {
      existing.push(point);
      if (existing.length > 10) existing.shift();
    }
    next[key] = existing;
    return next;
  }, []);

  const scheduleBroadcastExpiry = useCallback((broadcastId, delayMs = 30_000) => {
    const existing = broadcastTimeoutsRef.current.get(broadcastId);
    if (existing) clearTimeout(existing);
    const timeoutId = setTimeout(() => {
      setBroadcasts((prev) => prev.filter((entry) => entry.id !== broadcastId));
      broadcastTimeoutsRef.current.delete(broadcastId);
    }, delayMs);
    broadcastTimeoutsRef.current.set(broadcastId, timeoutId);
  }, []);

  const hydrateMapData = useCallback(async () => {
    setSyncingMapData(true);
    setMapSyncError(null);
    try {
      const [pinsRows, locRows, broadcastRows] = await Promise.all([
        base44.entities.MapPin.list("-created_date", 200),
        base44.entities.PlayerLocation.list("-timestamp", 300),
        base44.entities.MapBroadcast.list("-created_date", 80),
      ]);
      const safePins = Array.isArray(pinsRows) ? pinsRows : [];
      const safeLocs = Array.isArray(locRows) ? locRows : [];
      const safeBroadcasts = Array.isArray(broadcastRows) ? broadcastRows : [];
      setPins(safePins);
      setPlayerLocs(safeLocs);
      setPlayerTrails(buildTrails(safeLocs));
      const active = safeBroadcasts.filter((entry) => new Date(entry.expires_at).getTime() > Date.now());
      setBroadcasts(active);
      active.forEach((entry) => {
        const remaining = Math.max(0, new Date(entry.expires_at).getTime() - Date.now());
        scheduleBroadcastExpiry(entry.id, remaining);
      });
    } catch (error) {
      setMapSyncError(error instanceof Error ? error.message : "Map sync failed.");
    } finally {
      setSyncingMapData(false);
    }
  }, [buildTrails, scheduleBroadcastExpiry]);

  useEffect(() => {
    base44.auth.me().then(async (resolvedUser) => {
      setUser(resolvedUser);
      if (!resolvedUser) return;
      try {
        const members = await base44.entities.ClanMember.filter({ user_email: resolvedUser.email });
        const member = Array.isArray(members) && members.length > 0 ? members[0] : null;
        setMyClanRole(member?.role || "");
        setMyCallsign(member?.callsign || resolvedUser.full_name || resolvedUser.email);
      } catch {
        setMyCallsign(resolvedUser.full_name || resolvedUser.email);
      }
    }).catch(() => {});

    hydrateMapData();
    const onOnline = () => hydrateMapData();
    window.addEventListener("online", onOnline);

    const unsubPins = base44.entities.MapPin.subscribe((event) => {
      if (event.type === "create") setPins((prev) => [event.data, ...prev.filter((entry) => entry.id !== event.data.id)]);
      if (event.type === "update") setPins((prev) => prev.map((entry) => (entry.id === event.id ? event.data : entry)));
      if (event.type === "delete") setPins((prev) => prev.filter((entry) => entry.id !== event.id));
    });
    const unsubLocs = base44.entities.PlayerLocation.subscribe((event) => {
      if (event.type === "create" || event.type === "update") {
        setPlayerTrails((prev) => appendTrailPoint(prev, event.data));
        setPlayerLocs((prev) => {
          if (event.type === "create") return [event.data, ...prev.filter((entry) => entry.id !== event.data.id)];
          return prev.map((entry) => (entry.id === event.id ? event.data : entry));
        });
      }
      if (event.type === "delete") {
        setPlayerLocs((prev) => {
          const updated = prev.filter((entry) => entry.id !== event.id);
          setPlayerTrails(buildTrails(updated));
          return updated;
        });
      }
    });
    const unsubBroadcast = base44.entities.MapBroadcast.subscribe((event) => {
      if (event.type === "create" || event.type === "update") {
        const row = event.data;
        if (new Date(row.expires_at).getTime() > Date.now()) {
          setBroadcasts((prev) => [row, ...prev.filter((entry) => entry.id !== row.id)]);
          const remaining = Math.max(0, new Date(row.expires_at).getTime() - Date.now());
          scheduleBroadcastExpiry(row.id, remaining);
        }
      }
      if (event.type === "delete") {
        setBroadcasts((prev) => prev.filter((entry) => entry.id !== event.id));
      }
    });
    return () => {
      window.removeEventListener("online", onOnline);
      unsubPins();
      unsubLocs();
      unsubBroadcast();
      broadcastTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      broadcastTimeoutsRef.current.clear();
    };
  }, [appendTrailPoint, buildTrails, hydrateMapData, scheduleBroadcastExpiry]);

  const heatmapPoints = useMemo(() => {
    const points = [];
    if (hordeSightingType) {
      points.push(...pins.filter((pin) => pin.type === hordeSightingType).map((pin) => ({ ...pin, color: T.red })));
    }
    if (dangerZoneType) {
      points.push(...pins.filter((pin) => pin.type === dangerZoneType).map((pin) => ({ ...pin, color: T.amber })));
    }
    return points;
  }, [dangerZoneType, hordeSightingType, pins]);

  const filteredPins = useMemo(
    () => (filterType === "ALL" ? pins : pins.filter((pin) => pin.type === filterType)),
    [pins, filterType],
  );

  const activePlayerLocs = useMemo(() => playerLocs, [playerLocs]);

  const toWorldCoords = useCallback((normalized) => normalizedToWorld(normalized, mapConfig), [mapConfig]);

  const pushMyLocation = useCallback(async (normalizedX, normalizedY) => {
    if (!myCallsign) return;
    const world = toWorldCoords({ x: normalizedX, y: normalizedY });
    const timestamp = new Date().toISOString();
    const optimisticId = `optimistic-${myCallsign}`;
    const optimistic = {
      id: optimisticId,
      player_callsign: myCallsign,
      x: normalizedX,
      y: normalizedY,
      normalized_x: normalizedX,
      normalized_y: normalizedY,
      world_x: world?.x ?? null,
      world_y: world?.y ?? null,
      map_id: mapConfig?.map_id || "global-map",
      telemetry_source: "client_heartbeat",
      timestamp,
      in_vehicle: false,
    };

    setLastSharedPoint({
      x: normalizedX,
      y: normalizedY,
      normalized_x: normalizedX,
      normalized_y: normalizedY,
      world_x: world?.x ?? null,
      world_y: world?.y ?? null,
    });
    setPlayerLocs((prev) => [optimistic, ...prev.filter((entry) => entry.player_callsign !== myCallsign)]);
    setPlayerTrails((prev) => appendTrailPoint(prev, optimistic));

    try {
      const response = await base44.functions.invoke("updatePlayerLocation", {
        callsign: myCallsign,
        x: normalizedX,
        y: normalizedY,
        in_vehicle: false,
      });
      const location = response?.data?.location || optimistic;
      setPlayerLocs((prev) => [location, ...prev.filter((entry) => entry.player_callsign !== myCallsign)]);
      setPlayerTrails((prev) => appendTrailPoint(prev, location));
      setMapSyncError(null);
    } catch (error) {
      setMapSyncError(error instanceof Error ? error.message : "Failed to sync player location.");
    }
  }, [appendTrailPoint, mapConfig?.map_id, myCallsign, toWorldCoords]);

  useEffect(() => {
    if (!sharing || !myCallsign) return undefined;
    const timer = setInterval(() => {
      const point = lastSharedPoint || activePlayerLocs.find((entry) => entry.player_callsign === myCallsign);
      if (!point) return;
      const x = Number(point.normalized_x ?? point.x);
      const y = Number(point.normalized_y ?? point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      pushMyLocation(x, y);
    }, 15_000);
    return () => clearInterval(timer);
  }, [activePlayerLocs, lastSharedPoint, myCallsign, pushMyLocation, sharing]);

  const handleMapClick = (event) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normalizedX = Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(3));
    const normalizedY = Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(3));
    const world = toWorldCoords({ x: normalizedX, y: normalizedY });
    const point = {
      x: normalizedX,
      y: normalizedY,
      normalized_x: normalizedX,
      normalized_y: normalizedY,
      world_x: world?.x ?? null,
      world_y: world?.y ?? null,
    };

    if (sharing) {
      pushMyLocation(normalizedX, normalizedY);
      return;
    }
    if (routeMode && canManageTactical) {
      setRoutePoints((prev) => [...prev, point]);
      return;
    }
    if (placing && canManageTactical) {
      setPendingCoords(point);
      setShowForm(true);
      setPlacing(false);
    }
  };

  const handleSavePin = async () => {
    if (!newPin.title.trim() || !pendingCoords || !canManageTactical) return;
    const pinData = {
      ...newPin,
      ...pendingCoords,
      map_id: mapConfig?.map_id || "global-map",
      placed_by: myCallsign || user?.full_name || user?.email || "Unknown",
    };
    if (parseFloat(expiryHours) > 0) {
      pinData.expires_at = new Date(Date.now() + parseFloat(expiryHours) * 3600000).toISOString();
    }
    if (rallyPointType && newPin.type === rallyPointType && newPin.rallyMins > 0) {
      pinData.rally_expires_at = new Date(Date.now() + newPin.rallyMins * 60000).toISOString();
    }
    delete pinData.rallyMins;
    const tempId = `optimistic-pin-${Date.now()}`;
    const optimistic = { ...pinData, id: tempId };
    setPins((prev) => [optimistic, ...prev]);
    try {
      const saved = await base44.entities.MapPin.create(pinData);
      setPins((prev) => [saved, ...prev.filter((entry) => entry.id !== tempId && entry.id !== saved.id)]);
      setMapSyncError(null);
      setNewPin(buildEmptyPin(pinTypes, pinStatuses, hordeDirections));
      setExpiryHours("0");
      setPendingCoords(null);
      setShowForm(false);
    } catch (error) {
      setPins((prev) => prev.filter((entry) => entry.id !== tempId));
      setMapSyncError(error instanceof Error ? error.message : "Failed to save map pin.");
    }
  };

  const handleStatusCycle = async (pin) => {
    const statuses = pinStatuses;
    if (!Array.isArray(statuses) || statuses.length === 0 || !canManageTactical) return;
    const next = statuses[(statuses.indexOf(pin.status) + 1) % statuses.length];
    const optimistic = { ...pin, status: next };
    setPins((prev) => prev.map((entry) => (entry.id === pin.id ? optimistic : entry)));
    setSelectedPin(optimistic);
    try {
      const updated = await base44.entities.MapPin.update(pin.id, { status: next });
      setPins((prev) => prev.map((entry) => (entry.id === pin.id ? updated : entry)));
      setSelectedPin(updated);
      setMapSyncError(null);
    } catch (error) {
      setPins((prev) => prev.map((entry) => (entry.id === pin.id ? pin : entry)));
      setSelectedPin(pin);
      setMapSyncError(error instanceof Error ? error.message : "Failed to update pin status.");
    }
  };

  const handleDeletePin = async (id) => {
    if (!canManageTactical) return;
    const snapshot = pins.find((entry) => entry.id === id) || null;
    setPins((prev) => prev.filter((entry) => entry.id !== id));
    setSelectedPin(null);
    try {
      await base44.entities.MapPin.delete(id);
      setMapSyncError(null);
    } catch (error) {
      if (snapshot) {
        setPins((prev) => [snapshot, ...prev.filter((entry) => entry.id !== snapshot.id)]);
      }
      setMapSyncError(error instanceof Error ? error.message : "Failed to delete pin.");
    }
  };

  const handleSaveRoute = async () => {
    if (routePoints.length < 2 || !canManageTactical) return;
    const routeId = `route-${Date.now()}`;
    const optimisticRows = routePoints.map((point, index) => {
      const entry = {
        id: `optimistic-route-${routeId}-${index}`,
        title: `WPT ${index + 1}`,
        type: routeWaypointType,
        x: point.x,
        y: point.y,
        normalized_x: point.normalized_x,
        normalized_y: point.normalized_y,
        world_x: point.world_x,
        world_y: point.world_y,
        map_id: mapConfig?.map_id || "global-map",
        route_id: routeId,
        route_order: index,
        placed_by: myCallsign,
      };
      if (activePinStatus) entry.status = activePinStatus;
      return entry;
    });
    setPins((prev) => [...optimisticRows, ...prev]);
    try {
      const created = await Promise.all(optimisticRows.map((entry) => {
        const payload = { ...entry };
        delete payload.id;
        return base44.entities.MapPin.create(payload);
      }));
      const optimisticIds = new Set(optimisticRows.map((entry) => entry.id));
      setPins((prev) => [...created, ...prev.filter((entry) => !optimisticIds.has(entry.id))]);
      setRoutePoints([]);
      setRouteMode(false);
      setMapSyncError(null);
    } catch (error) {
      const optimisticIds = new Set(optimisticRows.map((entry) => entry.id));
      setPins((prev) => prev.filter((entry) => !optimisticIds.has(entry.id)));
      setMapSyncError(error instanceof Error ? error.message : "Failed to persist route waypoints.");
    }
  };

  const handleBroadcast = async (message, x, y) => {
    if (!canManageTactical) return;
    const normalized = Number.isFinite(Number(x)) && Number.isFinite(Number(y))
      ? { x: Number(x), y: Number(y) }
      : worldToNormalized({ x, y }, mapConfig);
    const normalizedX = normalized?.x ?? 50;
    const normalizedY = normalized?.y ?? 50;
    const world = toWorldCoords({ x: normalizedX, y: normalizedY });
    const expiresAt = new Date(Date.now() + 30000).toISOString();
    const tempId = `optimistic-broadcast-${Date.now()}`;
    const optimistic = {
      id: tempId,
      message,
      x: normalizedX,
      y: normalizedY,
      normalized_x: normalizedX,
      normalized_y: normalizedY,
      world_x: world?.x ?? null,
      world_y: world?.y ?? null,
      map_id: mapConfig?.map_id || "global-map",
      sent_by: myCallsign,
      expires_at: expiresAt,
    };
    setBroadcasts((prev) => [optimistic, ...prev.filter((entry) => entry.id !== tempId)]);
    scheduleBroadcastExpiry(tempId);
    try {
      const created = await base44.entities.MapBroadcast.create({
      message,
      x: normalizedX,
      y: normalizedY,
      normalized_x: normalizedX,
      normalized_y: normalizedY,
      world_x: world?.x ?? null,
      world_y: world?.y ?? null,
      map_id: mapConfig?.map_id || "global-map",
      sent_by: myCallsign,
      expires_at: expiresAt,
    });
      setBroadcasts((prev) => [created, ...prev.filter((entry) => entry.id !== tempId && entry.id !== created.id)]);
      scheduleBroadcastExpiry(created.id);
      setShowBroadcastModal(false);
      setMapSyncError(null);
    } catch (error) {
      setBroadcasts((prev) => prev.filter((entry) => entry.id !== tempId));
      setMapSyncError(error instanceof Error ? error.message : "Failed to send broadcast.");
    }
  };

  const handleFogClear = (key) => {
    if (!canManageTactical) return;
    setFogSectors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="p-4 space-y-3 max-w-7xl mx-auto">
      <PageHeader icon={MapIcon} title="TACTICAL MAP" color={T.cyan}>
        <MapToolbar
          filterType={filterType} onFilterChange={setFilterType}
          sharing={sharing} onToggleSharing={() => setSharing((value) => !value)}
          placing={placing} onTogglePlacing={() => { if (!canManageTactical) return; setPlacing((value) => !value); setShowForm(false); }}
          routeMode={routeMode} onToggleRoute={() => { if (!canManageTactical) return; setRouteMode((value) => !value); if (routeMode) setRoutePoints([]); }}
          showFog={showFog} onToggleFog={() => { if (!canManageTactical) return; setShowFog((value) => !value); }}
          showHeatmap={showHeatmap} onToggleHeatmap={() => setShowHeatmap((value) => !value)}
          isAdmin={canManageTactical}
          onBroadcast={() => { if (canManageTactical) setShowBroadcastModal(true); }}
          pinTypes={pinTypes}
          showCalibration={showCalibration}
          onToggleCalibration={() => setShowCalibration((value) => !value)}
        />
      </PageHeader>

      {runtimeConfig.error && (
        <div className="text-xs px-3 py-2 border" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME MAP TAXONOMY UNAVAILABLE
        </div>
      )}
      {!mapRuntime.hasConfig && (
        <div className="text-xs px-3 py-2 border" style={{ borderColor: T.amber + "66", color: T.amber }}>
          MAP CONFIG UNAVAILABLE - coordinate scaling awaits live map runtime calibration.
        </div>
      )}
      <LiveStatusStrip
        label="CLAN MAP SYNC"
        source={mapRuntime.source || "unavailable"}
        retrievedAt={mapRuntime.updatedAt || mapRuntime.retrievedAt}
        loading={syncingMapData || mapRuntime.isFetching}
        error={mapSyncError || mapRuntime.error?.message || null}
        staleAfterMs={30_000}
        onRetry={() => {
          setMapSyncError(null);
          hydrateMapData();
          mapRuntime.refetch();
        }}
        extraBadges={[
          { label: `PINS ${pins.length}`, color: T.amber },
          { label: `PLAYERS ${playerLocs.length}`, color: T.cyan },
          { label: `BROADCASTS ${broadcasts.length}`, color: "#ff00ff" },
        ]}
      />

      {placing && <div className="text-xs px-3 py-2 border" style={{ borderColor: T.amber + "88", color: T.amber, background: T.amber + "0d" }}>⚠ CLICK MAP TO PLACE PIN</div>}
      {sharing && <div className="text-xs px-3 py-2 border" style={{ borderColor: T.green + "88", color: T.green, background: T.green + "0d" }}>● LOCATION SHARING ACTIVE — CLICK MAP TO UPDATE YOUR POSITION</div>}
      {routeMode && <div className="text-xs px-3 py-2 border" style={{ borderColor: T.cyan + "88", color: T.cyan, background: T.cyan + "0d" }}>◈ ROUTE MODE — CLICK MAP TO ADD WAYPOINTS, THEN SAVE ROUTE</div>}
      {showFog && canManageTactical && <div className="text-xs px-3 py-2 border" style={{ borderColor: T.textDim + "44", color: T.textDim, background: "rgba(0,0,0,0.3)" }}>FOG ACTIVE — CLICK DARK SECTORS TO CLEAR THEM</div>}

      {showCalibration && (
        <MapCalibrationPanel
          initialConfig={mapConfig}
          isAdmin={isAdmin}
          onSaved={() => mapRuntime.refetch()}
        />
      )}

      {!canManageTactical && (
        <div className="flex items-center justify-between border px-3 py-2" style={{ borderColor: T.border, color: T.textDim }}>
          <span className="text-xs">Tactical object management is restricted to officers/admin. You can still share your own live location.</span>
          <ActionBtn color={sharing ? T.green : T.textDim} onClick={() => setSharing((value) => !value)} small>
            {sharing ? "SHARING" : "ENABLE SHARE"}
          </ActionBtn>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <MapCanvas
            canvasRef={canvasRef}
            mapConfig={mapConfig}
            pins={filteredPins}
            playerLocs={activePlayerLocs}
            playerTrails={playerTrails}
            myCallsign={myCallsign}
            pendingCoords={pendingCoords}
            routePoints={routePoints}
            broadcasts={broadcasts}
            showFog={showFog}
            fogSectors={fogSectors}
            fogClearable={canManageTactical ? handleFogClear : null}
            showHeatmap={showHeatmap}
            heatmapPoints={heatmapPoints}
            nowMs={nowMs}
            placingMode={placing || routeMode}
            onClick={handleMapClick}
            onPinClick={(pin) => { setSelectedPin(pin === selectedPin ? null : pin); setShowForm(false); }}
            hordeSightingType={hordeSightingType}
            rallyPointType={rallyPointType}
          />

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(PIN_ICONS).map(([type, icon]) => (
              <div key={type} className="flex items-center gap-1">
                <span style={{ color: PIN_COLORS[type], fontSize: "9px" }}>{icon}</span>
                <span style={{ color: T.textFaint, fontSize: "9px" }}>{type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {showBroadcastModal && (
            <BroadcastModal onSend={handleBroadcast} onClose={() => setShowBroadcastModal(false)} />
          )}

          {showForm && (
            <PinForm
              pin={newPin}
              onChange={(delta) => setNewPin((prev) => ({ ...prev, ...delta }))}
              onSave={handleSavePin}
              onClose={() => { setShowForm(false); setPendingCoords(null); }}
              expiryHours={expiryHours}
              onExpiryChange={setExpiryHours}
              pinTypes={pinTypes}
              hordeDirections={hordeDirections}
              pinStatuses={pinStatuses}
              hordeSightingType={hordeSightingType}
              rallyPointType={rallyPointType}
            />
          )}

          {selectedPin && !showForm && (
            <PinDetail
              pin={selectedPin}
              isAdmin={canManageTactical}
              onClose={() => setSelectedPin(null)}
              onStatusCycle={() => handleStatusCycle(selectedPin)}
              onDelete={() => handleDeletePin(selectedPin.id)}
              hordeSightingType={hordeSightingType}
              rallyPointType={rallyPointType}
            />
          )}

          <MapSidebar
            pins={filteredPins}
            playerLocs={activePlayerLocs}
            mapConfig={mapConfig}
            myCallsign={myCallsign}
            routePoints={routePoints}
            nowMs={nowMs}
            onPinClick={(pin) => { setSelectedPin(pin); setShowForm(false); }}
            onClearRoute={() => { setRoutePoints([]); setRouteMode(false); }}
            onSaveRoute={handleSaveRoute}
          />
        </div>
      </div>
    </div>
  );
}
