const express = require('express');
const Prediction = require('../models/Prediction');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const predictions = await Prediction.find();
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/', async (req, res) => {
    const { matchId, result1, result2 } = req.body;
    if (!req.session.user || req.session.user.role !== 'user') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    if (!Number.isInteger(result1) || !Number.isInteger(result2)) {
        return res.status(400).json({ error: 'Results must be integers' });
    }
    try {
        const prediction = new Prediction({
            username: req.session.user.username,
            matchId,
            result1,
            result2
        });
        await prediction.save();
        res.json(prediction);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
