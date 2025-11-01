const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    competition: { type: String, required: true },
    score: { type: Number, default: 0 }
});

scoreSchema.index({ userId: 1, competition: 1 }, { unique: true });
scoreSchema.index({ competition: 1, score: -1 });

module.exports = mongoose.models.Score || mongoose.model('Score', scoreSchema);
 