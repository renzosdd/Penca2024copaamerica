const express = require('express');
const router = express.Router();
const Penca = require('../models/Penca');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');
const { DEFAULT_COMPETITION, MAX_PENCAS_PER_USER } = require('../config');
const { getMessage } = require('../utils/messages');
const { sanitizeScoring, DEFAULT_SCORING } = require('../utils/scoring');
const { recordAudit } = require('../utils/audit');
const { notifyOwnerJoinRequest, notifyPlayerApproval } = require('../utils/emailService');
const rankingCache = require('../utils/rankingCache');

const ALLOWED_MODES = new Set(['group_stage_knockout', 'league', 'knockout', 'custom']);
const rulesFrom = scoring => Penca.rulesText(scoring || DEFAULT_SCORING);

// Listar todas las pencas (nombre y código)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const filter = {};
    if (req.query.competition) filter.competition = req.query.competition;
    if (req.query.public === 'true') filter.isPublic = true;
    const pencas = await Penca.find(filter).select('name code competition');
    res.json(pencas);
  } catch (err) {
    console.error('list pencas error', err);
    res.status(500).json({ error: getMessage('ERROR_LISTING_PENCAS', req.lang) });
  }
});

router.get('/lookup/:code', isAuthenticated, async (req, res) => {
  const { code } = req.params;
  try {
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: getMessage('PENCA_CODE_REQUIRED', req.lang) });
    }

    const penca = await Penca.findOne({ code: code.trim().toUpperCase() })
      .select('name code competition owner isPublic participantLimit participants')
      .populate('owner', 'username name surname email')
      .lean();

    if (!penca) {
      return res.status(404).json({ error: getMessage('PENCA_NOT_FOUND', req.lang) });
    }

    const owner = penca.owner || {};
    const ownerFullName = [owner.name, owner.surname].filter(Boolean).join(' ').trim();
    const participants = Array.isArray(penca.participants) ? penca.participants : [];

    res.json({
      name: penca.name,
      competition: penca.competition,
      owner: {
        username: owner.username || '',
        name: ownerFullName || owner.username || ''
      },
      isPublic: Boolean(penca.isPublic),
      participantLimit: penca.participantLimit || null,
      participantsCount: participants.length
    });
  } catch (err) {
    console.error('lookup penca error', err);
    res.status(500).json({ error: getMessage('ERROR_GETTING_PENCA', req.lang) });
  }
});

// Pencas del owner logueado
router.get('/mine', isAuthenticated, async (req, res) => {
  try {
    const filter = { owner: req.session.user._id };
    if (req.query.competition) {
      filter.competition = req.query.competition;
    }

    const pencas = await Penca.find(filter)
      .select('name code competition participants pendingRequests rules prizes isPublic fixture scoring')
      .populate('pendingRequests', 'username')
      .populate('participants', 'username');

    res.json(pencas);
  } catch (err) {
    console.error('mine pencas error', err);
    res.status(500).json({ error: getMessage('ERROR_GETTING_PENCAS', req.lang) });
  }
});


// Crear una penca
router.post('/', isAuthenticated, async (req, res) => {
  const { name, participantLimit, competition, isPublic, scoring, tournamentMode, modeSettings } = req.body;
  const ownerId = req.session.user._id;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  try {
    const sc = sanitizeScoring(scoring);
    const requestedCompetition = typeof competition === 'string' ? competition.trim() : '';
    const pencaCompetition = requestedCompetition || DEFAULT_COMPETITION;
    if (!pencaCompetition) {
      return res.status(400).json({ error: getMessage('COMPETITION_REQUIRED', req.lang) });
    }
    const penca = new Penca({
      name,
      code,
      owner: ownerId,
      participantLimit,
      competition: pencaCompetition,
      isPublic: isPublic === true || isPublic === 'true',
      tournamentMode: ALLOWED_MODES.has(tournamentMode) ? tournamentMode : 'group_stage_knockout',
      modeSettings: modeSettings || {},
      scoring: sc,
      rules: req.body.rules || rulesFrom(sc),
      participants: []
    });
    await penca.save();
    await User.updateOne({ _id: ownerId }, {
      $addToSet: { ownedPencas: penca._id },
      $set: { role: 'owner' }
    });
    await recordAudit({
      action: 'penca:create',
      entityType: 'penca',
      entityId: penca._id,
      actor: ownerId,
      metadata: { tournamentMode: penca.tournamentMode, scoring: penca.scoring }
    });
    res.status(201).json({ pencaId: penca._id, code: penca.code });
  } catch (err) {
    console.error('create penca error', err);
    res.status(500).json({ error: getMessage('ERROR_CREATING_PENCA', req.lang) });
  }
});

