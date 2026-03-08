import React, { useState } from "react";
import { T, Panel, ActionBtn, StatusBadge } from "@/components/ui/TerminalCard";
import { motion } from "framer-motion";
import { Clock, MapPin, TrendingUp, AlertCircle } from "lucide-react";

export default function LootRoutePlanner({ hotspots, hazards, missions }) {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeHotspots, setRouteHotspots] = useState([]);

  const addToRoute = (hotspot) => {
    setRouteHotspots([...routeHotspots, hotspot]);
  };

  const removeFromRoute = (id) => {
    setRouteHotspots(routeHotspots.filter(h => h.id !== id));
  };

  const calculateRouteStats = () => {
    const freshHotspots = routeHotspots.filter(h => {
      if (!h.last_looted_at) return true;
      const hoursSince = (Date.now() - new Date(h.last_looted_at)) / (1000 * 60 * 60);
      return hoursSince >= (h.estimated_respawn_hours || 24);
    });

    const totalRisk = routeHotspots.reduce((sum, h) => sum + (h.difficulty_rating || 5), 0) / routeHotspots.length || 0;
    const estimatedTime = routeHotspots.length * 15; // minutes

    return { freshHotspots, totalRisk, estimatedTime };
  };

  const stats = calculateRouteStats();

  return (
    <div className="space-y-3">
      {/* Available hotspots */}
      <Panel title="LOOT HOTSPOTS" titleColor={T.teal}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 max-h-96 overflow-y-auto">
          {hotspots.length === 0 ? (
            <div style={{ color: T.textGhost, fontSize: "8px", gridColumn: "1/-1" }}>
              // NO HOTSPOTS DISCOVERED
            </div>
          ) : (
            hotspots.map(hotspot => {
              const hoursSince = hotspot.last_looted_at
                ? (Date.now() - new Date(hotspot.last_looted_at)) / (1000 * 60 * 60)
                : null;
              const isReadyToLoot = !hoursSince || hoursSince >= (hotspot.estimated_respawn_hours || 24);
              const inRoute = routeHotspots.find(h => h.id === hotspot.id);

              return (
                <motion.div
                  key={hotspot.id}
                  whileHover={{ scale: 1.02 }}
                  className="border p-2 cursor-pointer"
                  style={{
                    borderColor: inRoute ? T.green : isReadyToLoot ? T.border : T.border + "44",
                    background: inRoute ? `${T.green}12` : isReadyToLoot ? T.bg2 : "rgba(0,0,0,0.4)",
                    opacity: inRoute ? 1 : isReadyToLoot ? 1 : 0.6,
                  }}
                  onClick={() => (inRoute ? removeFromRoute(hotspot.id) : addToRoute(hotspot))}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div style={{ color: T.text, fontSize: "9px", fontWeight: "bold", fontFamily: "'Orbitron', monospace" }}>
                        {hotspot.location_name}
                      </div>
                      <div style={{ color: T.textFaint, fontSize: "7px" }}>
                        ({hotspot.x.toFixed(0)}, {hotspot.y.toFixed(0)})
                      </div>
                    </div>
                    <StatusBadge label={hotspot.loot_tier} color={T.gold} />
                  </div>

                  <div className="flex gap-1 mb-1 flex-wrap">
                    <span style={{ background: T.border, padding: "1px 4px", fontSize: "6px", color: T.textFaint }}>
                      DIFF: {hotspot.difficulty_rating}
                    </span>
                    {!isReadyToLoot && (
                      <span style={{ background: T.amber + "22", padding: "1px 4px", fontSize: "6px", color: T.amber }}>
                        ↻ {Math.ceil((hotspot.estimated_respawn_hours || 24) - (hoursSince || 0))}h
                      </span>
                    )}
                  </div>

                  {hotspot.loot_found && hotspot.loot_found.length > 0 && (
                    <div style={{ fontSize: "7px", color: T.textFaint }}>
                      Last: {hotspot.loot_found.map(l => `${l.item_name} ×${l.quantity}`).join(", ")}
                    </div>
                  )}

                  <button
                    style={{
                      marginTop: "4px",
                      width: "100%",
                      padding: "2px",
                      background: inRoute ? T.green + "22" : T.border,
                      color: inRoute ? T.green : T.textFaint,
                      border: "none",
                      fontSize: "7px",
                      cursor: "pointer",
                      fontFamily: "'Orbitron', monospace",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      inRoute ? removeFromRoute(hotspot.id) : addToRoute(hotspot);
                    }}
                  >
                    {inRoute ? "✓ IN ROUTE" : "ADD TO ROUTE"}
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </Panel>

      {/* Route summary */}
      {routeHotspots.length > 0 && (
        <Panel title="PLANNED ROUTE" titleColor={T.green}>
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div style={{ color: T.textFaint, fontSize: "7px" }}>HOTSPOTS</div>
                <div style={{ color: T.green, fontSize: "13px", fontWeight: "bold" }}>
                  {routeHotspots.length}
                </div>
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "7px" }}>AVG RISK</div>
                <div style={{ color: stats.totalRisk > 7 ? T.red : T.amber, fontSize: "13px", fontWeight: "bold" }}>
                  {stats.totalRisk.toFixed(1)}
                </div>
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "7px" }}>EST. TIME</div>
                <div style={{ color: T.cyan, fontSize: "13px", fontWeight: "bold" }}>
                  {stats.estimatedTime}m
                </div>
              </div>
            </div>

            {stats.freshHotspots.length > 0 && (
              <div style={{ padding: "6px", background: `${T.green}15`, border: `1px solid ${T.green}55`, fontSize: "7.5px", color: T.green, fontFamily: "'Orbitron', monospace" }}>
                ✓ {stats.freshHotspots.length}/{routeHotspots.length} READY TO LOOT (respawned)
              </div>
            )}

            <div style={{ fontSize: "8px", color: T.textFaint, maxHeight: "150px", overflowY: "auto" }}>
              {routeHotspots.map((h, i) => (
                <div key={h.id} style={{ padding: "4px", borderBottom: `1px solid ${T.border}33` }}>
                  {i + 1}. {h.location_name} ({h.x.toFixed(0)}, {h.y.toFixed(0)})
                  <button
                    onClick={() => removeFromRoute(h.id)}
                    style={{ marginLeft: "auto", color: T.red, cursor: "pointer", fontSize: "7px" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <ActionBtn color={T.green}>EXECUTE ROUTE</ActionBtn>
          </div>
        </Panel>
      )}
    </div>
  );
}