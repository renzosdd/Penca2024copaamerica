const mongoose = require('mongoose');
const { sanitizeScoring, buildRulesDescription, DEFAULT_SCORING } = require('../utils/scoring');

const pencaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  competition: { type: String, required: true },
  tournamentMode: {
    type: String,
    enum: ['group_stage_knockout', 'league', 'knockout', 'custom'],
    default: 'group_stage_knockout'
  },
  modeSettings: {
    type: Object,
    default: {}
  },
  participantLimit: { type: Number, default: 20 },
  isPublic: { type: Boolean, default: false },
  scoring: {
    exact: { type: Number, default: DEFAULT_SCORING.exact },
    outcome: { type: Number, default: DEFAULT_SCORING.outcome },
    goalDifference: { type: Number, default: DEFAULT_SCORING.goalDifference },
    teamGoals: { type: Number, default: DEFAULT_SCORING.teamGoals },
    cleanSheet: { type: Number, default: DEFAULT_SCORING.cleanSheet }
  },
  rules: { type: String },
  prizes: { type: String },
  fixture: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

pencaSchema.statics.rulesText = function (scoring) {
  return buildRulesDescription(scoring);
};

pencaSchema.methods.applyScoring = function applyScoring(scoring) {
  this.scoring = sanitizeScoring(scoring);
  if (!this.rules) {
    this.rules = buildRulesDescription(this.scoring);
  }
};

module.exports = mongoose.models.Penca || mongoose.model('Penca', pencaSchema);
 