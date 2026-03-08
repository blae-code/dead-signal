import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ActionBtn, Field, FormPanel, Panel, T, inputStyle, selectStyle } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";

export default function MissionDetailPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runtimeConfig = useRuntimeConfig();
  const statuses = runtimeConfig.getArray(["taxonomy", "mission_statuses"]);
  const priorities = runtimeConfig.getArray(["taxonomy", "mission_priorities"]);

  const { data: mission = null, isLoading } = useQuery({
    queryKey: ["ops", "mission-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const entries = await base44.entities.Mission.filter({ id });
      return entries[0] || null;
    },
  });

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  const initialForm = useMemo(() => {
    if (!mission) return null;
    return {
      title: mission.title || "",
      briefing: mission.briefing || "",
      status: mission.status || pickFirst(statuses),
      priority: mission.priority || pickFirst(priorities),
      voice_room_name: mission.voice_room_name || `mission-${mission.id}`,
      objective_coords: mission.objective_coords || "",
      reward: mission.reward || "",
      deadline: mission.deadline || "",
      debrief_notes: mission.debrief_notes || "",
    };
  }, [mission, priorities, statuses]);

  const activeForm = form || initialForm;

  const updateForm = (nextValue) => {
    setForm((prev) => ({ ...(prev || initialForm || {}), ...nextValue }));
  };

  const handleSave = async () => {
    if (!id || !activeForm) return;
    setSaving(true);
    try {
      try {
        await base44.entities.Mission.update(id, activeForm);
      } catch {
        const fallbackPayload = { ...activeForm };
        delete fallbackPayload.voice_room_name;
        await base44.entities.Mission.update(id, fallbackPayload);
      }
      await queryClient.invalidateQueries({ queryKey: ["ops", "mission-detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["ops", "missions", "overview"] });
      await queryClient.invalidateQueries({ queryKey: ["map", "missions"] });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4" style={{ color: T.textDim, fontSize: "11px" }}>
        LOADING MISSION DOSSIER...
      </div>
    );
  }

  if (!mission || !activeForm) {
    return (
      <div className="p-4 space-y-3">
        <div style={{ color: T.red, fontSize: "11px" }}>MISSION NOT FOUND.</div>
        <Link to="/ops/missions" style={{ color: T.amber, fontSize: "10px", textDecoration: "none" }}>
          RETURN TO MISSION BOARD →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <Panel
        title={`MISSION DOSSIER // ${mission.title || "UNTITLED"}`}
        titleColor={T.amber}
        headerRight={(
          <div className="flex items-center gap-1">
            <ActionBtn small color={T.cyan} onClick={() => navigate("/ops/missions")}>
              BOARD
            </ActionBtn>
            <ActionBtn small color={T.green} onClick={handleSave} disabled={saving}>
              {saving ? "SAVING..." : "SAVE"}
            </ActionBtn>
          </div>
        )}
      >
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="TITLE">
              <input
                className="w-full border px-2 py-1.5 text-xs"
                style={inputStyle}
                value={activeForm.title}
                onChange={(event) => updateForm({ title: event.target.value })}
              />
            </Field>
            <Field label="OBJECTIVE COORDS">
              <input
                className="w-full border px-2 py-1.5 text-xs"
                style={inputStyle}
                value={activeForm.objective_coords}
                onChange={(event) => updateForm({ objective_coords: event.target.value })}
              />
            </Field>
            <Field label="VOICE ROOM">
              <input
                className="w-full border px-2 py-1.5 text-xs"
                style={inputStyle}
                value={activeForm.voice_room_name}
                onChange={(event) => updateForm({ voice_room_name: event.target.value })}
              />
            </Field>
            <Field label="STATUS">
              <select
                className="w-full border px-2 py-1.5 text-xs"
                style={selectStyle}
                value={activeForm.status}
                onChange={(event) => updateForm({ status: event.target.value })}
              >
                {statuses.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="PRIORITY">
              <select
                className="w-full border px-2 py-1.5 text-xs"
                style={selectStyle}
                value={activeForm.priority}
                onChange={(event) => updateForm({ priority: event.target.value })}
              >
                {priorities.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="BRIEFING">
            <textarea
              className="w-full border px-2 py-1.5 text-xs min-h-[84px]"
              style={inputStyle}
              value={activeForm.briefing}
              onChange={(event) => updateForm({ briefing: event.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="REWARD">
              <input
                className="w-full border px-2 py-1.5 text-xs"
                style={inputStyle}
                value={activeForm.reward}
                onChange={(event) => updateForm({ reward: event.target.value })}
              />
            </Field>
            <Field label="DEADLINE">
              <input
                type="datetime-local"
                className="w-full border px-2 py-1.5 text-xs"
                style={inputStyle}
                value={activeForm.deadline}
                onChange={(event) => updateForm({ deadline: event.target.value })}
              />
            </Field>
          </div>

          <Field label="DEBRIEF NOTES">
            <textarea
              className="w-full border px-2 py-1.5 text-xs min-h-[74px]"
              style={inputStyle}
              value={activeForm.debrief_notes}
              onChange={(event) => updateForm({ debrief_notes: event.target.value })}
            />
          </Field>
        </div>
      </Panel>

      <FormPanel title="MAP LINKING NOTE" titleColor={T.cyan}>
        <div style={{ color: T.textDim, fontSize: "10px", lineHeight: 1.5 }}>
          Use objective coordinates like <strong>Grid E4</strong> or explicit percent coordinates to place this
          mission on the map layer. Unparseable records appear in the Unplaced list.
        </div>
      </FormPanel>
    </div>
  );
}
