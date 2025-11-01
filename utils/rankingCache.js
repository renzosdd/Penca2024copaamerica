const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const GLOBAL_COMPETITION = '__global__';

const cache = new Map();

function normalizeId(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  if (value.toString) {
    return value.toString().trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}

function makeKey(pencaId, competition) {
  const pencaKey = normalizeId(pencaId) || 'all';
  const competitionKey = normalizeId(competition) || GLOBAL_COMPETITION;
  return `${pencaKey}::${competitionKey}`;
}

function set(pencaId, competition, data) {
  const pencaKey = normalizeId(pencaId);
  const competitionKey = normalizeId(competition) || GLOBAL_COMPETITION;
  const key = makeKey(pencaId, competition);
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
    pencaKey,
    competitionKey,
    scope: pencaKey ? 'penca' : 'global'
  });
}

function get(pencaId, competition) {
  const key = makeKey(pencaId, competition);
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

function shouldRemove(entry, pencaKey, competitionKey) {
  if (!entry) {
    return false;
  }

  const matchesPenca = pencaKey && entry.pencaKey === pencaKey;
  if (matchesPenca) {
    return true;
  }

  if (!competitionKey) {
    return false;
  }

  const matchesCompetition = entry.competitionKey === competitionKey;
  if (!matchesCompetition) {
    return false;
  }

  if (!pencaKey) {
    return true;
  }

  return entry.scope === 'global';
}

function invalidateCache({ pencaId, competition } = {}) {
  if (!pencaId && !competition) {
    cache.clear();
    return;
  }
  const pencaKey = pencaId ? normalizeId(pencaId) : null;
  const competitionKey = competition ? normalizeId(competition) : null;

  for (const [key, entry] of cache.entries()) {
    if (shouldRemove(entry, pencaKey, competitionKey)) {
      cache.delete(key);
    }
  }
}

module.exports = {
  CACHE_TTL_MS,
  async get(pencaId, competition) {
    return get(pencaId, competition);
  },
  async set(pencaId, competition, data) {
    set(pencaId, competition, data);
  },
  async invalidate(params) {
    invalidateCache(params || {});
  }
};
