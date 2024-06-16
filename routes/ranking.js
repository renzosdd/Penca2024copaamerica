const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');
const Score = require('../models/Score');
const { isAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try {
        const scores = await Score.find().populate('userId', 'username');
        scores.sort((a, b) => b.score - a.score);
        const ranking = scores.map(score => ({
            username: score.userId.username,
            score: score.score
        }));
        res.json(ranking);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving ranking' });
    }
});

router.post('/recalculate', isAdmin, async (req, res) => {
    try {
        await recalculateScores();
        res.json({ message: 'Scores recalculated' });
    } catch (error) {
        res.status(500).json({ error: 'Error recalculating scores' });
    }
});

async function recalculateScores() {
    const users = await User.find();
    const matches = await Match.find();
    const predictions = await Prediction.find();

    for (const user of users) {
        let score = 0;
        const userPredictions = predictions.filter(pred => pred.userId.toString() === user._id.toString());
        userPredictions.forEach(pred => {
            const match = matches.find(match => match._id.toString() === pred.matchId.toString());
            if (match) {
                if (match.result1 === pred.result1 && match.result2 === pred.result2) {
                    score += 3;
                } else if ((match.result1 > match.result2 && pred.result1 > pred.result2) || 
                           (match.result1 < match.result2 && pred.result1 < pred.result2) || 
                           (match.result1 === match.result2 && pred.result1 === pred.result2)) {
                    score += 1;
                }
                if (match.result1 === pred.result1 || match.result2 === pred.result2) {
                    score += 1;
                }
            }
        });
        await Score.findOneAndUpdate({ userId: user._id, competition: 'Copa America 2024' }, { score }, { upsert: true });
    }
}

module.exports = router;
