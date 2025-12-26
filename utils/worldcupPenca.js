const Penca = require('../models/Penca');
const User = require('../models/User');
const { DEFAULT_COMPETITION, DEFAULT_PENCA_NAME, DEFAULT_PENCA_CODE } = require('../config');
const { DEFAULT_SCORING } = require('./scoring');

async function resolveOwner(ownerId) {
  if (ownerId) {
    return ownerId;
  }
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  return admin ? admin._id : null;
}

function buildPencaPayload(ownerId) {
  return {
    name: DEFAULT_PENCA_NAME,
    code: DEFAULT_PENCA_CODE,
    owner: ownerId,
    competition: DEFAULT_COMPETITION,
    participantLimit: null,
    isPublic: true,
    tournamentMode: 'group_stage_knockout',
    modeSettings: {},
    scoring: DEFAULT_SCORING,
    rules: Penca.rulesText(DEFAULT_SCORING),
    participants: ownerId ? [ownerId] : [],
    pendingRequests: []
  };
}

async function ensureWorldCupPenca(ownerId) {
  const existing = await Penca.findOne({ competition: DEFAULT_COMPETITION });
  if (existing) {
    return existing;
  }

  const resolvedOwner = await resolveOwner(ownerId);
  if (!resolvedOwner) {
    return null;
  }

  const penca = new Penca(buildPencaPayload(resolvedOwner));
  await penca.save();
  return penca;
}

async function ensureUserInPenca(userId) {
  if (!userId) {
    return null;
  }

  const penca = await ensureWorldCupPenca(userId);
  if (!penca) {
    return null;
  }

  const isParticipant = penca.participants.some(id => id.equals(userId));
  if (!isParticipant) {
    penca.participants.push(userId);
    await penca.save();
  }

  await User.updateOne({ _id: userId }, { $addToSet: { pencas: penca._id } });
  return penca;
}

module.exports = {
  ensureWorldCupPenca,
  ensureUserInPenca
};
