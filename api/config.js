"use strict";

const { methodNotAllowed, sendJson } = require("../lib/server/http");
const { getSupabaseConfig } = require("../lib/server/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const supabase = getSupabaseConfig();

  return sendJson(res, 200, {
    capabilities: {
      liveRecipes: Boolean(process.env.ANTHROPIC_API_KEY),
      liveBilling: Boolean(process.env.STRIPE_SECRET_KEY),
      liveAuth: supabase.hasAuth,
      liveWorkspace: supabase.hasWorkspacePersistence,
      liveAppData: supabase.hasAppDataPersistence
    }
  });
};
