const CacheEntry = require('../models/CacheEntry');

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

async function get({ category, key }) {
  if (!category || key == null) {
    return null;
  }
  const now = new Date();
  const entry = await CacheEntry.findOne({ category, key: normalizeKey(key), expiresAt: { $gt: now } })
    .select('data')
    .lean();
  return entry ? entry.data : null;
}

async function set({ category, key, data, ttlMs, tags = [] }) {
  if (!category || key == null || ttlMs == null) {
    return;
  }
  const expiresAt = new Date(Date.now() + Math.max(0, ttlMs));
  const normalizedKey = normalizeKey(key);
  const uniqueTags = Array.from(new Set(tags.filter(Boolean).map(String)));

  await CacheEntry.updateOne(
    { category, key: normalizedKey },
    { data, expiresAt, tags: uniqueTags, updatedAt: new Date() },
    { upsert: true }
  );
}

async function invalidate({ category, key, tagsAny = [], tagsAll = [] }) {
  if (!category) {
    return;
  }
  const filter = { category };
  if (key != null) {
    filter.key = normalizeKey(key);
  }
  const clauses = {};
  if (Array.isArray(tagsAny) && tagsAny.length) {
    clauses.$in = tagsAny.map(String);
  }
  if (Array.isArray(tagsAll) && tagsAll.length) {
    clauses.$all = tagsAll.map(String);
  }
  if (Object.keys(clauses).length) {
    filter.tags = clauses;
  }
  await CacheEntry.deleteMany(filter);
}

async function clearCategory(category) {
  if (!category) {
    return;
  }
  await CacheEntry.deleteMany({ category });
}

module.exports = {
  get,
  set,
  invalidate,
  clearCategory
};
