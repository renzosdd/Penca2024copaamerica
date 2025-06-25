const express = require('express');
const router = express.Router();
const Penca = require('../models/Penca');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

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
