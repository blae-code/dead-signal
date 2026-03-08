import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const fetchRuntimeConfig = async () => {
  const response = await base44.functions.invoke("getRuntimeConfig", {});
  if (response?.data && !response.data.error) {
    return response.data;
  }
  throw new Error(response?.data?.error || "Failed to load runtime configuration.");
};

const getArray = (config, path) => {
  let cursor = config;
  for (const segment of path) {
    if (!cursor || typeof cursor !== "object") return [];
    cursor = cursor[segment];
  }
  return Array.isArray(cursor) ? cursor : [];
};

export const useRuntimeConfig = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["runtime-config", "global"],
    queryFn: fetchRuntimeConfig,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    const entity = base44?.entities?.RuntimeConfig;
    if (!entity?.subscribe) return;
    const unsub = entity.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["runtime-config", "global"] });
    });
    return () => unsub?.();
  }, [queryClient]);

  return {
    ...query,
    source: query.data?.source ?? "unavailable",
    version: query.data?.version ?? null,
    updatedAt: query.data?.updated_at ?? null,
    retrievedAt: query.data?.retrieved_at ?? null,
    config: query.data?.config ?? null,
    getArray: (path) => getArray(query.data?.config, path),
  };
};

