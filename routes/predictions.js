const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const predictions = await Prediction.find();
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving predictions' });
    }
});

router.post('/', isAuthenticated, async (req, res) => {
    const { matchId, result1, result2 } = req.body;
    try {
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        const now = new Date();
        const matchDate = new Date(`${match.date}T${match.time}`);
        
        if (matchDate <= now) {
            return res.status(400).json({ error: 'Cannot edit prediction for a match that has already started or passed' });
        }
        
        const thirtyMinutesBefore = new Date(matchDate.getTime() - 30 * 60000);
        if (now >= thirtyMinutesBefore) {
            return res.status(400).json({ error: 'Cannot edit prediction within 30 minutes of match start' });
        }

        const prediction = await Prediction.findOneAndUpdate(
            { userId: req.session.user._id, matchId },
            { result1, result2 },
            { new: true, upsert: true }
        );
        res.json(prediction);
    } catch (err) {
        console.error('Error saving prediction', err);
        res.status(500).json({ error: 'Error saving prediction' });
    }
});

module.exports = router;
