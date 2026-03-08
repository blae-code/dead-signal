import React, { useState } from "react";
import { T, Panel, ActionBtn, StatusBadge } from "@/components/ui/TerminalCard";
import { motion } from "framer-motion";
import { Users, Package, Target } from "lucide-react";

export default function LoadoutOptimizer({ loadoutProfiles, missions }) {
  const [selectedMission, setSelectedMission] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [squadSize, setSquadSize] = useState(4);

  const missionTypeColors = {
    scavenging: T.teal,
    pvp: T.red,
    base_defense: T.amber,
    exploration: T.cyan,
    mixed: T.steel,
  };

  const getRoleIcon = (role) => {
    const icons = {
      sniper: "🎯",
      medic: "🏥",
      tank: "🛡",
      support: "🎒",
      scout: "👁",
      demo: "💣",
      default: "⚔",
    };
    return icons[role.toLowerCase()] || icons.default;
  };

  return (
    <div className="space-y-3">
      {/* Mission selector */}
      <Panel title="MISSION OBJECTIVE" titleColor={T.amber}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
          {[
            { type: "scavenging", label: "SCAVENGING", color: T.teal },
            { type: "pvp", label: "PvP COMBAT", color: T.red },
            { type: "base_defense", label: "BASE DEFENSE", color: T.amber },
            { type: "exploration", label: "EXPLORATION", color: T.cyan },
            { type: "mixed", label: "MIXED OPS", color: T.steel },
          ].map(m => (
            <motion.button
              key={m.type}
              onClick={() => setSelectedMission(m.type)}
              whileHover={{ scale: 1.05 }}
              className="border p-2"
              style={{
                borderColor: selectedMission === m.type ? m.color : T.border,
                background: selectedMission === m.type ? `${m.color}15` : T.bg1,
                color: selectedMission === m.type ? m.color : T.textFaint,
                fontSize: "8px",
                fontFamily: "'Orbitron', monospace",
              }}
            >
              {m.label}
            </motion.button>
          ))}
        </div>
      </Panel>

      {/* Squad size selector */}
      <Panel title="SQUAD COMPOSITION" titleColor={T.cyan}>
        <div className="flex items-center gap-3 p-3">
          <div>
            <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "4px" }}>SQUAD SIZE:</div>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 6, 8].map(size => (
                <motion.button
                  key={size}
                  onClick={() => setSquadSize(size)}
                  whileHover={{ scale: 1.1 }}
                  style={{
                    width: "32px",
                    height: "32px",
                    border: `1px solid ${squadSize === size ? T.cyan : T.border}`,
                    background: squadSize === size ? `${T.cyan}15` : T.bg1,
                    color: squadSize === size ? T.cyan : T.textFaint,
                    fontSize: "11px",
                    fontWeight: "bold",
                    fontFamily: "'Orbitron', monospace",
                    cursor: "pointer",
                  }}
                >
                  {size}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "4px" }}>MATCHING PROFILES:</div>
            <div style={{ color: T.cyan, fontSize: "11px", fontWeight: "bold", fontFamily: "'Orbitron', monospace" }}>
              {loadoutProfiles.filter(p => p.squad_size === squadSize).length} available
            </div>
          </div>
        </div>
      </Panel>

      {/* Suggested roles */}
      {selectedMission && selectedProfile && (
        <Panel title="SUGGESTED SQUAD COMPOSITION" titleColor={T.green}>
          <div className="space-y-2 p-3">
            {selectedProfile.suggested_roles.map((role, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="border p-2"
                style={{
                  borderColor: T.green + "55",
                  background: `${T.green}0a`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "13px" }}>{getRoleIcon(role.role_name)}</span>
                    <div>
                      <div style={{ color: T.green, fontSize: "9px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
                        {role.role_name.toUpperCase()}
                      </div>
                      <div style={{ color: T.textFaint, fontSize: "7px" }}>
                        {role.responsibilities.join(", ")}
                      </div>
                    </div>
                  </div>
                  <StatusBadge label={`×${role.slot_count}`} color={T.green} />
                </div>

                <div style={{ fontSize: "7px", color: T.textFaint, marginLeft: "20px" }}>
                  Primary: {role.primary_weapon}
                  {role.secondary_items && role.secondary_items.length > 0 && (
                    <div>Secondary: {role.secondary_items.join(", ")}</div>
                  )}
                </div>
              </motion.div>
            ))}

            <div style={{ marginTop: "12px", padding: "8px", background: T.border + "22", fontSize: "8px", color: T.textFaint }}>
              <strong>TOTAL CAPACITY:</strong> {selectedProfile.total_capacity_needed} slots
              <br />
              <strong>SUCCESS RATE:</strong> {selectedProfile.success_rate}%
            </div>
          </div>
        </Panel>
      )}

      {/* Available profiles */}
      <Panel title="LOADOUT PROFILES" titleColor={T.steel}>
        <div className="space-y-1 p-3 max-h-96 overflow-y-auto">
          {loadoutProfiles
            .filter(p => !selectedMission || p.mission_type === selectedMission)
            .filter(p => p.squad_size === squadSize)
            .map(profile => (
              <motion.div
                key={profile.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedProfile(profile.id)}
                className="border p-2 cursor-pointer"
                style={{
                  borderColor: selectedProfile === profile.id ? T.green : T.border,
                  background: selectedProfile === profile.id ? `${T.green}12` : T.bg1,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ color: T.text, fontSize: "9px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
                      {profile.profile_name}
                    </div>
                    <div style={{ color: T.textFaint, fontSize: "7px" }}>
                      {profile.squad_size} members · {profile.suggested_roles.length} roles
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge label={profile.mission_type.replace(/_/g, " ")} color={missionTypeColors[profile.mission_type]} />
                    <div style={{ fontSize: "7px", color: T.green, marginTop: "2px" }}>
                      {profile.success_rate}% success
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </Panel>

      {selectedProfile && (
        <ActionBtn color={T.green}>EXECUTE LOADOUT</ActionBtn>
      )}
    </div>
  );
}