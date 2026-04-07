"use strict";

const { methodNotAllowed, readJsonBody, sendJson } = require("../../lib/server/http");
const { getSupabaseConfig, signUpWithPassword } = require("../../lib/server/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  try {
    const config = getSupabaseConfig();
    if (!config.hasAuth) {
      return sendJson(res, 200, {
        mode: "demo",
        message: "Supabase auth is not configured. FreshMind is still running in local prototype mode."
      });
    }

    const body = await readJsonBody(req);
    const payload = await signUpWithPassword({
      email: body.email,
      password: body.password,
      name: body.name
    });

    return sendJson(res, 200, {
      mode: "live",
      session: payload.session
        ? {
            access_token: payload.session.access_token,
            refresh_token: payload.session.refresh_token,
            expires_at: payload.session.expires_at
          }
        : null,
      user: payload.user
        ? {
            id: payload.user.id,
            email: payload.user.email,
            name: payload.user.user_metadata && payload.user.user_metadata.name ? payload.user.user_metadata.name : payload.user.email
          }
        : null,
      needsEmailVerification: !payload.session
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: "Signup failed",
      detail: error.message || "Unexpected server error"
    });
  }
};
