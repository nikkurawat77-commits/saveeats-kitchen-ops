"use strict";

const { methodNotAllowed, readJsonBody, sendJson } = require("../../lib/server/http");
const { getSupabaseConfig, signInWithPassword } = require("../../lib/server/supabase");

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
    const payload = await signInWithPassword({
      email: body.email,
      password: body.password
    });

    return sendJson(res, 200, {
      mode: "live",
      session: {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_at: payload.expires_at
      },
      user: {
        id: payload.user.id,
        email: payload.user.email,
        name: payload.user.user_metadata && payload.user.user_metadata.name ? payload.user.user_metadata.name : payload.user.email
      }
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: "Login failed",
      detail: error.message || "Unexpected server error"
    });
  }
};
