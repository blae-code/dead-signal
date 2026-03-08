import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const patchByEvent = (prev, event) => {
  const list = Array.isArray(prev) ? prev : [];
  if (!event || typeof event !== "object") return list;
  const type = event.type;
  const item = event.data;
  if (!item || typeof item !== "object") return list;
  const id = item.id;
  if (typeof id !== "string") return list;

  if (type === "create") {
    return [item, ...list.filter((entry) => entry?.id !== id)];
  }
  if (type === "update") {
    let seen = false;
    const next = list.map((entry) => {
      if (entry?.id === id) {
        seen = true;
        return item;
      }
      return entry;
    });
    return seen ? next : [item, ...next];
  }
  if (type === "delete") {
    return list.filter((entry) => entry?.id !== id);
  }
  return list;
};

export const useRealtimeEntityList = ({
  queryKey,
  entityName,
  queryFn,
  enabled = true,
  staleTime = 15_000,
  staleAfterMs = 30_000,
  patchStrategy = "invalidate",
}) => {
  const queryClient = useQueryClient();
  const [source, setSource] = useState("unavailable");
  const [retrievedAt, setRetrievedAt] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const queryKeyToken = useMemo(() => JSON.stringify(queryKey), [queryKey]);
  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    retry: 1,
  });

  useEffect(() => {
    if (!enabled) return;
    if (query.isError) {
      setSource("unavailable");
      return;
    }
    if (query.dataUpdatedAt && Number.isFinite(query.dataUpdatedAt) && query.dataUpdatedAt > 0) {
      setSource("live");
      setRetrievedAt(new Date(query.dataUpdatedAt).toISOString());
      setRetrying(false);
    }
  }, [enabled, query.dataUpdatedAt, query.isError]);

  useEffect(() => {
    if (!enabled || !entityName) return;
    const entity = base44?.entities?.[entityName];
    if (!entity?.subscribe) return;
    const unsub = entity.subscribe((event) => {
      setSource("live");
      setRetrievedAt(new Date().toISOString());
      if (patchStrategy === "patch") {
        queryClient.setQueryData(queryKey, (prev) => patchByEvent(prev, event));
        return;
      }
      queryClient.invalidateQueries({ queryKey });
    });
    return () => unsub?.();
  }, [enabled, entityName, patchStrategy, queryClient, queryKey, queryKeyToken]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onOnline = () => {
      setRetrying(true);
      queryClient.invalidateQueries({ queryKey }).finally(() => {
        setRetrying(false);
      });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [enabled, queryClient, queryKey, queryKeyToken]);

  const effectiveRetrievedAt = retrievedAt || (query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt).toISOString()
    : null);
  const parsedRetrievedAt = typeof effectiveRetrievedAt === "string" ? Date.parse(effectiveRetrievedAt) : NaN;
  const ageMs = Number.isFinite(parsedRetrievedAt) ? Math.max(0, Date.now() - parsedRetrievedAt) : null;
  const stale = typeof ageMs === "number" ? ageMs > staleAfterMs : true;
  const freshness = source === "unavailable"
    ? "unavailable"
    : (stale ? "stale" : "fresh");

  return {
    ...query,
    source,
    retrievedAt: effectiveRetrievedAt,
    ageMs,
    stale,
    freshness,
    retrying,
  };
};

