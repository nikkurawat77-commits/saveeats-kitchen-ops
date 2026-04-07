"use strict";

const DEFAULT_TABLES = {
  workspace: "workspace_profiles",
  foodItems: "food_items",
  recipes: "recipes",
  marketplaceListings: "marketplace_listings",
  restaurantDeals: "restaurant_deals",
  savingsSnapshots: "savings_snapshots"
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const workspaceTable = process.env.SUPABASE_WORKSPACE_TABLE || DEFAULT_TABLES.workspace;
  const foodItemsTable = process.env.SUPABASE_FOOD_ITEMS_TABLE || DEFAULT_TABLES.foodItems;
  const recipesTable = process.env.SUPABASE_RECIPES_TABLE || DEFAULT_TABLES.recipes;
  const marketplaceListingsTable = process.env.SUPABASE_MARKETPLACE_TABLE || DEFAULT_TABLES.marketplaceListings;
  const restaurantDealsTable = process.env.SUPABASE_RESTAURANT_DEALS_TABLE || DEFAULT_TABLES.restaurantDeals;
  const savingsSnapshotsTable = process.env.SUPABASE_SAVINGS_TABLE || DEFAULT_TABLES.savingsSnapshots;
  const hasAuth = Boolean(url && anonKey);
  const hasWorkspacePersistence = Boolean(url && serviceRoleKey);

  return {
    url,
    anonKey,
    serviceRoleKey,
    workspaceTable,
    foodItemsTable,
    recipesTable,
    marketplaceListingsTable,
    restaurantDealsTable,
    savingsSnapshotsTable,
    hasAuth,
    hasWorkspacePersistence,
    hasAppDataPersistence: hasWorkspacePersistence
  };
}

async function requestSupabase(path, options) {
  const response = await fetch(path, options);
  const raw = await response.text();
  let payload = {};

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }

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

function getServiceHeaders(extraHeaders = {}) {
  const config = getSupabaseConfig();
  return {
    apikey: config.serviceRoleKey,
    Authorization: "Bearer " + config.serviceRoleKey,
    ...extraHeaders
  };
}

async function listServiceRows(table, query = {}) {
  const config = getSupabaseConfig();
  const params = new URLSearchParams({ select: "*", ...query });

  return requestSupabase(config.url + "/rest/v1/" + table + "?" + params.toString(), {
    method: "GET",
    headers: getServiceHeaders()
  });
}

async function deleteServiceRows(table, query = {}) {
  const config = getSupabaseConfig();
  const params = new URLSearchParams(query);

  return requestSupabase(config.url + "/rest/v1/" + table + "?" + params.toString(), {
    method: "DELETE",
    headers: getServiceHeaders({
      Prefer: "return=representation"
    })
  });
}

async function insertServiceRows(table, rows, options = {}) {
  const config = getSupabaseConfig();
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const prefer = options.prefer || "return=representation";
  return requestSupabase(config.url + "/rest/v1/" + table, {
    method: "POST",
    headers: getServiceHeaders({
      "content-type": "application/json",
      Prefer: prefer
    }),
    body: JSON.stringify(rows)
  });
}

async function replaceUserRows(table, userId, rows) {
  await deleteServiceRows(table, {
    user_id: "eq." + userId
  });

  return insertServiceRows(table, rows);
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

  const result = await listServiceRows(config.workspaceTable, {
    user_id: "eq." + userId,
    limit: "1"
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
    headers: getServiceHeaders({
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify([profile])
  });

  return Array.isArray(result) ? (result[0] || null) : result;
}

module.exports = {
  deleteServiceRows,
  getServiceHeaders,
  getSupabaseConfig,
  getUserFromAccessToken,
  getWorkspaceProfile,
  insertServiceRows,
  listServiceRows,
  replaceUserRows,
  requestSupabase,
  signInWithPassword,
  signUpWithPassword,
  upsertWorkspaceProfile
};
