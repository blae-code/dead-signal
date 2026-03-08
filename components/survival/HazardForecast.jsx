import React, { useState } from "react";
import { T, Panel, StatusBadge } from "@/components/ui/TerminalCard";
import { motion } from "framer-motion";

const HAZARD_ICONS = {
  radiation: "☢",
  zombie_spawn: "🧟",
  weather: "⛈",
  toxic_gas: "☠",
  bandit_territory: "⚔",
  unknown: "?",
};

export default function HazardForecast({ hazards, hotspots }) {
  const [expandedHazard, setExpandedHazard] = useState(null);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return T.red;
      case "high":
        return T.orange;
      case "medium":
        return T.amber;
      case "low":
        return T.green;
      default:
        return T.textFaint;
    }
  };

  const calculateProximity = (hazard, hotspot) => {
    const dx = hazard.center_x - hotspot.x;
    const dy = hazard.center_y - hotspot.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance;
  };

  return (
    <div className="space-y-3">
      {/* Active hazards */}
      <Panel title="ACTIVE HAZARD ZONES" titleColor={T.red}>
        <div className="space-y-2 p-3 max-h-96 overflow-y-auto">
          {hazards.length === 0 ? (
            <div style={{ color: T.textGhost, fontSize: "8px" }}>
              // SCANNING FOR HAZARDS...
            </div>
          ) : (
            hazards.map(hazard => {
              const isExpiring = hazard.active_until && (new Date(hazard.active_until) - Date.now()) < 3600000;
              const color = getSeverityColor(hazard.severity);

              return (
                <motion.div
                  key={hazard.id}
                  onClick={() => setExpandedHazard(expandedHazard === hazard.id ? null : hazard.id)}
                  className="border cursor-pointer"
                  style={{
                    borderColor: color + "55",
                    background: `${color}0a`,
                    padding: "10px",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "14px" }}>
                        {HAZARD_ICONS[hazard.hazard_type] || HAZARD_ICONS.unknown}
                      </span>
                      <div>
                        <div style={{ color: T.text, fontSize: "9px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
                          {hazard.zone_name}
                        </div>
                        <div style={{ color: T.textFaint, fontSize: "7px" }}>
                          {hazard.hazard_type.replace(/_/g, " ").toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <StatusBadge label={hazard.severity.toUpperCase()} color={color} />
                  </div>

                  {expandedHazard === hazard.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-1 border-t"
                      style={{ borderColor: T.border + "33", paddingTop: "8px" }}
                    >
                      <div style={{ fontSize: "7.5px", color: T.textFaint }}>
                        <div>Center: ({hazard.center_x.toFixed(0)}, {hazard.center_y.toFixed(0)}) · Radius: {hazard.radius_meters}m</div>
                        {hazard.threat_description && (
                          <div>Details: {hazard.threat_description}</div>
                        )}
                        {hazard.active_until && (
                          <div>
                            Active until: {new Date(hazard.active_until).toLocaleString()}
                            {isExpiring && <span style={{ color: T.amber }}> (EXPIRING SOON)</span>}
                          </div>
                        )}
                        {hazard.reported_by && (
                          <div>Reported by: {hazard.reported_by}</div>
                        )}
                      </div>

                      {hazard.safe_corridors && hazard.safe_corridors.length > 0 && (
                        <div style={{ background: T.border + "22", padding: "6px", borderRadius: "2px" }}>
                          <div style={{ color: T.green, fontSize: "7px", fontFamily: "'Orbitron', monospace", marginBottom: "4px" }}>
                            SAFE CORRIDORS:
                          </div>
                          {hazard.safe_corridors.map((corridor, i) => (
                            <div key={i} style={{ fontSize: "7px", color: T.textFaint, marginBottom: "2px" }}>
                              {corridor.from_x.toFixed(0)},{corridor.from_y.toFixed(0)} → {corridor.to_x.toFixed(0)},{corridor.to_y.toFixed(0)} ({corridor.difficulty})
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Proximity to hotspots */}
                      <div style={{ fontSize: "7px", color: T.textFaint }}>
                        <div style={{ marginBottom: "4px" }}>NEARBY HOTSPOTS:</div>
                        {hotspots
                          .map(h => ({ ...h, distance: calculateProximity(hazard, h) }))
                          .filter(h => h.distance < hazard.radius_meters + 500)
                          .sort((a, b) => a.distance - b.distance)
                          .slice(0, 3)
                          .map((h, i) => (
                            <div key={i} style={{ color: h.distance < hazard.radius_meters ? T.red : T.amber }}>
                              {h.location_name}: {h.distance.toFixed(0)}m {h.distance < hazard.radius_meters && "⚠ IN ZONE"}
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </Panel>

      {/* Hazard-free zones */}
      <Panel title="SAFE ZONES" titleColor={T.green}>
        <div style={{ padding: "12px", fontSize: "8px", color: T.textFaint }}>
          <div style={{ marginBottom: "8px" }}>
            Hotspots clear of active hazards (within 500m):
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {hotspots
              .filter(h => {
                const nearbyHazards = hazards.filter(hz => {
                  const dx = hz.center_x - h.x;
                  const dy = hz.center_y - h.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  return distance < hz.radius_meters + 500;
                });
                return nearbyHazards.length === 0;
              })
              .slice(0, 6)
              .map(h => (
                <div
                  key={h.id}
                  style={{
                    border: `1px solid ${T.green}55`,
                    background: `${T.green}0a`,
                    padding: "6px",
                  }}
                >
                  <div style={{ color: T.green, fontSize: "8px", fontWeight: "bold" }}>
                    {h.location_name}
                  </div>
                  <div style={{ color: T.textFaint, fontSize: "7px" }}>
                    ({h.x.toFixed(0)}, {h.y.toFixed(0)})
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}