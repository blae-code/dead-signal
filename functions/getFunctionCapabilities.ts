import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  errorResponse,
  requireAuthenticated,
  requireMethod,
  resolveClanMemberRole,
} from "./_shared/backend.ts";
import { listResolvedCapabilities } from "./_shared/functionCapabilities.ts";

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    const user = requireAuthenticated(await base44.auth.me()) as {
      role?: string;
      email?: string;
      full_name?: string;
      id?: string;
    };
    const clanRole = await resolveClanMemberRole(base44, user);
    const tacticalWriter = user.role === "admin"
      || clanRole === "commander"
      || clanRole === "lieutenant"
      || clanRole === "officer";

    return Response.json({
      success: true,
      user: {
        id: user.id || null,
        email: user.email || null,
        full_name: user.full_name || null,
        role: user.role || "user",
        clan_role: clanRole || null,
        tactical_writer: tacticalWriter,
      },
      capabilities: listResolvedCapabilities(user.role || null, { tactical_writer: tacticalWriter }),
      retrieved_at: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});
