const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    competition: { type: String, required: true },
    points: { type: Number, default: 0 }
});

module.exports = mongoose.model('Score', scoreSchema);
