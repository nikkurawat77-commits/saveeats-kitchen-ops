"use strict";

const DEFAULT_WORKSPACE_TABLE = "workspace_profiles";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const workspaceTable = process.env.SUPABASE_WORKSPACE_TABLE || DEFAULT_WORKSPACE_TABLE;

  return {
    url,
    anonKey,
    serviceRoleKey,
    workspaceTable,
    hasAuth: Boolean(url && anonKey),
    hasWorkspacePersistence: Boolean(url && serviceRoleKey)
  };
}

async function requestSupabase(path, options) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload && payload.msg
      ? payload.msg
      : payload && payload.error_description
        ? payload.error_description
        : payload && payload.message
          ? payload.message
          : "Supabase request failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function signUpWithPassword({ email, password, name }) {
  const config = getSupabaseConfig();
  if (!config.hasAuth) {
    throw new Error("Supabase auth is not configured");
  }

  return requestSupabase(config.url + "/auth/v1/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: config.anonKey,
      Authorization: "Bearer " + config.anonKey
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        name
      }
    })
  });
}

async function signInWithPassword({ email, password }) {
  const config = getSupabaseConfig();
  if (!config.hasAuth) {
    throw new Error("Supabase auth is not configured");
  }

  return requestSupabase(config.url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: config.anonKey,
      Authorization: "Bearer " + config.anonKey
    },
    body: JSON.stringify({
      email,
      password
    })
  });
}

async function getUserFromAccessToken(accessToken) {
  const config = getSupabaseConfig();
  if (!config.hasAuth) {
    throw new Error("Supabase auth is not configured");
  }

  return requestSupabase(config.url + "/auth/v1/user", {
    method: "GET",
    headers: {
      apikey: config.anonKey,
      Authorization: "Bearer " + accessToken
    }
  });
}

async function getWorkspaceProfile(userId) {
  const config = getSupabaseConfig();
  if (!config.hasWorkspacePersistence) {
    return null;
  }

  const params = new URLSearchParams({
    select: "*",
    user_id: "eq." + userId,
    limit: "1"
  });

  const result = await requestSupabase(config.url + "/rest/v1/" + config.workspaceTable + "?" + params.toString(), {
    method: "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: "Bearer " + config.serviceRoleKey
    }
  });

  return Array.isArray(result) ? (result[0] || null) : null;
}

async function upsertWorkspaceProfile(profile) {
  const config = getSupabaseConfig();
  if (!config.hasWorkspacePersistence) {
    return null;
  }

  const result = await requestSupabase(config.url + "/rest/v1/" + config.workspaceTable, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
      apikey: config.serviceRoleKey,
      Authorization: "Bearer " + config.serviceRoleKey
    },
    body: JSON.stringify([profile])
  });

  return Array.isArray(result) ? (result[0] || null) : result;
}

module.exports = {
  getSupabaseConfig,
  getUserFromAccessToken,
  getWorkspaceProfile,
  signInWithPassword,
  signUpWithPassword,
  upsertWorkspaceProfile
};
