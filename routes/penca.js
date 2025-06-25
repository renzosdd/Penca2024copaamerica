const express = require('express');
const router = express.Router();
const Penca = require('../models/Penca');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

// Listar todas las pencas (nombre y código)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const pencas = await Penca.find().select('name code');
    res.json(pencas);
  } catch (err) {
    console.error('list pencas error', err);
    res.status(500).json({ error: 'Error listing pencas' });
  }
});

// Pencas del owner logueado
router.get('/mine', isAuthenticated, async (req, res) => {
  try {
    const pencas = await Penca.find({ owner: req.session.user._id })
      .select('name code participants pendingRequests')
      .populate('pendingRequests', 'username');
    res.json(pencas);
  } catch (err) {
    console.error('mine pencas error', err);
    res.status(500).json({ error: 'Error getting pencas' });
  }
});

// Detalle de una penca (solo owner)
router.get('/:pencaId', isAuthenticated, async (req, res) => {
  const { pencaId } = req.params;
  try {
    const penca = await Penca.findById(pencaId)
      .populate('participants', 'username')
      .populate('pendingRequests', 'username');
    if (!penca) return res.status(404).json({ error: 'Penca not found' });
    if (penca.owner.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(penca);
  } catch (err) {
    console.error('get penca error', err);
    res.status(500).json({ error: 'Error getting penca' });
  }
});

// Solicitar unirse a una penca mediante el codigo
router.post('/join', isAuthenticated, async (req, res) => {
  const { code } = req.body;
  const userId = req.session.user._id;
  try {
    const penca = await Penca.findOne({ code });
    if (!penca) return res.status(404).json({ error: 'Penca not found' });

    if (penca.participants.includes(userId) || penca.pendingRequests.includes(userId)) {
      return res.status(400).json({ error: 'Already requested or member' });
    }
    if (penca.participantLimit && penca.participants.length >= penca.participantLimit) {
      return res.status(400).json({ error: 'Penca is full' });
    }
    penca.pendingRequests.push(userId);
    await penca.save();
    res.json({ message: 'Request sent' });
  } catch (err) {
    console.error('join penca error', err);
    res.status(500).json({ error: 'Error joining penca' });
  }
});

// Aprobar solicitud de participante
router.post('/approve/:pencaId/:userId', isAuthenticated, async (req, res) => {
  const { pencaId, userId } = req.params;
  const sessionUser = req.session.user;
  try {
    const penca = await Penca.findById(pencaId);
    if (!penca) return res.status(404).json({ error: 'Penca not found' });
    if (penca.owner.toString() !== sessionUser._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    penca.pendingRequests = penca.pendingRequests.filter(id => id.toString() !== userId);
    if (!penca.participants.includes(userId)) {
      penca.participants.push(userId);
      await User.updateOne({ _id: userId }, { $addToSet: { pencas: penca._id } });
    }
    await penca.save();
    res.json({ message: 'Participant approved' });
  } catch (err) {
    console.error('approve participant error', err);
    res.status(500).json({ error: 'Error approving participant' });
  }
});

// Eliminar participante
router.delete('/participant/:pencaId/:userId', isAuthenticated, async (req, res) => {
  const { pencaId, userId } = req.params;
  const sessionUser = req.session.user;
  try {
    const penca = await Penca.findById(pencaId);
    if (!penca) return res.status(404).json({ error: 'Penca not found' });
    if (penca.owner.toString() !== sessionUser._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    penca.participants = penca.participants.filter(id => id.toString() !== userId);
    penca.pendingRequests = penca.pendingRequests.filter(id => id.toString() !== userId);
    await penca.save();
    await User.updateOne({ _id: userId }, { $pull: { pencas: penca._id } });
    res.json({ message: 'Participant removed' });
  } catch (err) {
    console.error('remove participant error', err);
    res.status(500).json({ error: 'Error removing participant' });
  }
});

module.exports = router;