// Detalle de una penca (solo owner)
router.get('/:pencaId', isAuthenticated, async (req, res) => {
  const { pencaId } = req.params;
  try {
    const penca = await Penca.findById(pencaId)
      .populate('participants', 'username')
      .populate('pendingRequests', 'username');
    if (!penca) return res.status(404).json({ error: getMessage('PENCA_NOT_FOUND', req.lang) });
    if (penca.owner.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: getMessage('FORBIDDEN', req.lang) });
    }
    res.json(penca);
  } catch (err) {
    console.error('get penca error', err);
    res.status(500).json({ error: getMessage('ERROR_GETTING_PENCA', req.lang) });
  }
});

// Actualizar una penca (owner)
router.put('/:pencaId', isAuthenticated, async (req, res) => {
  const { pencaId } = req.params;
  const { isPublic, rules, prizes, scoring, tournamentMode, modeSettings } = req.body;
  try {
    const penca = await Penca.findById(pencaId);
    if (!penca) return res.status(404).json({ error: getMessage('PENCA_NOT_FOUND', req.lang) });
    if (penca.owner.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: getMessage('FORBIDDEN', req.lang) });
    }
    if (isPublic !== undefined) penca.isPublic = isPublic === true || isPublic === 'true';
    if (scoring !== undefined) {
      penca.scoring = sanitizeScoring({ ...penca.scoring, ...scoring });
      if (rules === undefined) {
        penca.rules = rulesFrom(penca.scoring);
      }
    }
    if (rules !== undefined) penca.rules = rules;
    if (prizes !== undefined) penca.prizes = prizes;
    if (tournamentMode && ALLOWED_MODES.has(tournamentMode)) {
      penca.tournamentMode = tournamentMode;
    }
    if (modeSettings) {
      penca.modeSettings = modeSettings;
    }
    await penca.save();
    await recordAudit({
      action: 'penca:update',
      entityType: 'penca',
      entityId: penca._id,
      actor: req.session.user._id,
      metadata: { isPublic: penca.isPublic, scoring: penca.scoring, tournamentMode: penca.tournamentMode }
    });
    rankingCache.invalidate({ pencaId, competition: penca.competition });
    res.json({ message: getMessage('PENCA_UPDATED', req.lang) });
  } catch (err) {
    console.error('update penca error', err);
    res.status(500).json({ error: getMessage('ERROR_UPDATING_PENCA', req.lang) });
  }
});

