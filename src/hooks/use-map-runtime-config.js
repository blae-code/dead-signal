import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hasUsableMapConfig } from "@/lib/map-transform";

const fetchMapRuntimeConfig = async () => {
  const response = await base44.functions.invoke("getMapRuntimeConfig", {});
  if (response?.data && !response.data.error) {
    return response.data;
  }
  throw new Error(response?.data?.error || "Failed to load map runtime config.");
};

export const useMapRuntimeConfig = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["map-runtime-config", "global"],
    queryFn: fetchMapRuntimeConfig,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    const entity = base44?.entities?.MapRuntimeConfig;
    if (!entity?.subscribe) return;
    const unsub = entity.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["map-runtime-config", "global"] });
    });
    return () => unsub?.();
  }, [queryClient]);

  const config = query.data?.config || null;
  return {
    ...query,
    source: query.data?.source || "unavailable",
    config,
    updatedAt: query.data?.updated_at || null,
    retrievedAt: query.data?.retrieved_at || null,
    hasConfig: hasUsableMapConfig(config),
    errorCode: query.data?.error || null,
  };
};
