const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    date: String,
    time: String,
    team1: String,
    team2: String,
    competition: String,
    group_name: String,
    series: String,
    tournament: String,
    result1: Number,
    result2: Number
});

module.exports = mongoose.models.Match || mongoose.model('Match', matchSchema);
