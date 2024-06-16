const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    competition: String,
    score: { type: Number, default: 0 }
});

module.exports = mongoose.model('Score', scoreSchema);
