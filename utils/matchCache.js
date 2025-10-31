const cacheStore = require('./cacheStore');

const CATEGORY = 'matches';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const GLOBAL_KEY = '__all__';

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function makeKey(competition) {
  return competition ? normalize(competition) : GLOBAL_KEY;
}

function buildTags(competition) {
  const tags = ['category:matches'];
  if (competition) {
    tags.push(`competition:${normalize(competition)}`);
  }
  return tags;
}

async function setCache(competition, data) {
  const key = makeKey(competition);
  await cacheStore.set({
    category: CATEGORY,
    key,
    data,
    ttlMs: CACHE_TTL_MS,
    tags: buildTags(competition)
  });
}

async function getCache(competition) {
  const key = makeKey(competition);
  return cacheStore.get({ category: CATEGORY, key });
}

async function invalidate(competition) {
  if (!competition) {
    await cacheStore.clearCategory(CATEGORY);
    return;
  }
  await cacheStore.invalidate({
    category: CATEGORY,
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

module.exports = {
  getOrLoad,
  invalidate,
  setCache,
  CACHE_TTL_MS
};
