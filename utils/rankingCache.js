const cacheStore = require('./cacheStore');

const CATEGORY = 'ranking';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const GLOBAL_COMPETITION = '__global__';

function normalizeId(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value.toString) {
    return value.toString();
  }
  return String(value);
}

function makeKey(pencaId, competition) {
  const pencaKey = normalizeId(pencaId) || 'all';
  const competitionKey = normalizeId(competition) || GLOBAL_COMPETITION;
  return `${pencaKey}::${competitionKey}`;
}

function buildTags(pencaId, competition) {
  const competitionTag = `competition:${normalizeId(competition) || GLOBAL_COMPETITION}`;
  const tags = [competitionTag];
  if (pencaId) {
    tags.push(`penca:${normalizeId(pencaId)}`);
    tags.push('scope:penca');
  } else {
    tags.push('scope:global');
  }
  tags.push('category:ranking');
  return tags;
}

async function set(pencaId, competition, data) {
  const key = makeKey(pencaId, competition);
  const tags = buildTags(pencaId, competition);
  await cacheStore.set({
    category: CATEGORY,
    key,
    data,
    ttlMs: CACHE_TTL_MS,
    tags
  });
}

async function get(pencaId, competition) {
  const key = makeKey(pencaId, competition);
  return cacheStore.get({ category: CATEGORY, key });
}

async function invalidate({ pencaId, competition } = {}) {
  if (!pencaId && !competition) {
    await cacheStore.clearCategory(CATEGORY);
    return;
  }
  const operations = [];
  if (pencaId) {
    operations.push(
      cacheStore.invalidate({
        category: CATEGORY,
        tagsAll: [`penca:${normalizeId(pencaId)}`]
      })
    );
  }
  if (competition) {
    const competitionTag = `competition:${normalizeId(competition)}`;
    if (pencaId) {
      operations.push(
        cacheStore.invalidate({
          category: CATEGORY,
          tagsAll: [competitionTag, 'scope:global']
        })
      );
    } else {
      operations.push(
        cacheStore.invalidate({
          category: CATEGORY,
          tagsAll: [competitionTag]
        })
      );
    }
  }
  if (!operations.length) {
    operations.push(
      cacheStore.invalidate({
        category: CATEGORY,
        tagsAll: [`competition:${GLOBAL_COMPETITION}`]
      })
    );
  }
  await Promise.all(operations);
}

module.exports = {
  CACHE_TTL_MS,
  get,
  set,
  invalidate
};
