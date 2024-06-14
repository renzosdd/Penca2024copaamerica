const express = require('express');
const router = express.Router();
const connectToDatabase = require('../database');

router.get('/:userId', async (req, res) => {
    const db = await connectToDatabase();
    const predictionsCollection = db.collection('predictions');
    const userId = req.params.userId;

    try {
        const predictions = await predictionsCollection.find({ user_id: userId }).toArray();
        res.json({ predictions });
    } catch (err) {
        console.error('Error fetching predictions:', err.message);
        res.status(500).json({ error: 'Error fetching predictions' });
    }
});

router.post('/', async (req, res) => {
    const db = await connectToDatabase();
    const predictionsCollection = db.collection('predictions');
    const { userId, matchId, goals_team1, goals_team2 } = req.body;

    try {
        await predictionsCollection.updateOne(
            { user_id: userId, match_id: matchId },
            { $set: { goals_team1, goals_team2 } },
            { upsert: true }
        );
        res.json({ message: 'Prediction saved successfully' });
    } catch (err) {
        console.error('Error saving prediction:', err.message);
        res.status(500).json({ error: 'Error saving prediction' });
    }
});

module.exports = router;
