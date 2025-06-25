const mongoose = require('mongoose');

const pencaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  competition: { type: String, required: true },
  participantLimit: { type: Number, default: 20 },
  fixture: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.models.Penca || mongoose.model('Penca', pencaSchema);
