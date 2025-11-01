const mongoose = require('mongoose');

const cacheEntrySchema = new mongoose.Schema(
  {
    category: { type: String, required: true, index: true },
    key: { type: String, required: true },
    data: mongoose.Schema.Types.Mixed,
    tags: { type: [String], default: [] },
    expiresAt: { type: Date, required: true, index: true }
  },
  {
    timestamps: true
  }
);

cacheEntrySchema.index({ category: 1, key: 1 }, { unique: true });
cacheEntrySchema.index({ tags: 1 });
cacheEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.CacheEntry || mongoose.model('CacheEntry', cacheEntrySchema);
