const AuditLog = require('../models/AuditLog');
const AuditConfig = require('../models/AuditConfig');

const AUDIT_TYPES = ['user', 'penca', 'prediction'];
const CACHE_TTL = 60 * 1000;

let cachedConfig = null;
let cacheLoadedAt = 0;

function defaultConfig() {
  return { enabled: false, types: {} };
}

function normalizeTypes(input = {}) {
  if (input instanceof Map) {
    input = Object.fromEntries(input.entries());
  }
  const result = {};
  AUDIT_TYPES.forEach(type => {
    result[type] = Boolean(input[type]);
  });
  return result;
}

async function loadConfig() {
  const now = Date.now();
  if (cachedConfig && now - cacheLoadedAt < CACHE_TTL) {
    return cachedConfig;
  }
  const doc = await AuditConfig.findOne();
  const config = doc ? doc.toObject() : defaultConfig();
  const normalized = {
    enabled: Boolean(config.enabled),
    types: normalizeTypes(config.types || {})
  };
  cachedConfig = normalized;
  cacheLoadedAt = now;
  return cachedConfig;
}

async function shouldRecord({ action, entityType }) {
  const config = await loadConfig();
  if (!config.enabled) {
    return false;
  }
  const types = config.types || {};
  const hasSelectedTypes = Object.values(types).some(Boolean);
  if (!hasSelectedTypes) {
    return true;
  }
  const normalizedType = entityType ? String(entityType).toLowerCase() : null;
  if (normalizedType && types[normalizedType]) {
    return true;
  }
  if (action) {
    const actionPrefix = String(action).split(':')[0];
    if (types[actionPrefix]) {
      return true;
    }
  }
  return false;
}

async function recordAudit({ action, entityType, entityId, actor, metadata = {} }) {
  if (!(await shouldRecord({ action, entityType }))) {
    return;
  }
  try {
    await AuditLog.create({ action, entityType, entityId, actor, metadata });
  } catch (error) {
    console.error('audit log error', error.message);
  }
}

async function getAuditConfig() {
  return loadConfig();
}

async function updateAuditConfig({ enabled, types }) {
  const payload = {
    enabled: Boolean(enabled),
    types: normalizeTypes(types)
  };
  await AuditConfig.findOneAndUpdate(
    {},
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  cachedConfig = {
    enabled: payload.enabled,
    types: payload.types
  };
  cacheLoadedAt = Date.now();
  return cachedConfig;
}

module.exports = { recordAudit, getAuditConfig, updateAuditConfig, AUDIT_TYPES };
