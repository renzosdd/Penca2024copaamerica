const CACHE_TTL_MS = 60 * 1000;

const cache = new Map();

function makeKey(competition) {
  return String(competition || '').toLowerCase();
}

function setCache(competition, data) {
  if (!competition) {
    return;
  }
  cache.set(makeKey(competition), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data
  });
}

function getCache(competition) {
  if (!competition) {
    return null;
  }
  const entry = cache.get(makeKey(competition));
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    cache.delete(makeKey(competition));
    return null;
  }
  return entry.data;
}

function invalidate(competition) {
  if (!competition) {
    cache.clear();
    return;
  }
  cache.delete(makeKey(competition));
}

async function getOrLoad(competition, loader) {
  const cached = getCache(competition);
  if (cached) {
    return cached;
  }
  const data = await loader();
  setCache(competition, data);
  return data;
}

module.exports = {
  getOrLoad,
  invalidate,
  setCache,
  CACHE_TTL_MS
};
