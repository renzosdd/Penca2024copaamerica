const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map();

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function makeKey(competition) {
  return competition ? normalize(competition) : '__all__';
}

function setCache(competition, data) {
  const key = makeKey(competition);
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data
  });
}

function getCache(competition) {
  const key = makeKey(competition);
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
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
