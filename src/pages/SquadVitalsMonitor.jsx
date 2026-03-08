import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { T, Panel, PageHeader, StatusBadge, GlowDot } from "@/components/ui/TerminalCard";
import { Heart, Droplet, Zap, Thermometer, AlertTriangle, Users } from "lucide-react";

function VitalBar({ label, value, icon: Icon, color, warning = 30, critical = 15 }) {
  const getColor = () => {
    if (value <= critical) return T.red;
    if (value <= warning) return T.amber;
    return color;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={10} style={{ color: getColor() }} />
          <span style={{ color: T.textFaint, fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>
            {label}
          </span>
        </div>
        <span style={{ color: getColor(), fontSize: "10px", fontWeight: "bold" }}>
          {value.toFixed(0)}%
        </span>
      </div>
      <div
        className="h-1.5 border overflow-hidden"
        style={{ borderColor: T.border, background: "rgba(0,0,0,0.5)" }}
      >
        <motion.div
          layoutId={`vital-${label}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.3 }}
          style={{
            height: "100%",
            background: getColor(),
            boxShadow: `0 0 6px ${getColor()}`,
          }}
        />
      </div>
    </div>
  );
}

function MemberCard({ member, isAlerted }) {
  const statusColors = {
    healthy: T.green,
    caution: T.amber,
    critical: T.red,
    incapacitated: T.red,
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative border overflow-hidden"
      style={{
        borderColor: isAlerted ? T.red + "77" : T.border,
        background: isAlerted ? "linear-gradient(135deg, #ff202008 0%, #0a080600 100%)" : T.bg1,
        padding: "12px",
      }}
    >
      {isAlerted && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: T.red,
          }}
        />
      )}

      <div className="flex items-center justify-between mb-2">
        <div>
          <div style={{ color: T.text, fontSize: "10px", fontWeight: "bold", fontFamily: "'Orbitron', monospace" }}>
            {member.player_callsign}
          </div>
          <div style={{ color: T.textFaint, fontSize: "7px" }}>
            {member.player_email}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAlerted && <AlertTriangle size={12} style={{ color: T.red }} />}
          <StatusBadge label={member.status.toUpperCase()} color={statusColors[member.status]} />
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <VitalBar label="Health" value={member.health} icon={Heart} color={T.green} />
        <VitalBar label="Hunger" value={100 - member.hunger} icon={Droplet} color={T.amber} warning={30} />
        <VitalBar label="Thirst" value={100 - member.thirst} icon={Zap} color={T.cyan} warning={30} />
        <VitalBar label="Cold" value={100 - member.cold} icon={Thermometer} color={T.steel} warning={40} />
      </div>
    </motion.div>
  );
}

export default function SquadVitalsMonitor() {
  const { data: vitalsLog } = useQuery({
    queryKey: ["squadVitals"],
    queryFn: () => base44.entities.SquadVitals.filter({ active: true }),
    initialData: [],
    refetchInterval: 3000,
  });

  const criticalMembers = vitalsLog.flatMap(v =>
    v.members
      .filter(m => m.status === "critical" || m.status === "incapacitated")
      .map(m => ({ ...m, squad: v.squad_name }))
  );

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Heart} title="SQUAD VITALS" color={T.green}>
        <span style={{ color: T.textFaint, fontSize: "8px" }}>
          {vitalsLog.reduce((sum, v) => sum + v.members.length, 0)} ACTIVE · {criticalMembers.length} CRITICAL
        </span>
      </PageHeader>

      {/* Critical alerts banner */}
      {criticalMembers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border p-3 space-y-1"
          style={{
            borderColor: T.red + "77",
            background: `${T.red}12`,
            boxShadow: `0 0 12px ${T.red}44`,
          }}
        >
          <div style={{ color: T.red, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em" }}>
            ⚠ CRITICAL STATUS ALERT
          </div>
          {criticalMembers.map(m => (
            <div key={`${m.squad}-${m.player_email}`} style={{ color: T.textFaint, fontSize: "8px" }}>
              {m.player_callsign} ({m.squad}) — {m.status.toUpperCase()}
            </div>
          ))}
        </motion.div>
      )}

      {/* Squads and members */}
      {vitalsLog.length === 0 ? (
        <Panel title="STATUS" titleColor={T.green}>
          <div style={{ color: T.textFaint, padding: "24px", textAlign: "center", fontSize: "9px" }}>
            NO ACTIVE SQUADS — AWAITING FIELD UPDATES
          </div>
        </Panel>
      ) : (
        <div className="space-y-4">
          {vitalsLog.map(vitals => (
            <Panel key={vitals.id} title={`${vitals.squad_name.toUpperCase()} · LOC: (${vitals.location_x.toFixed(0)}, ${vitals.location_y.toFixed(0)})`} titleColor={T.cyan}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                {vitals.members.map(member => {
                  const isCritical = member.status === "critical" || member.status === "incapacitated";
                  return (
                    <MemberCard
                      key={member.player_email}
                      member={member}
                      isAlerted={isCritical}
                    />
                  );
                })}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}