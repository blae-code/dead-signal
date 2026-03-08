import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { T, Panel, PageHeader, StatusBadge, ActionBtn } from "@/components/ui/TerminalCard";
import { Zap, Heart, Wrench, BookOpen } from "lucide-react";

function GearDurabilityCard({ item }) {
  const damagePercentage = ((item.durability_before - item.durability_after) / item.durability_before) * 100;
  const damageColor =
    item.durability_after < 20 ? T.red :
    item.durability_after < 50 ? T.amber :
    T.green;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="border p-2"
      style={{
        borderColor: item.needs_repair ? T.red + "77" : T.border,
        background: item.needs_repair ? `${T.red}0a` : T.bg1,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div style={{ color: T.text, fontSize: "9px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
            {item.item_name}
          </div>
          <div style={{ color: T.textFaint, fontSize: "7px" }}>
            {item.item_type}
          </div>
        </div>
        {item.needs_repair && (
          <StatusBadge label="REPAIR NEEDED" color={T.red} />
        )}
      </div>

      <div className="space-y-1.5">
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "7px", color: T.textFaint, marginBottom: "2px" }}>
            <span>DURABILITY</span>
            <span>{item.durability_after.toFixed(0)}%</span>
          </div>
          <div
            style={{
              height: "3px",
              background: "rgba(0,0,0,0.5)",
              border: `1px solid ${T.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${item.durability_after}%`,
                background: damageColor,
                boxShadow: `0 0 4px ${damageColor}`,
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: "7px", color: T.amber }}>
          Damage taken: {item.damage_taken.toFixed(1)} ({damagePercentage.toFixed(0)}%)
        </div>
      </div>
    </motion.div>
  );
}

function DeathLessonCard({ lesson }) {
  const causeColors = {
    zombie_horde: T.red,
    zombie_type: T.orange,
    player_pvp: T.red,
    environmental: T.amber,
    starvation: T.amber,
    hypothermia: T.cyan,
    unknown: T.textFaint,
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="border p-3"
      style={{
        borderColor: causeColors[lesson.death_cause] + "55",
        background: `${causeColors[lesson.death_cause]}0a`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div style={{ color: T.text, fontSize: "9px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
            {lesson.player_callsign}
          </div>
          <div style={{ color: T.textFaint, fontSize: "7px" }}>
            {new Date(lesson.occurred_at).toLocaleString()}
          </div>
        </div>
        <StatusBadge label={lesson.death_cause.replace(/_/g, " ").toUpperCase()} color={causeColors[lesson.death_cause]} />
      </div>

      <div className="space-y-1 text-xs">
        <div>
          <span style={{ color: T.textFaint, fontSize: "7px" }}>Location:</span> {lesson.death_location_name} ({lesson.death_x.toFixed(0)}, {lesson.death_y.toFixed(0)})
        </div>
        {lesson.environmental_factors && lesson.environmental_factors.length > 0 && (
          <div>
            <span style={{ color: T.textFaint, fontSize: "7px" }}>Environment:</span> {lesson.environmental_factors.join(", ")}
          </div>
        )}
        {lesson.lesson_learned && (
          <div style={{ background: T.border + "22", padding: "4px", marginTop: "4px", fontSize: "7px", color: T.green }}>
            💡 {lesson.lesson_learned}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function PostMissionAnalysis() {
  const [selectedMission, setSelectedMission] = useState(null);
  const [activeTab, setActiveTab] = useState("gear");

  const { data: missions } = useQuery({
    queryKey: ["missions"],
    queryFn: () => base44.entities.Mission.list(),
    initialData: [],
  });

  const { data: gearDurability } = useQuery({
    queryKey: ["gearDurability"],
    queryFn: () => base44.entities.GearDurability.list(),
    initialData: [],
  });

  const { data: deathLessons } = useQuery({
    queryKey: ["deathLessons"],
    queryFn: () => base44.entities.DeathLesson.list(),
    initialData: [],
  });

  const filteredGear = selectedMission
    ? gearDurability.filter(g => g.mission_id === selectedMission)
    : gearDurability;

  const filteredLessons = selectedMission
    ? deathLessons.filter(l => l.mission_id === selectedMission)
    : deathLessons;

  const needsRepair = filteredGear.filter(g => g.needs_repair).length;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Zap} title="POST-MISSION ANALYSIS" color={T.amber}>
        <span style={{ color: T.textFaint, fontSize: "8px" }}>
          {gearDurability.length} GEAR LOGS · {deathLessons.length} DEATH LESSONS · {needsRepair} REPAIRS NEEDED
        </span>
      </PageHeader>

      {/* Mission selector */}
      <Panel title="FILTER BY MISSION" titleColor={T.steel}>
        <div className="flex gap-2 p-3 flex-wrap">
          <motion.button
            onClick={() => setSelectedMission(null)}
            whileHover={{ scale: 1.05 }}
            className="px-2 py-1 border text-xs"
            style={{
              borderColor: !selectedMission ? T.cyan : T.border,
              color: !selectedMission ? T.cyan : T.textFaint,
              background: !selectedMission ? `${T.cyan}15` : "transparent",
              fontFamily: "'Orbitron', monospace",
            }}
          >
            ALL MISSIONS
          </motion.button>
          {missions.slice(0, 5).map(m => (
            <motion.button
              key={m.id}
              onClick={() => setSelectedMission(m.id)}
              whileHover={{ scale: 1.05 }}
              className="px-2 py-1 border text-xs"
              style={{
                borderColor: selectedMission === m.id ? T.green : T.border,
                color: selectedMission === m.id ? T.green : T.textFaint,
                background: selectedMission === m.id ? `${T.green}15` : "transparent",
                fontFamily: "'Orbitron', monospace",
              }}
            >
              {m.title}
            </motion.button>
          ))}
        </div>
      </Panel>

      {/* Tab navigation */}
      <div className="flex gap-2">
        {[
          { id: "gear", label: "GEAR DURABILITY", icon: Wrench, color: T.orange },
          { id: "lessons", label: "DEATH LESSONS", icon: BookOpen, color: T.red },
        ].map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 border transition-all"
            style={{
              borderColor: activeTab === tab.id ? tab.color : T.border,
              color: activeTab === tab.id ? tab.color : T.textFaint,
              background: activeTab === tab.id ? `${tab.color}15` : "transparent",
              fontSize: "9px",
              fontFamily: "'Orbitron', monospace",
              letterSpacing: "0.1em",
            }}
          >
            <tab.icon size={10} />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Gear durability */}
      {activeTab === "gear" && (
        <Panel title="EQUIPMENT CONDITION LOG" titleColor={T.orange}>
          {filteredGear.length === 0 ? (
            <div style={{ padding: "24px", color: T.textGhost, fontSize: "8px", textAlign: "center" }}>
              // NO GEAR LOGGED
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
              {filteredGear.map(item => (
                <GearDurabilityCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {needsRepair > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                margin: "12px",
                padding: "8px",
                background: `${T.red}15`,
                border: `1px solid ${T.red}55`,
                color: T.red,
                fontSize: "8px",
                fontFamily: "'Orbitron', monospace",
              }}
            >
              ⚠ {needsRepair} ITEM(S) REQUIRE REPAIR — Prioritize maintenance before next operation
            </motion.div>
          )}
        </Panel>
      )}

      {/* Death lessons */}
      {activeTab === "lessons" && (
        <Panel title="DEATH INTELLIGENCE DATABASE" titleColor={T.red}>
          {filteredLessons.length === 0 ? (
            <div style={{ padding: "24px", color: T.textGhost, fontSize: "8px", textAlign: "center" }}>
              // NO DEATH DATA — STAY SHARP OUT THERE
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 max-h-96 overflow-y-auto">
              {filteredLessons.map(lesson => (
                <DeathLessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}