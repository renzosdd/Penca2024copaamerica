const mongoose = require('mongoose');

const auditConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    types: {
      type: Map,
      of: Boolean,
      default: {}
    }
  },
  { timestamps: true }
);

auditConfigSchema.index({ updatedAt: -1 });

auditConfigSchema.statics.ensureSingleton = async function ensureSingleton() {
  const existing = await this.findOne();
  if (existing) {
    return existing;
  }
  return this.create({});
};

module.exports = mongoose.models.AuditConfig || mongoose.model('AuditConfig', auditConfigSchema);
