import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  errorResponse,
  requireAuthenticated,
  requireMethod,
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

    return Response.json({
      success: true,
      user: {
        id: user.id || null,
        email: user.email || null,
        full_name: user.full_name || null,
        role: user.role || "user",
      },
      capabilities: listResolvedCapabilities(user.role || null),
      retrieved_at: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});
