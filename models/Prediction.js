const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    username: { type: String, required: true },
    matchId: { type: mongoose.Schema.Types.ObjectId, required: true },
    result1: { type: Number, required: true },
    result2: { type: Number, required: true },
});

module.exports = mongoose.models.Prediction || mongoose.model('Prediction', predictionSchema);
