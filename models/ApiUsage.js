const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  competition: { type: String },
  lastUsed: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ApiUsage || mongoose.model('ApiUsage', apiUsageSchema);
