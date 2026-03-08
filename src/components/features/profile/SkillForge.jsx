import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Save, Plus, Trash2 } from "lucide-react";
import { ActionBtn, Field, Panel, StatusBadge, T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import LiveStatusStrip from "@/components/live/LiveStatusStrip";

const SKILL_TRACKS = [
  {
    id: "combat",
    label: "COMBAT",
    color: T.red,
    skills: [
      { id: "rifle_mastery", label: "Rifle Mastery", cap: 10 },
      { id: "close_quarters", label: "Close Quarters", cap: 10 },
      { id: "recoil_control", label: "Recoil Control", cap: 10 },
    ],
  },
  {
    id: "recon",
    label: "RECON",
    color: T.cyan,
    skills: [
      { id: "tracking", label: "Tracking", cap: 10 },
      { id: "map_reading", label: "Map Reading", cap: 10 },
      { id: "stealth_movement", label: "Stealth Movement", cap: 10 },
    ],
  },
  {
    id: "survival",
    label: "SURVIVAL",
    color: T.green,
    skills: [
      { id: "medical_triage", label: "Medical Triage", cap: 10 },
      { id: "foraging", label: "Foraging", cap: 10 },
      { id: "craft_efficiency", label: "Craft Efficiency", cap: 10 },
    ],
  },
  {
    id: "leadership",
    label: "LEADERSHIP",
    color: T.amber,
    skills: [
      { id: "squad_coordination", label: "Squad Coordination", cap: 10 },
      { id: "intel_synthesis", label: "Intel Synthesis", cap: 10 },
      { id: "morale", label: "Morale", cap: 10 },
    ],
  },
];

const ALL_SKILLS = SKILL_TRACKS.flatMap((track) => track.skills);
const SKILL_CAP = new Map(ALL_SKILLS.map((skill) => [skill.id, skill.cap]));
const EMPTY_ALLOCATIONS = ALL_SKILLS.reduce((acc, skill) => {
  acc[skill.id] = 0;
  return acc;
}, {});

const parseTs = (value) => {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const newestFirst = (a, b) => {
  const left = parseTs(a?.updated_at || a?.updated_date || a?.created_date || a?.timestamp);
  const right = parseTs(b?.updated_at || b?.updated_date || b?.created_date || b?.timestamp);
  return right - left;
};

const safeList = async (entityName, sort = "-created_date", limit = 300) => {
  const entity = base44?.entities?.[entityName];
  if (!entity?.list) return [];
  try {
    const rows = await entity.list(sort, limit);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

const normalizeAllocations = (input) => {
  const next = { ...EMPTY_ALLOCATIONS };
  if (!input || typeof input !== "object") return next;
  ALL_SKILLS.forEach((skill) => {
    const cap = SKILL_CAP.get(skill.id) || 10;
    const value = Number(input[skill.id]);
    next[skill.id] = Number.isFinite(value) ? Math.max(0, Math.min(cap, Math.round(value))) : 0;
  });
  return next;
};

const buildDraft = (plan = null) => ({
  plan_name: plan?.plan_name || plan?.name || "Frontline Doctrine",
  level_target: Number.isFinite(Number(plan?.level_target)) ? Number(plan.level_target) : 60,
  available_points: Number.isFinite(Number(plan?.available_points)) ? Number(plan.available_points) : 90,
  active: plan?.active !== false,
  notes: plan?.notes || "",
  allocations: normalizeAllocations(plan?.allocations),
});

export default function SkillForge({ member, user, isEditable }) {
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [draft, setDraft] = useState(() => buildDraft(null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const plansQuery = useRealtimeEntityList({
    queryKey: ["profile", "skill-plans", member?.id || "none"],
    entityName: "PlayerSkillPlan",
    queryFn: () => safeList("PlayerSkillPlan", "-updated_date", 300),
    enabled: Boolean(member?.id),
    staleAfterMs: 30_000,
    patchStrategy: "patch",
  });

  const rows = Array.isArray(plansQuery.data) ? plansQuery.data : [];
  const plans = useMemo(() => {
    if (!member) return [];
    return rows
      .filter((row) => row.target_member_id === member.id
        || (member.user_email && row.user_email === member.user_email)
        || row.player_callsign === member.callsign)
      .sort(newestFirst);
  }, [member, rows]);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.active) || plans[0] || null,
    [plans],
  );

  useEffect(() => {
    if (activePlan) {
      setSelectedPlanId(activePlan.id);
      setDraft(buildDraft(activePlan));
      return;
    }
    setSelectedPlanId(null);
    setDraft(buildDraft(null));
  }, [activePlan?.id, member?.id]);

  const pointsUsed = useMemo(
    () => Object.values(draft.allocations || {}).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [draft.allocations],
  );
  const pointsBudget = Number(draft.available_points) || 0;
  const pointsRemaining = pointsBudget - pointsUsed;

  const setSkillValue = (skillId, delta) => {
    setDraft((prev) => {
      const cap = SKILL_CAP.get(skillId) || 10;
      const current = Number(prev.allocations?.[skillId]) || 0;
      const next = Math.max(0, Math.min(cap, current + delta));
      return {
        ...prev,
        allocations: {
          ...(prev.allocations || {}),
          [skillId]: next,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!isEditable || !member || busy) return;
    setBusy(true);
    setError("");
    try {
      if (pointsRemaining < 0) {
        throw new Error("Skill plan exceeds available points.");
      }
      const entity = base44?.entities?.PlayerSkillPlan;
      if (!entity?.create) throw new Error("PlayerSkillPlan entity unavailable.");
      const payload = {
        plan_name: draft.plan_name || "Unnamed Plan",
        level_target: Number(draft.level_target) || 0,
        available_points: Number(draft.available_points) || 0,
        active: draft.active !== false,
        notes: draft.notes || "",
        allocations: normalizeAllocations(draft.allocations),
        target_member_id: member.id,
        player_callsign: member.callsign,
        user_email: member.user_email || null,
        updated_by: user?.email || null,
        updated_at: new Date().toISOString(),
      };

      let saved = null;
      if (selectedPlanId && entity.update) {
        saved = await entity.update(selectedPlanId, payload);
      } else {
        saved = await entity.create(payload);
      }
      if (payload.active && entity.update) {
        await Promise.all(
          plans
            .filter((plan) => plan.id !== saved?.id && plan.active)
            .map((plan) => entity.update(plan.id, { active: false })),
        );
      }
      if (saved?.id) setSelectedPlanId(saved.id);
      await plansQuery.refetch?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save plan.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (planId) => {
    if (!planId || !isEditable || busy) return;
    setBusy(true);
    setError("");
    try {
      const entity = base44?.entities?.PlayerSkillPlan;
      if (!entity?.delete) throw new Error("PlayerSkillPlan delete unavailable.");
      await entity.delete(planId);
      if (selectedPlanId === planId) {
        setSelectedPlanId(null);
        setDraft(buildDraft(null));
      }
      await plansQuery.refetch?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete plan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="CHARACTER BUILD FORGE" titleColor={T.amber} headerRight={<Sparkles size={11} style={{ color: T.amber }} />}>
      <div className="p-3 space-y-3">
        <LiveStatusStrip
          label="SKILL PLANNER FEED"
          source={plansQuery.source}
          retrievedAt={plansQuery.retrievedAt}
          staleAfterMs={30_000}
          loading={plansQuery.isLoading || plansQuery.isFetching || busy}
          error={error || plansQuery.error?.message || null}
          onRetry={() => plansQuery.refetch?.()}
          extraBadges={[
            { label: `PLANS ${plans.length}`, color: T.amber },
            { label: `PTS ${pointsUsed}/${pointsBudget}`, color: pointsRemaining < 0 ? T.red : T.green },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="PLAN NAME">
            <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.plan_name} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, plan_name: event.target.value }))} />
          </Field>
          <Field label="TARGET LEVEL">
            <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.level_target} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, level_target: Number(event.target.value) || 0 }))} />
          </Field>
          <Field label="POINT BUDGET">
            <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.available_points} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, available_points: Number(event.target.value) || 0 }))} />
          </Field>
          <Field label="MODE">
            <label className="flex items-center gap-2 text-xs" style={{ color: T.text }}>
              <input type="checkbox" checked={draft.active} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, active: event.target.checked }))} />
              Active plan
            </label>
          </Field>
        </div>

        <div className="space-y-2">
          {SKILL_TRACKS.map((track) => {
            const spent = track.skills.reduce((sum, skill) => sum + (Number(draft.allocations?.[skill.id]) || 0), 0);
            const cap = track.skills.reduce((sum, skill) => sum + skill.cap, 0);
            const pct = cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
            return (
              <div key={track.id} className="border p-2" style={{ borderColor: track.color + "44", background: track.color + "0a" }}>
                <div className="flex items-center justify-between">
                  <div style={{ color: track.color, fontSize: "10px", letterSpacing: "0.1em", fontFamily: "'Orbitron', monospace" }}>{track.label}</div>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>{spent}/{cap}</div>
                </div>
                <div className="h-1.5 my-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: track.color, transition: "width 180ms ease" }} />
                </div>
                <div className="space-y-1">
                  {track.skills.map((skill) => {
                    const value = Number(draft.allocations?.[skill.id]) || 0;
                    return (
                      <div key={skill.id} className="flex items-center gap-2">
                        <span className="text-xs flex-1" style={{ color: T.text }}>{skill.label}</span>
                        <span className="text-xs" style={{ color: T.textFaint }}>{value}/{skill.cap}</span>
                        {isEditable && <button type="button" className="border px-1.5" style={{ borderColor: T.borderHi, color: T.textDim }} onClick={() => setSkillValue(skill.id, -1)}>-</button>}
                        {isEditable && <button type="button" className="border px-1.5" style={{ borderColor: T.borderHi, color: T.textDim }} onClick={() => setSkillValue(skill.id, 1)}>+</button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Field label="PLAN NOTES">
          <textarea rows={2} className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none resize-none" style={{ borderColor: T.borderHi, color: T.text }} value={draft.notes} disabled={!isEditable} onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))} />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs" style={{ color: pointsRemaining < 0 ? T.red : T.textDim }}>
            SPENT {pointsUsed}/{pointsBudget} · REM {pointsRemaining}
          </div>
          {isEditable
            ? (
              <div className="flex items-center gap-2">
                <ActionBtn small color={T.textDim} onClick={() => { setSelectedPlanId(null); setDraft(buildDraft(null)); }}>
                  <Plus size={9} /> NEW
                </ActionBtn>
                <ActionBtn color={T.amber} onClick={handleSave} disabled={busy || pointsRemaining < 0}>
                  <Save size={10} /> {busy ? "SAVING..." : "SAVE"}
                </ActionBtn>
              </div>
            )
            : <span className="text-xs" style={{ color: T.amber }}>LOCKED</span>}
        </div>

        <div className="border" style={{ borderColor: T.border }}>
          <div className="px-3 py-2 border-b" style={{ borderColor: T.border, color: T.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>
            SAVED PLANS ({plans.length})
          </div>
          {plans.length === 0 ? (
            <div className="px-3 py-4 text-xs text-center" style={{ color: T.textGhost }}>// NO SAVED PLANS</div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: T.border + "44" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate" style={{ color: plan.active ? T.green : T.text }}>{plan.plan_name || "Unnamed Plan"}</div>
                  <div className="text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>
                    L{plan.level_target || 0} · PTS {plan.available_points || 0}
                  </div>
                </div>
                {plan.active && <StatusBadge label="ACTIVE" color={T.green} />}
                <ActionBtn small color={T.cyan} onClick={() => { setSelectedPlanId(plan.id); setDraft(buildDraft(plan)); }}>
                  LOAD
                </ActionBtn>
                {isEditable && (
                  <button type="button" className="border px-2 py-1" style={{ borderColor: T.red + "66", color: T.red, fontSize: "9px" }} onClick={() => handleDelete(plan.id)}>
                    <Trash2 size={9} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
