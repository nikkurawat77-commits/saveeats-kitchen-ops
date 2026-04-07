"use strict";

const { methodNotAllowed, readJsonBody, sendJson } = require("../lib/server/http");
const { listAppData, replaceAppData } = require("../lib/server/app-data");
const { getSupabaseConfig, getUserFromAccessToken } = require("../lib/server/supabase");

module.exports = async function handler(req, res) {
  if (!["GET", "PUT"].includes(req.method)) {
    return methodNotAllowed(res, ["GET", "PUT"]);
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

    if (req.method === "GET") {
      if (!config.hasAppDataPersistence) {
        return sendJson(res, 200, {
          mode: "demo",
          message: "Supabase app data persistence is not configured."
        });
      }

      const data = await listAppData(user);
      return sendJson(res, 200, {
        mode: "live",
        data
      });
    }

    const body = await readJsonBody(req);
    if (!config.hasAppDataPersistence) {
      return sendJson(res, 200, {
        mode: "demo",
        data: body
      });
    }

    const data = await replaceAppData(user, body);
    return sendJson(res, 200, {
      mode: "live",
      data
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: "App data request failed",
      detail: error.message || "Unexpected server error"
    });
  }
};
