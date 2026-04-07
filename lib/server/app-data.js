"use strict";

const {
  getSupabaseConfig,
  listServiceRows,
  replaceUserRows
} = require("./supabase");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DEFAULT_RESTAURANT_DEALS = [
  { id: "deal-fork-flame", name: "Fork & Flame", cuisine: "Mediterranean", deal: "50% off after 9pm", distance: 1.4, rating: 4.8, discount: 50 },
  { id: "deal-green-table", name: "The Green Table", cuisine: "Vegan", deal: "Free rescue dessert with dinner", distance: 2.1, rating: 4.7, discount: 25 },
  { id: "deal-urban-bento", name: "Urban Bento", cuisine: "Japanese", deal: "30% off surplus rice bowls", distance: 3.2, rating: 4.6, discount: 30 },
  { id: "deal-spice-yard", name: "Spice Yard", cuisine: "Indian", deal: "2 rescue meals for $12", distance: 4.4, rating: 4.9, discount: 35 }
];

function toShortMonth(dateValue) {
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? "Now" : MONTHS[parsed.getUTCMonth()];
}

function monthLabelToDate(monthLabel, fallbackIndex = 0) {
  const monthIndex = MONTHS.indexOf(monthLabel);
  if (monthIndex === -1) {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), fallbackIndex, 1)).toISOString().slice(0, 10);
  }

  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), monthIndex, 1)).toISOString().slice(0, 10);
}

function parseDistance(value) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number.parseFloat(String(value || "").replace("km", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFoodItem(record) {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    qty: record.quantity_label,
    expiry: record.expiry_date,
    addedDate: record.added_date,
    reminder: Boolean(record.reminder_enabled)
  };
}

function serializeFoodItem(userId, item) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    category: item.category,
    quantity_label: item.qty,
    expiry_date: item.expiry,
    added_date: item.addedDate,
    reminder_enabled: Boolean(item.reminder),
    notes: null,
    estimated_value: 0,
    source: "manual"
  };
}

function normalizeRecipe(record) {
  return {
    id: record.id,
    name: record.name,
    emoji: record.emoji || "🍽️",
    time: record.time_label || "15 min",
    difficulty: record.difficulty || "Easy",
    ingredients: Array.isArray(record.ingredients) ? record.ingredients : [],
    steps: Array.isArray(record.steps) ? record.steps : []
  };
}

function serializeRecipe(userId, recipe) {
  return {
    id: recipe.id,
    user_id: userId,
    name: recipe.name,
    emoji: recipe.emoji || "🍽️",
    time_label: recipe.time || "15 min",
    difficulty: recipe.difficulty || "Easy",
    source: recipe.source || "manual",
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    is_saved: true
  };
}

function normalizeListing(record, userName) {
  const price = Number(record.price_amount || 0);
  const distanceKm = Number(record.distance_km || 0);
  return {
    id: record.id,
    name: record.title,
    seller: userName || "You",
    price,
    distance: `${distanceKm.toFixed(1)} km`,
    expiry: record.expiry_label || "Today",
    pickup: record.pickup_window,
    isFree: record.price_mode === "free" || price === 0,
    saved: Boolean(record.is_saved)
  };
}

function serializeListing(userId, listing) {
  return {
    id: listing.id,
    user_id: userId,
    food_item_id: null,
    title: listing.name,
    quantity_label: listing.quantity || "1 bundle",
    price_mode: listing.isFree || Number(listing.price || 0) === 0 ? "free" : "paid",
    price_amount: Number(listing.price || 0),
    pickup_window: listing.pickup,
    distance_km: parseDistance(listing.distance),
    expiry_label: listing.expiry || "Today",
    status: "active",
    photo_url: listing.photo || null,
    is_saved: Boolean(listing.saved)
  };
}

function normalizeRestaurantDeal(record) {
  return {
    id: record.id,
    name: record.name,
    cuisine: record.cuisine,
    deal: record.deal_summary,
    distance: Number(record.distance_km || 0),
    rating: Number(record.rating || 0),
    discount: Number(record.discount_percent || 0)
  };
}

function normalizeSavingsSnapshot(record) {
  return {
    id: record.id,
    month: toShortMonth(record.snapshot_month),
    saved: Number(record.saved_amount || 0),
    wasted: Number(record.wasted_amount || 0)
  };
}

function serializeSavingsSnapshot(userId, snapshot, index) {
  return {
    id: snapshot.id,
    user_id: userId,
    snapshot_month: snapshot.snapshotMonth || monthLabelToDate(snapshot.month, index),
    saved_amount: Number(snapshot.saved || 0),
    wasted_amount: Number(snapshot.wasted || 0)
  };
}

async function listAppData(user) {
  const config = getSupabaseConfig();
  if (!config.hasAppDataPersistence) {
    return null;
  }

  const [foodRows, recipeRows, listingRows, savingsRows, dealRows] = await Promise.all([
    listServiceRows(config.foodItemsTable, { user_id: "eq." + user.id, order: "expiry_date.asc" }),
    listServiceRows(config.recipesTable, { user_id: "eq." + user.id, order: "created_at.desc" }),
    listServiceRows(config.marketplaceListingsTable, { user_id: "eq." + user.id, order: "created_at.desc" }),
    listServiceRows(config.savingsSnapshotsTable, { user_id: "eq." + user.id, order: "snapshot_month.asc" }),
    listServiceRows(config.restaurantDealsTable, { is_active: "eq.true", order: "discount_percent.desc" }).catch(() => [])
  ]);

  const userName = user.user_metadata && user.user_metadata.name ? user.user_metadata.name : user.email;

  return {
    foodItems: (foodRows || []).map(normalizeFoodItem),
    savedRecipes: (recipeRows || []).map(normalizeRecipe),
    marketplaceListings: (listingRows || []).map((listing) => normalizeListing(listing, userName)),
    savingsHistory: (savingsRows || []).map(normalizeSavingsSnapshot),
    restaurantDeals: (dealRows || []).length ? dealRows.map(normalizeRestaurantDeal) : DEFAULT_RESTAURANT_DEALS
  };
}

async function replaceAppData(user, payload) {
  const config = getSupabaseConfig();
  if (!config.hasAppDataPersistence) {
    return null;
  }

  const nextFoodItems = Array.isArray(payload.foodItems) ? payload.foodItems : [];
  const nextSavedRecipes = Array.isArray(payload.savedRecipes) ? payload.savedRecipes : [];
  const nextMarketplaceListings = Array.isArray(payload.marketplaceListings) ? payload.marketplaceListings : [];
  const nextSavingsHistory = Array.isArray(payload.savingsHistory) ? payload.savingsHistory : [];

  await Promise.all([
    replaceUserRows(config.foodItemsTable, user.id, nextFoodItems.map((item) => serializeFoodItem(user.id, item))),
    replaceUserRows(config.recipesTable, user.id, nextSavedRecipes.map((recipe) => serializeRecipe(user.id, recipe))),
    replaceUserRows(config.marketplaceListingsTable, user.id, nextMarketplaceListings.map((listing) => serializeListing(user.id, listing))),
    replaceUserRows(config.savingsSnapshotsTable, user.id, nextSavingsHistory.map((snapshot, index) => serializeSavingsSnapshot(user.id, snapshot, index)))
  ]);

  return listAppData(user);
}

module.exports = {
  listAppData,
  replaceAppData
};
