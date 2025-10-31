const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const cache = new Map();

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
  return `${normalizeId(pencaId)}|${normalizeId(competition)}`;
}

function set(pencaId, competition, data) {
  const key = makeKey(pencaId, competition);
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
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

function invalidate({ pencaId, competition } = {}) {
  if (!pencaId && !competition) {
    cache.clear();
    return;
  }
  const matchPenca = normalizeId(pencaId);
  const matchCompetition = normalizeId(competition);
  for (const key of cache.keys()) {
    const [storedPenca, storedCompetition] = key.split('|');
    if (
      (matchPenca && storedPenca === matchPenca) ||
      (matchCompetition && storedCompetition === matchCompetition)
    ) {
      cache.delete(key);
    }
  }
}

module.exports = {
  CACHE_TTL_MS,
  get,
  set,
  invalidate
};