// Solicitar unirse a una penca mediante el codigo
router.post('/join', isAuthenticated, async (req, res) => {
  const { code, competition } = req.body;
  const userId = req.session.user._id;
  const joined = req.session.user.pencas || [];
  try {
    if (req.session.user.role !== 'user') {
      return res.status(403).json({ error: getMessage('FORBIDDEN', req.lang) });
    }
    if (joined.length >= MAX_PENCAS_PER_USER) {
      return res.status(400).json({ error: `${getMessage('MAX_PENCAS_REACHED', req.lang)} (${MAX_PENCAS_PER_USER})` });
    }

    const query = { code };
    if (competition) query.competition = competition;

    const penca = await Penca.findOne(query);

    if (!penca) return res.status(404).json({ error: getMessage('PENCA_NOT_FOUND', req.lang) });

    if (
      penca.participants.some(id => id.equals(userId)) ||
      penca.pendingRequests.some(id => id.equals(userId))
    ) {
      return res.status(400).json({ error: getMessage('ALREADY_REQUESTED_OR_MEMBER', req.lang) });
    }
    if (penca.participantLimit && penca.participants.length >= penca.participantLimit) {
      return res.status(400).json({ error: getMessage('PENCA_IS_FULL', req.lang) });
    }
    penca.pendingRequests.push(userId);
    await penca.save();

    const [ownerUser, applicant] = await Promise.all([
      User.findById(penca.owner).select('email username name'),
      User.findById(userId).select('email username name')
    ]);

    notifyOwnerJoinRequest({ owner: ownerUser, penca, applicant }).catch(err =>
      console.error('notify owner join request error', err)
    );

    await recordAudit({
      action: 'penca:join-request',
      entityType: 'penca',
      entityId: penca._id,
      actor: userId,
      metadata: { code: penca.code }
    });
    res.json({ message: getMessage('REQUEST_SENT', req.lang) });
  } catch (err) {
    console.error('join penca error', err);
    res.status(500).json({ error: getMessage('ERROR_JOINING_PENCA', req.lang) });
  }
});

// Aprobar solicitud de participante
router.post('/approve/:pencaId/:userId', isAuthenticated, async (req, res) => {
  const { pencaId, userId } = req.params;
  const sessionUser = req.session.user;
  try {
    const penca = await Penca.findById(pencaId);
    if (!penca) return res.status(404).json({ error: getMessage('PENCA_NOT_FOUND', req.lang) });
    if (penca.owner.toString() !== sessionUser._id.toString()) {
      return res.status(403).json({ error: getMessage('FORBIDDEN', req.lang) });
    }
    penca.pendingRequests = penca.pendingRequests.filter(id => id.toString() !== userId);
    let approved = false;
    if (!penca.participants.some(id => id.equals(userId))) {
      penca.participants.push(userId);
      await User.updateOne({ _id: userId }, { $addToSet: { pencas: penca._id } });
      approved = true;
    }
    await penca.save();

    const player = await User.findById(userId).select('email username name');
    if (approved) {
      notifyPlayerApproval({ player, penca }).catch(err =>
        console.error('notify player approval error', err)
      );
    }

    if (approved) {
      rankingCache.invalidate({ pencaId, competition: penca.competition });
    }

    await recordAudit({
      action: 'penca:approve',
      entityType: 'penca',
      entityId: penca._id,
      actor: sessionUser._id,
      metadata: { approvedUser: userId }
    });
    res.json({ message: getMessage('PARTICIPANT_APPROVED', req.lang) });
  } catch (err) {
    console.error('approve participant error', err);
    res.status(500).json({ error: getMessage('ERROR_APPROVING_PARTICIPANT', req.lang) });
  }
});

// Eliminar participante
router.delete('/participant/:pencaId/:userId', isAuthenticated, async (req, res) => {
  const { pencaId, userId } = req.params;
  const sessionUser = req.session.user;
  try {
    const penca = await Penca.findById(pencaId);
    if (!penca) return res.status(404).json({ error: getMessage('PENCA_NOT_FOUND', req.lang) });
    if (penca.owner.toString() !== sessionUser._id.toString()) {
      return res.status(403).json({ error: getMessage('FORBIDDEN', req.lang) });
    }
    penca.participants = penca.participants.filter(id => id.toString() !== userId);
    penca.pendingRequests = penca.pendingRequests.filter(id => id.toString() !== userId);
    await penca.save();
    await User.updateOne({ _id: userId }, { $pull: { pencas: penca._id } });
    rankingCache.invalidate({ pencaId, competition: penca.competition });
    await recordAudit({
      action: 'penca:participant-remove',
      entityType: 'penca',
      entityId: penca._id,
      actor: sessionUser._id,
      metadata: { removedUser: userId }
    });
    res.json({ message: getMessage('PARTICIPANT_REMOVED', req.lang) });
  } catch (err) {
    console.error('remove participant error', err);
    res.status(500).json({ error: getMessage('ERROR_REMOVING_PARTICIPANT', req.lang) });
  }
});

module.exports = router;
