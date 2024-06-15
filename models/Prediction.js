const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    username: String,
    matchId: mongoose.Schema.Types.ObjectId,
    result1: Number,
    result2: Number,
});

module.exports = mongoose.models.Prediction || mongoose.model('Prediction', predictionSchema);
