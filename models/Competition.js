const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    groupsCount: Number,
    integrantsPerGroup: Number,
    qualifiersPerGroup: Number,
    apiLeagueId: Number,
    apiSeason: Number
});

module.exports = mongoose.models.Competition || mongoose.model('Competition', competitionSchema);
 