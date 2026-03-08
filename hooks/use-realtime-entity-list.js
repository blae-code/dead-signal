import { useEffect } from "react";
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
  refetchInterval = false,
  refetchIntervalInBackground = false,
  refetchOnWindowFocus = true,
  patchStrategy = "invalidate",
}) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    refetchInterval,
    refetchIntervalInBackground,
    refetchOnWindowFocus,
    retry: 1,
  });

  useEffect(() => {
    if (!enabled || !entityName) return;
    const entity = base44?.entities?.[entityName];
    if (!entity?.subscribe) return;
    const unsub = entity.subscribe((event) => {
      if (patchStrategy === "patch") {
        queryClient.setQueryData(queryKey, (prev) => patchByEvent(prev, event));
        return;
      }
      queryClient.invalidateQueries({ queryKey });
    });
    return () => unsub?.();
  }, [enabled, entityName, patchStrategy, queryClient, queryKey]);

  return query;
};

