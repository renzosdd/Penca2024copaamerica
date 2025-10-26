const AuditLog = require('../models/AuditLog');

async function recordAudit({ action, entityType, entityId, actor, metadata = {} }) {
  try {
    await AuditLog.create({ action, entityType, entityId, actor, metadata });
  } catch (error) {
    console.error('audit log error', error.message);
  }
}

module.exports = { recordAudit };
