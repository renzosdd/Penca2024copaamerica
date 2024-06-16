const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');

router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        const matches = await Match.find();
        const predictions = await Prediction.find();

        const ranking = users.map(user => {
            let score = 0;
            predictions.filter(pred => pred.userId.toString() === user._id.toString()).forEach(pred => {
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
            return { username: user.username, score };
        });

        ranking.sort((a, b) => b.score - a.score);

        res.json(ranking);
    } catch (error) {
        res.status(500).json({ error: 'Error al calcular el ranking' });
    }
});

module.exports = router;
