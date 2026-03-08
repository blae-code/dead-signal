import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Map } from "lucide-react";
import { T, PageHeader } from "@/components/ui/TerminalCard";

import MapCanvas, { PIN_COLORS, PIN_ICONS } from "@/components/map/MapCanvas";
import MapToolbar from "@/components/map/MapToolbar";
import PinForm from "@/components/map/PinForm";
import PinDetail from "@/components/map/PinDetail";
import MapSidebar from "@/components/map/MapSidebar";
import BroadcastModal from "@/components/map/BroadcastModal";

const EMPTY_PIN = { title: "", type: "Loot Cache", note: "", status: "Unknown", horde_size: 0, horde_direction: "N", rallyMins: 10 };

export default function TacticalMap() {
  const canvasRef = useRef(null);

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

  // ── Pin form ──────────────────────────────────────────────────────────────
  const [newPin, setNewPin]         = useState(EMPTY_PIN);
  const [expiryHours, setExpiryHours] = useState("0");
  const [pendingCoords, setPendingCoords] = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  // ── Route ─────────────────────────────────────────────────────────────────
  const [routePoints, setRoutePoints] = useState([]);

  // ── Player trails (last 10 positions per player) ──────────────────────────
  const [playerTrails, setPlayerTrails] = useState({});

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
      buildTrails(locs);
    }).catch(() => {});
    base44.entities.MapBroadcast.list("-created_date", 10).then(bs => {
      setBroadcasts(bs.filter(b => new Date(b.expires_at).getTime() > Date.now()));
    }).catch(() => {});

    const unsubPins = base44.entities.MapPin.subscribe(ev => {
      if (ev.type === "create") setPins(p => [...p, ev.data]);
      if (ev.type === "update") setPins(p => p.map(x => x.id === ev.id ? ev.data : x));
      if (ev.type === "delete") setPins(p => p.filter(x => x.id !== ev.id));
    });
    const unsubLocs = base44.entities.PlayerLocation.subscribe(ev => {
      if (ev.type === "create" || ev.type === "update") {
        setPlayerLocs(p => {
          const updated = ev.type === "create" ? [...p, ev.data] : p.map(x => x.id === ev.id ? ev.data : x);
          buildTrails(updated);
          return updated;
        });
      }
      if (ev.type === "delete") setPlayerLocs(p => p.filter(x => x.id !== ev.id));
    });
    const unsubBC = base44.entities.MapBroadcast.subscribe(ev => {
      if (ev.type === "create") {
        const b = ev.data;
        if (new Date(b.expires_at).getTime() > Date.now()) {
          setBroadcasts(prev => [...prev, b]);
          setTimeout(() => setBroadcasts(prev => prev.filter(x => x.id !== b.id)), 30000);
        }
      }
    });
    return () => { unsubPins(); unsubLocs(); unsubBC(); };
  }, []);

  // ── Build player trails ────────────────────────────────────────────────────
  const buildTrails = (locs) => {
    const trails = {};
    [...locs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(loc => {
      if (!trails[loc.player_callsign]) trails[loc.player_callsign] = [];
      const trail = trails[loc.player_callsign];
      const last = trail[trail.length - 1];
      if (!last || last.x !== loc.x || last.y !== loc.y) {
        trail.push({ x: loc.x, y: loc.y });
        if (trail.length > 10) trail.shift();
      }
    });
    setPlayerTrails(trails);
  };

  // ── Heatmap data from death marks + horde sightings ───────────────────────
  const heatmapPoints = [
    ...pins.filter(p => p.type === "Horde Sighting").map(p => ({ x: p.x, y: p.y, color: T.red })),
    ...pins.filter(p => p.type === "Danger Zone").map(p => ({ x: p.x, y: p.y, color: T.amber })),
  ];

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
    if (newPin.type === "Rally Point" && newPin.rallyMins > 0) {
      pinData.rally_expires_at = new Date(Date.now() + newPin.rallyMins * 60000).toISOString();
    }
    delete pinData.rallyMins;
    const saved = await base44.entities.MapPin.create(pinData);
    setPins(p => [...p, saved]);
    setNewPin(EMPTY_PIN);
    setExpiryHours("0");
    setPendingCoords(null);
    setShowForm(false);
  };

  // ── Status cycle ──────────────────────────────────────────────────────────
  const handleStatusCycle = async (pin) => {
    const statuses = ["Unknown","Fresh","Looted","Active","Cleared"];
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
    for (let i = 0; i < routePoints.length; i++) {
      await base44.entities.MapPin.create({
        title: `WPT ${i + 1}`,
        type: "Route Waypoint",
        x: routePoints[i].x, y: routePoints[i].y,
        status: "Active",
        route_id: routeId,
        route_order: i,
        placed_by: myCallsign,
      });
    }
    setRoutePoints([]);
    setRouteMode(false);
  };

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const handleBroadcast = async (message, x, y) => {
    const expires_at = new Date(Date.now() + 30000).toISOString();
    const b = await base44.entities.MapBroadcast.create({ message, x, y, sent_by: myCallsign, expires_at });
    setBroadcasts(prev => [...prev, b]);
    setTimeout(() => setBroadcasts(prev => prev.filter(bc => bc.id !== b.id)), 30000);
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

  const filteredPins = filterType === "ALL" ? pins : pins.filter(p => p.type === filterType);

  return (
    <div className="p-4 space-y-3 max-w-7xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Map} title="TACTICAL MAP" color={T.cyan}>
        <MapToolbar
          filterType={filterType} onFilterChange={setFilterType}
          sharing={sharing} onToggleSharing={() => setSharing(s => !s)}
          placing={placing} onTogglePlacing={() => { setPlacing(p => !p); setShowForm(false); }}
          routeMode={routeMode} onToggleRoute={() => { setRouteMode(r => !r); if (routeMode) setRoutePoints([]); }}
          showFog={showFog} onToggleFog={() => setShowFog(f => !f)}
          showHeatmap={showHeatmap} onToggleHeatmap={() => setShowHeatmap(h => !h)}
          isAdmin={isAdmin}
          onBroadcast={() => setShowBroadcastModal(true)}
        />
      </PageHeader>

      {/* Status banners */}
      {placing && <div className="text-xs px-3 py-2 border" style={{ borderColor: T.amber + "88", color: T.amber, background: T.amber + "0d" }}>⚠ CLICK MAP TO PLACE PIN</div>}
      {sharing && <div className="text-xs px-3 py-2 border" style={{ borderColor: T.green + "88", color: T.green, background: T.green + "0d" }}>● LOCATION SHARING ACTIVE — CLICK MAP TO UPDATE YOUR POSITION</div>}
      {routeMode && <div className="text-xs px-3 py-2 border" style={{ borderColor: T.cyan + "88", color: T.cyan, background: T.cyan + "0d" }}>◈ ROUTE MODE — CLICK MAP TO ADD WAYPOINTS, THEN SAVE ROUTE IN SIDEBAR</div>}
      {showFog && isAdmin && <div className="text-xs px-3 py-2 border" style={{ borderColor: T.textDim + "44", color: T.textDim, background: "rgba(0,0,0,0.3)" }}>FOG ACTIVE — CLICK DARK SECTORS TO CLEAR THEM</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 space-y-2">
          <MapCanvas
            canvasRef={canvasRef}
            pins={filteredPins}
            playerLocs={playerLocs}
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
            placingMode={placing || routeMode}
            onClick={handleMapClick}
            onPinClick={pin => { setSelectedPin(pin === selectedPin ? null : pin); setShowForm(false); }}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(PIN_ICONS).map(([type, icon]) => (
              <div key={type} className="flex items-center gap-1">
                <span style={{ color: PIN_COLORS[type], fontSize: "9px" }}>{icon}</span>
                <span style={{ color: T.textFaint, fontSize: "9px" }}>{type}</span>
              </div>
            ))}
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
            />
          )}

          {selectedPin && !showForm && (
            <PinDetail
              pin={selectedPin}
              isAdmin={isAdmin}
              onClose={() => setSelectedPin(null)}
              onStatusCycle={() => handleStatusCycle(selectedPin)}
              onDelete={() => handleDeletePin(selectedPin.id)}
            />
          )}

          <MapSidebar
            pins={filteredPins}
            playerLocs={playerLocs}
            myCallsign={myCallsign}
            routePoints={routePoints}
            onPinClick={pin => { setSelectedPin(pin); setShowForm(false); }}
            onClearRoute={() => { setRoutePoints([]); setRouteMode(false); }}
            onSaveRoute={handleSaveRoute}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}