const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');

router.get('/', async (req, res) => {
    try {
        const predictions = await Prediction.find();
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving predictions' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { matchId, result1, result2 } = req.body;
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        let prediction = await Prediction.findOne({ userId: user._id, matchId });
        if (prediction) {
            prediction.result1 = result1;
            prediction.result2 = result2;
        } else {
            prediction = new Prediction({
                userId: user._id,
                matchId,
                result1,
                result2,
                username: user.username
            });
        }
        await prediction.save();
        res.json({ message: 'Prediction saved' });
    } catch (err) {
        res.status(500).json({ error: 'Error saving prediction' });
    }
});

module.exports = router;
