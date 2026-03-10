import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Map as MapIcon } from "lucide-react";
import { T, PageHeader } from "@/components/ui/TerminalCard";

import MapCanvas, { PIN_COLORS, PIN_ICONS } from "@/components/map/MapCanvas";
import MapToolbar from "@/components/map/MapToolbar";
import PinForm from "@/components/map/PinForm";
import PinDetail from "@/components/map/PinDetail";
import MapSidebar from "@/components/map/MapSidebar";
import BroadcastModal from "@/components/map/BroadcastModal";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

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

export default function TacticalMap() {
  const runtimeConfig = useRuntimeConfig();
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

  // ── Data ──────────────────────────────────────────────────────────────────
  const [pins, setPins]             = useState([]);
  const [playerLocs, setPlayerLocs] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [fogSectors, setFogSectors] = useState(new Set()); // cleared sectors

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser]             = useState(null);
  const [myCallsign, setMyCallsign] = useState("");
  const isAdmin = user?.role === "admin";

  // ── UI modes ──────────────────────────────────────────────────────────────
  const [placing, setPlacing]       = useState(false);
  const [sharing, setSharing]       = useState(false);
  const [routeMode, setRouteMode]   = useState(false);
  const [showFog, setShowFog]       = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [filterType, setFilterType] = useState("ALL");
  const [nowMs, setNowMs] = useState(() => Date.now());

  // ── Pin form ──────────────────────────────────────────────────────────────
  const [newPin, setNewPin]         = useState(() => buildEmptyPin(pinTypes, pinStatuses, hordeDirections));
  const [expiryHours, setExpiryHours] = useState("0");
  const [pendingCoords, setPendingCoords] = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  // ── Route ─────────────────────────────────────────────────────────────────
  const [routePoints, setRoutePoints] = useState([]);

  // ── Player trails (last 10 positions per player) ──────────────────────────
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
      if (!last || last.x !== loc.x || last.y !== loc.y) {
        trail.push({ x: loc.x, y: loc.y });
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
    if (!last || last.x !== loc.x || last.y !== loc.y) {
      existing.push({ x: loc.x, y: loc.y });
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

  // ── Load & subscribe ──────────────────────────────────────────────────────
  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) {
        base44.entities.ClanMember.filter({ user_email: u.email })
          .then(ms => setMyCallsign(ms?.[0]?.callsign || u.full_name || u.email))
          .catch(() => setMyCallsign(u.full_name || u.email));
      }
    }).catch(() => {});

    base44.entities.MapPin.list("-created_date", 200).then(setPins).catch(() => {});
    base44.entities.PlayerLocation.list("-timestamp", 50).then(locs => {
      setPlayerLocs(locs);
      setPlayerTrails(buildTrails(locs));
    }).catch(() => {});
    base44.entities.MapBroadcast.list("-created_date", 10).then(bs => {
      const active = bs.filter((entry) => new Date(entry.expires_at).getTime() > Date.now());
      setBroadcasts(active);
      active.forEach((entry) => {
        const remaining = Math.max(0, new Date(entry.expires_at).getTime() - Date.now());
        scheduleBroadcastExpiry(entry.id, remaining);
      });
    }).catch(() => {});

    const unsubPins = base44.entities.MapPin.subscribe(ev => {
      if (ev.type === "create") setPins(p => [...p, ev.data]);
      if (ev.type === "update") setPins(p => p.map(x => x.id === ev.id ? ev.data : x));
      if (ev.type === "delete") setPins(p => p.filter(x => x.id !== ev.id));
    });
    const unsubLocs = base44.entities.PlayerLocation.subscribe(ev => {
      if (ev.type === "create" || ev.type === "update") {
        setPlayerTrails((prev) => appendTrailPoint(prev, ev.data));
        setPlayerLocs(p => {
          if (ev.type === "create") return [...p, ev.data];
          return p.map(x => x.id === ev.id ? ev.data : x);
        });
      }
      if (ev.type === "delete") {
        setPlayerLocs((prev) => {
          const updated = prev.filter((entry) => entry.id !== ev.id);
          setPlayerTrails(buildTrails(updated));
          return updated;
        });
      }
    });
    const unsubBC = base44.entities.MapBroadcast.subscribe(ev => {
      if (ev.type === "create") {
        const b = ev.data;
        if (new Date(b.expires_at).getTime() > Date.now()) {
          setBroadcasts(prev => [...prev, b]);
          scheduleBroadcastExpiry(b.id);
        }
      }
    });
    return () => {
      unsubPins();
      unsubLocs();
      unsubBC();
      broadcastTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      broadcastTimeoutsRef.current.clear();
    };
  }, [appendTrailPoint, buildTrails, scheduleBroadcastExpiry]);

  // ── Heatmap data from death marks + horde sightings ───────────────────────
  const heatmapPoints = useMemo(() => {
    const points = [];
    if (hordeSightingType) {
      points.push(...pins.filter((pin) => pin.type === hordeSightingType).map((pin) => ({ x: pin.x, y: pin.y, color: T.red })));
    }
    if (dangerZoneType) {
      points.push(...pins.filter((pin) => pin.type === dangerZoneType).map((pin) => ({ x: pin.x, y: pin.y, color: T.amber })));
    }
    return points;
  }, [dangerZoneType, hordeSightingType, pins]);

  const filteredPins = useMemo(
    () => (filterType === "ALL" ? pins : pins.filter((pin) => pin.type === filterType)),
    [pins, filterType],
  );

  const activePlayerLocs = useMemo(
    () => playerLocs.filter((loc) => nowMs - new Date(loc.timestamp).getTime() < 5 * 60 * 1000),
    [playerLocs, nowMs],
  );

  // ── Share position ─────────────────────────────────────────────────────────
  const pushMyLocation = async (x, y) => {
    if (!myCallsign) return;
    try {
      await base44.functions.invoke("updatePlayerLocation", { x, y, callsign: myCallsign, in_vehicle: false });
    } catch (_) {}
  };

  // ── Map click ─────────────────────────────────────────────────────────────
  const handleMapClick = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(2));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(2));

    if (sharing) { pushMyLocation(x, y); return; }
    if (routeMode) { setRoutePoints(p => [...p, { x, y }]); return; }
    if (placing && isAdmin) {
      setPendingCoords({ x, y });
      setShowForm(true);
      setPlacing(false);
    }
  };

  // ── Save pin ──────────────────────────────────────────────────────────────
  const handleSavePin = async () => {
    if (!newPin.title.trim() || !pendingCoords) return;
    const pinData = {
      ...newPin,
      ...pendingCoords,
      placed_by: user?.full_name || user?.email || "Unknown",
    };
    if (parseFloat(expiryHours) > 0) {
      pinData.expires_at = new Date(Date.now() + parseFloat(expiryHours) * 3600000).toISOString();
    }
    if (rallyPointType && newPin.type === rallyPointType && newPin.rallyMins > 0) {
      pinData.rally_expires_at = new Date(Date.now() + newPin.rallyMins * 60000).toISOString();
    }
    delete pinData.rallyMins;
    const saved = await base44.entities.MapPin.create(pinData);
    setPins(p => [...p, saved]);
    setNewPin(buildEmptyPin(pinTypes, pinStatuses, hordeDirections));
    setExpiryHours("0");
    setPendingCoords(null);
    setShowForm(false);
  };

  // ── Status cycle ──────────────────────────────────────────────────────────
  const handleStatusCycle = async (pin) => {
    const statuses = pinStatuses;
    if (!Array.isArray(statuses) || statuses.length === 0) return;
    const next = statuses[(statuses.indexOf(pin.status) + 1) % statuses.length];
    const updated = await base44.entities.MapPin.update(pin.id, { status: next });
    setPins(p => p.map(x => x.id === pin.id ? updated : x));
    setSelectedPin(updated);
  };

  // ── Delete pin ────────────────────────────────────────────────────────────
  const handleDeletePin = async (id) => {
    await base44.entities.MapPin.delete(id);
    setPins(p => p.filter(x => x.id !== id));
    setSelectedPin(null);
  };

  // ── Route save ────────────────────────────────────────────────────────────
  const handleSaveRoute = async () => {
    if (routePoints.length < 2) return;
    const routeId = `route-${Date.now()}`;
    await Promise.all(routePoints.map((point, index) => {
      const entry = {
        title: `WPT ${index + 1}`,
        type: routeWaypointType,
        x: point.x, y: point.y,
        route_id: routeId,
        route_order: index,
        placed_by: myCallsign,
      };
      if (activePinStatus) entry.status = activePinStatus;
      return base44.entities.MapPin.create(entry);
    }));
    setRoutePoints([]);
    setRouteMode(false);
  };

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const handleBroadcast = async (message, x, y) => {
    const expires_at = new Date(Date.now() + 30000).toISOString();
    const b = await base44.entities.MapBroadcast.create({ message, x, y, sent_by: myCallsign, expires_at });
    setBroadcasts(prev => [...prev, b]);
    scheduleBroadcastExpiry(b.id);
    setShowBroadcastModal(false);
  };

  // ── Fog sector toggle (admin clears sectors) ──────────────────────────────
  const handleFogClear = (key) => {
    if (!isAdmin) return;
    setFogSectors(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="p-4 space-y-3 max-w-7xl mx-auto">
      <PageHeader icon={MapIcon} title="TACTICAL MAP" color={T.cyan}>
        <MapToolbar
          filterType={filterType} onFilterChange={setFilterType}
          sharing={sharing} onToggleSharing={() => setSharing(s => !s)}
          placing={placing} onTogglePlacing={() => { setPlacing(p => !p); setShowForm(false); }}
          routeMode={routeMode} onToggleRoute={() => { setRouteMode(r => !r); if (routeMode) setRoutePoints([]); }}
          showFog={showFog} onToggleFog={() => setShowFog(f => !f)}
          showHeatmap={showHeatmap} onToggleHeatmap={() => setShowHeatmap(h => !h)}
          isAdmin={isAdmin}
          onBroadcast={() => setShowBroadcastModal(true)}
          pinTypes={pinTypes}
        />
      </PageHeader>
      {runtimeConfig.error && (
        <div className="text-xs px-3 py-2 border" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME MAP TAXONOMY UNAVAILABLE
        </div>
      )}

      {/* Status banners */}
      {placing && (
        <div className="relative flex items-center gap-3 px-3 py-2 overflow-hidden border" style={{ borderColor:T.amber+"77", background:T.amber+"0d", borderLeft:`3px solid ${T.amber}` }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:`linear-gradient(90deg, ${T.amber}88, transparent)` }} />
          <div style={{ width:6, height:6, borderRadius:"50%", background:T.amber, boxShadow:`0 0 6px ${T.amber}`, animation:"glowDotPulse 1s ease-in-out infinite", flexShrink:0 }} />
          <span style={{ color:T.amber, fontSize:"10px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.1em" }}>PIN PLACEMENT — CLICK MAP TO DROP</span>
        </div>
      )}
      {sharing && (
        <div className="relative flex items-center gap-3 px-3 py-2 overflow-hidden border" style={{ borderColor:T.green+"77", background:T.green+"0d", borderLeft:`3px solid ${T.green}` }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:`linear-gradient(90deg, ${T.green}88, transparent)` }} />
          <div style={{ width:6, height:6, borderRadius:"50%", background:T.green, boxShadow:`0 0 6px ${T.green}`, animation:"ledPulseGreen 1s ease-in-out infinite", flexShrink:0 }} />
          <span style={{ color:T.green, fontSize:"10px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.1em" }}>LOCATION SHARING ACTIVE — CLICK MAP TO UPDATE POSITION</span>
        </div>
      )}
      {routeMode && (
        <div className="relative flex items-center gap-3 px-3 py-2 overflow-hidden border" style={{ borderColor:T.cyan+"77", background:T.cyan+"0d", borderLeft:`3px solid ${T.cyan}` }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:`linear-gradient(90deg, ${T.cyan}88, transparent)` }} />
          <div style={{ width:6, height:6, borderRadius:"50%", background:T.cyan, boxShadow:`0 0 6px ${T.cyan}`, animation:"glowDotPulse 1.2s ease-in-out infinite", flexShrink:0 }} />
          <span style={{ color:T.cyan, fontSize:"10px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.1em" }}>ROUTE MODE — CLICK TO ADD WAYPOINTS · SAVE IN SIDEBAR</span>
          {routePoints.length > 0 && <span style={{ color:T.cyan, fontSize:"9px", border:`1px solid ${T.cyan}55`, padding:"0 5px", marginLeft:"auto" }}>{routePoints.length} WPT</span>}
        </div>
      )}
      {showFog && isAdmin && (
        <div className="relative flex items-center gap-3 px-3 py-2 overflow-hidden border" style={{ borderColor:T.textDim+"44", background:"rgba(0,0,0,0.25)", borderLeft:`3px solid ${T.textDim}55` }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:T.textDim, flexShrink:0, opacity:0.6 }} />
          <span style={{ color:T.textDim, fontSize:"10px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.1em" }}>FOG ACTIVE — CLICK DARK SECTORS TO CLEAR</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 space-y-2">
          <MapCanvas
            canvasRef={canvasRef}
            pins={filteredPins}
            playerLocs={activePlayerLocs}
            playerTrails={playerTrails}
            myCallsign={myCallsign}
            pendingCoords={pendingCoords}
            routePoints={routePoints}
            broadcasts={broadcasts}
            showFog={showFog}
            fogSectors={fogSectors}
            fogClearable={isAdmin ? handleFogClear : null}
            showHeatmap={showHeatmap}
            heatmapPoints={heatmapPoints}
            nowMs={nowMs}
            placingMode={placing || routeMode}
            onClick={handleMapClick}
            onPinClick={pin => { setSelectedPin(pin === selectedPin ? null : pin); setShowForm(false); }}
            hordeSightingType={hordeSightingType}
            rallyPointType={rallyPointType}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-1.5 px-1">
            {Object.entries(PIN_ICONS).map(([type, icon]) => {
              const color = PIN_COLORS[type] || T.textFaint;
              return (
                <div key={type} className="flex items-center gap-1.5 px-2 py-1 border" style={{ borderColor: color + "33", background: color + "0d" }}>
                  <span style={{ color, fontSize: "9px", filter: `drop-shadow(0 0 3px ${color})` }}>{icon}</span>
                  <span style={{ color: T.textFaint, fontSize: "8px", fontFamily:"'Share Tech Mono', monospace", letterSpacing:"0.04em" }}>{type}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {showBroadcastModal && (
            <BroadcastModal onSend={handleBroadcast} onClose={() => setShowBroadcastModal(false)} />
          )}

          {showForm && (
            <PinForm
              pin={newPin}
              onChange={delta => setNewPin(p => ({ ...p, ...delta }))}
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
              isAdmin={isAdmin}
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
            myCallsign={myCallsign}
            routePoints={routePoints}
            nowMs={nowMs}
            onPinClick={pin => { setSelectedPin(pin); setShowForm(false); }}
            onClearRoute={() => { setRoutePoints([]); setRouteMode(false); }}
            onSaveRoute={handleSaveRoute}
          />
        </div>
      </div>
    </div>
  );
}