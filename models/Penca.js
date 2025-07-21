const mongoose = require('mongoose');

const pencaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  competition: { type: String, required: true },
  participantLimit: { type: Number, default: 20 },
  isPublic: { type: Boolean, default: false },
  scoring: {
    exact: { type: Number, default: 3 },
    outcome: { type: Number, default: 1 },
    goals: { type: Number, default: 1 }
  },
  rules: { type: String },
  prizes: { type: String },
  fixture: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

pencaSchema.statics.rulesText = function (scoring) {
  const s = scoring || { exact: 3, outcome: 1, goals: 1 };
  return `${s.exact} puntos por resultado exacto, ${s.outcome} por acertar ganador o empate y ${s.goals} por acertar goles de un equipo`;
};

module.exports = mongoose.models.Penca || mongoose.model('Penca', pencaSchema);
 