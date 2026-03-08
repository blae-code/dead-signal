import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const fetchCapabilities = async () => {
  const response = await base44.functions.invoke("getFunctionCapabilities", {});
  if (response?.data && !response.data.error) {
    return response.data;
  }
  throw new Error(response?.data?.error || "Failed to load function capability matrix.");
};

const surfaceName = (surfaceId) => {
  if (surfaceId === "ops_center") return "Ops Center";
  if (surfaceId === "telemetry_pipeline_lab") return "Telemetry Pipeline Lab";
  if (surfaceId === "security_diagnostics") return "Security/Diagnostics";
  if (surfaceId === "ai_intel_studio") return "AI/Intel Studio";
  if (surfaceId === "field_ops") return "Field Ops Integrations";
  return "Unknown Surface";
};

export const useFunctionCapabilities = () => {
  const query = useQuery({
    queryKey: ["function-capabilities", "global"],
    queryFn: fetchCapabilities,
    staleTime: 15_000,
    retry: 1,
  });

  const groupedBySurface = useMemo(() => {
    const capabilities = Array.isArray(query.data?.capabilities) ? query.data.capabilities : [];
    const grouped = new Map();

    capabilities.forEach((capability) => {
      const surface = capability?.ui_surface || "unknown";
      if (!grouped.has(surface)) {
        grouped.set(surface, []);
      }
      grouped.get(surface).push(capability);
    });

    return Array.from(grouped.entries()).map(([surface, capabilities]) => ({
      surface,
      title: surfaceName(surface),
      capabilities,
    }));
  }, [query.data?.capabilities]);

  return {
    ...query,
    user: query.data?.user || null,
    retrievedAt: query.data?.retrieved_at || null,
    capabilities: Array.isArray(query.data?.capabilities) ? query.data.capabilities : [],
    groupedBySurface,
  };
};
