const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    username: { type: String, required: true },
    matchId: { type: mongoose.Schema.Types.ObjectId, required: true },
    pencaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Penca', required: true },
    result1: { type: Number, required: true },
    result2: { type: Number, required: true },
});

predictionSchema.index({ userId: 1, matchId: 1, pencaId: 1 }, { unique: true });

module.exports = mongoose.models.Prediction || mongoose.model('Prediction', predictionSchema);
