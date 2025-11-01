if (globalThis.__matchCacheModule) {
  module.exports = globalThis.__matchCacheModule;
} else {
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const CATEGORY = 'matches';
  const GLOBAL_KEY = '__all__';

  const cache = new Map();
  const cacheStore = require('./cacheStore');

  function normalize(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  function makeKey(competition) {
    const normalized = normalize(competition);
    return normalized ? normalized : GLOBAL_KEY;
  }

  function setMemoryCache(key, data) {
    cache.set(key, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS
    });
  }

  async function setCache(competition, data) {
    const key = makeKey(competition);
    setMemoryCache(key, data);

    const normalized = key === GLOBAL_KEY ? null : key;
    const tags = normalized ? [`competition:${normalized}`] : [];

    await cacheStore.set({
      category: CATEGORY,
      key,
      data,
      ttlMs: CACHE_TTL_MS,
      tags
    });
  }

  async function getCache(competition) {
    const key = makeKey(competition);
    const entry = cache.get(key);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        return entry.data;
      }
      cache.delete(key);
    }

    const stored = await cacheStore.get({ category: CATEGORY, key });
    if (stored == null) {
      return null;
    }
    setMemoryCache(key, stored);
    return stored;
  }

  async function invalidate(competition) {
    if (!competition) {
      cache.clear();
      await cacheStore.clearCategory(CATEGORY);
      return;
    }

    const key = makeKey(competition);
    cache.delete(key);
    await cacheStore.invalidate({
      category: CATEGORY,
      key,
      tagsAny: [`competition:${normalize(competition)}`]
    });
  }

  async function getOrLoad(competition, loader) {
    const cached = await getCache(competition);
    if (cached) {
      return cached;
    }
    const data = await loader();
    await setCache(competition, data);
    return data;
  }

  globalThis.__matchCacheModule = {
    getOrLoad,
    invalidate,
    setCache,
    CACHE_TTL_MS
  };

  module.exports = globalThis.__matchCacheModule;
}
