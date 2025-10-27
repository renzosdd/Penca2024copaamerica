const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    date: String,
    time: String,
    kickoff: Date,
    originalDate: String,
    originalTime: String,
    originalTimezone: String,
    team1: String,
    team2: String,
    competition: String,
    group_name: String,
    series: String,
    tournament: String,
    venue: {
        country: String,
        city: String,
        stadium: String
    },
    result1: Number,
    result2: Number,
    order: Number
});

matchSchema.index({ competition: 1, kickoff: 1, order: 1 });
matchSchema.index({ competition: 1, date: 1, time: 1 });

module.exports = mongoose.models.Match || mongoose.model('Match', matchSchema);
