"use strict";

const { methodNotAllowed, readJsonBody, sendJson } = require("../lib/server/http");
const { getSupabaseConfig, getUserFromAccessToken, getWorkspaceProfile, upsertWorkspaceProfile } = require("../lib/server/supabase");

function buildDefaultWorkspace(user) {
  const baseName = user.name && user.name.includes(" ") ? user.name.split(" ")[0] : user.name || "FreshMind";
  return {
    user_id: user.id,
    team_name: baseName + " Studio",
    plan: "Growth",
    seats: 5,
    ai_credits_used: 1840,
    ai_credits_limit: 5000,
    automation_runs: 18,
    trial_ends: "2026-05-12",
    monthly_goal: 250
  };
}

function normalizeWorkspace(workspace) {
  return {
    teamName: workspace.team_name,
    plan: workspace.plan,
    seats: workspace.seats,
    aiCreditsUsed: workspace.ai_credits_used,
    aiCreditsLimit: workspace.ai_credits_limit,
    automationRuns: workspace.automation_runs,
    trialEnds: workspace.trial_ends,
    monthlyGoal: workspace.monthly_goal
  };
}

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
      if (!config.hasWorkspacePersistence) {
        return sendJson(res, 200, {
          mode: "demo",
          workspace: normalizeWorkspace(buildDefaultWorkspace({ id: user.id, name: user.user_metadata && user.user_metadata.name ? user.user_metadata.name : user.email }))
        });
      }

      let workspace = await getWorkspaceProfile(user.id);
      if (!workspace) {
        workspace = await upsertWorkspaceProfile(buildDefaultWorkspace({ id: user.id, name: user.user_metadata && user.user_metadata.name ? user.user_metadata.name : user.email }));
      }

      return sendJson(res, 200, {
        mode: "live",
        workspace: normalizeWorkspace(workspace)
      });
    }

    const body = await readJsonBody(req);
    if (!config.hasWorkspacePersistence) {
      return sendJson(res, 200, {
        mode: "demo",
        workspace: body
      });
    }

    const workspace = await upsertWorkspaceProfile({
      user_id: user.id,
      team_name: body.teamName,
      plan: body.plan,
      seats: body.seats,
      ai_credits_used: body.aiCreditsUsed,
      ai_credits_limit: body.aiCreditsLimit,
      automation_runs: body.automationRuns,
      trial_ends: body.trialEnds,
      monthly_goal: body.monthlyGoal
    });

    return sendJson(res, 200, {
      mode: "live",
      workspace: normalizeWorkspace(workspace)
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: "Workspace request failed",
      detail: error.message || "Unexpected server error"
    });
  }
};
