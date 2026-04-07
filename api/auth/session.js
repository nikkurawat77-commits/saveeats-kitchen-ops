"use strict";

const { methodNotAllowed, sendJson } = require("../../lib/server/http");
const { getSupabaseConfig, getUserFromAccessToken } = require("../../lib/server/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  try {
    const config = getSupabaseConfig();
    if (!config.hasAuth) {
      return sendJson(res, 200, {
        mode: "demo",
        message: "Supabase auth is not configured."
      });
    }

    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!accessToken) {
      return sendJson(res, 401, { error: "Missing access token" });
    }

    const user = await getUserFromAccessToken(accessToken);
    return sendJson(res, 200, {
      mode: "live",
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata && user.user_metadata.name ? user.user_metadata.name : user.email
      }
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: "Session validation failed",
      detail: error.message || "Unexpected server error"
    });
  }
};
