import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Package2, Plus, CheckCircle, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const URGENCY_COLORS = { Low: T.textDim, Medium: T.amber, High: T.orange, Critical: T.red };

const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";

const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";
const pickFirstNonAll = (values) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() !== "all") || pickFirst(values);

const buildEmpty = (categories, urgencies) => ({
  item_name: "",
  category: pickFirstNonAll(categories),
  quantity: 1,
  urgency: pickFirst(urgencies),
  notes: "",
});

export default function LootSharing() {
  const queryClient = useQueryClient();
  const runtimeConfig = useRuntimeConfig();
  const categories = runtimeConfig.getArray(["taxonomy", "loot_categories"]);
  const statusFilters = runtimeConfig.getArray(["taxonomy", "loot_status_filters"]);
  const urgencies = runtimeConfig.getArray(["taxonomy", "loot_urgencies"]);

  const allFilter = useMemo(() => pickByToken(statusFilters, "all") || pickFirst(statusFilters), [statusFilters]);
  const openStatus = useMemo(() => pickByToken(statusFilters, "open") || pickFirstNonAll(statusFilters), [statusFilters]);
  const fulfilledStatus = useMemo(() => pickByToken(statusFilters, "fulfilled"), [statusFilters]);
  const cancelledStatus = useMemo(() => pickByToken(statusFilters, "cancelled"), [statusFilters]);
  const nonAllStatuses = useMemo(() => statusFilters.filter((status) => status !== allFilter), [allFilter, statusFilters]);
  const statusColors = useMemo(
    () =>
      Object.fromEntries(
        nonAllStatuses.map((status, index) => [status, [T.amber, T.green, T.textDim, T.cyan, T.orange][index % 5]]),
      ),
    [nonAllStatuses],
  );

  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => buildEmpty(categories, urgencies));

  const { data: user = null } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
    retry: 1,
  });
  const { data: member = null } = useQuery({
    queryKey: ["loot-sharing", "member", user?.email || ""],
    queryFn: async () => {
      const records = await base44.entities.ClanMember.filter({ user_email: user.email });
      return records[0] || null;
    },
    enabled: Boolean(user?.email),
    staleTime: 30_000,
  });

  const { data: requests = [] } = useRealtimeEntityList({
    queryKey: ["loot-sharing", "requests"],
    entityName: "LootRequest",
    queryFn: () => base44.entities.LootRequest.list("-created_date", 100),
    patchStrategy: "patch",
  });

  useEffect(() => {
    if (!form.category || !form.urgency) {
      setForm((prev) => ({ ...prev, ...buildEmpty(categories, urgencies) }));
    }
  }, [categories, form.category, form.urgency, urgencies]);

  useEffect(() => {
    if (!filter && allFilter) setFilter(allFilter);
  }, [allFilter, filter]);

  const handlePost = async () => {
    if (!user?.email) return;
    const entry = {
      ...form,
      requester_email: user.email,
      requester_callsign: member?.callsign || user.full_name || user.email,
      quantity: Number(form.quantity),
    };
    if (openStatus) entry.status = openStatus;
    await base44.entities.LootRequest.create(entry);
    queryClient.invalidateQueries({ queryKey: ["loot-sharing", "requests"] });
    setForm(buildEmpty(categories, urgencies));
    setShowForm(false);
  };

  const handleFulfill = async (request) => {
    if (!fulfilledStatus) return;
    await base44.entities.LootRequest.update(request.id, {
      status: fulfilledStatus,
      fulfilled_by: member?.callsign || user?.full_name || user?.email,
    });
    queryClient.invalidateQueries({ queryKey: ["loot-sharing", "requests"] });
  };

  const handleCancel = async (request) => {
    if (!cancelledStatus) return;
    await base44.entities.LootRequest.update(request.id, { status: cancelledStatus });
    queryClient.invalidateQueries({ queryKey: ["loot-sharing", "requests"] });
  };

  const handleDelete = async (id) => {
    await base44.entities.LootRequest.delete(id);
    queryClient.invalidateQueries({ queryKey: ["loot-sharing", "requests"] });
  };

  const filtered = filter && filter !== allFilter ? requests.filter((request) => request.status === filter) : requests;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <PageHeader icon={Package2} title="LOOT SHARING" color={T.amber}>
        <ActionBtn color={T.amber} onClick={() => setShowForm(!showForm)}>
          <Plus size={10} /> REQUEST ITEM
        </ActionBtn>
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {nonAllStatuses.map((status) => (
          <div key={status} className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
            <div style={{ color: T.textFaint, fontSize: "9px" }}>{status.toUpperCase()}</div>
            <div style={{ color: statusColors[status] || T.textDim, fontFamily: "'Orbitron', monospace", fontSize: "18px" }}>
              {requests.filter((request) => request.status === status).length}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <FormPanel title="REQUEST ITEM" titleColor={T.amber} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ITEM NAME *">
              <input
                className="w-full border p-2 text-xs"
                style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.item_name}
                onChange={(event) => setForm({ ...form, item_name: event.target.value })}
                placeholder="e.g. Bandage Kit"
              />
            </Field>
            <Field label="CATEGORY">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {categories.filter((category) => category.toLowerCase() !== "all").map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Field label="QTY NEEDED">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
            </Field>
            <Field label="URGENCY">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }} value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })}>
                {urgencies.map((urgency) => (
                  <option key={urgency}>{urgency}</option>
                ))}
              </select>
            </Field>
            <Field label="NOTES">
              <input
                className="w-full border p-2 text-xs col-span-2"
                style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Where you are, why you need it..."
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>
              CANCEL
            </ActionBtn>
            <ActionBtn color={T.amber} onClick={handlePost} disabled={!form.item_name}>
              POST REQUEST
            </ActionBtn>
          </div>
        </FormPanel>
      )}

      <div className="flex flex-wrap gap-1">
        {statusFilters.map((status) => (
          <FilterPill key={status} label={status} active={filter === status} color={T.amber} onClick={() => setFilter(status)} />
        ))}
      </div>

      <Panel title={`REQUESTS (${filtered.length})`} titleColor={T.amber}>
        {filtered.length === 0 ? (
          <EmptyState message="NO REQUESTS — CLAN IS WELL SUPPLIED" />
        ) : (
          filtered.map((request) => (
            <div key={request.id} className="px-3 py-3 border-b" style={{ borderColor: T.border + "66" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: T.text, fontSize: "12px", fontWeight: "bold" }}>{request.item_name}</span>
                    <span style={{ color: T.textFaint, fontSize: "10px" }}>×{request.quantity}</span>
                    <span style={{ color: URGENCY_COLORS[request.urgency], fontSize: "9px", border: `1px solid ${URGENCY_COLORS[request.urgency]}44`, padding: "1px 6px" }}>
                      {request.urgency}
                    </span>
                    <span style={{ color: statusColors[request.status] || T.textDim, fontSize: "9px" }}>[{request.status}]</span>
                  </div>
                  <div style={{ color: T.textDim, fontSize: "10px" }}>
                    Requested by: <span style={{ color: T.amber }}>{request.requester_callsign || request.requester_email}</span>
                    {request.fulfilled_by && (
                      <>
                        {" "}
                        · Fulfilled by: <span style={{ color: T.green }}>{request.fulfilled_by}</span>
                      </>
                    )}{" "}
                    · {request.created_date?.slice(0, 10)}
                  </div>
                  {request.notes && <div style={{ color: T.textFaint, fontSize: "10px", marginTop: 2 }}>{request.notes}</div>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {openStatus && request.status === openStatus && request.requester_email !== user?.email && (
                    <ActionBtn small color={T.green} onClick={() => handleFulfill(request)}>
                      <CheckCircle size={9} /> FULFILL
                    </ActionBtn>
                  )}
                  {openStatus && request.status === openStatus && request.requester_email === user?.email && (
                    <ActionBtn small color={T.textDim} onClick={() => handleCancel(request)}>
                      CANCEL
                    </ActionBtn>
                  )}
                  <button onClick={() => handleDelete(request.id)} className="p-1 hover:opacity-70">
                    <Trash2 size={10} style={{ color: T.red + "66" }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
