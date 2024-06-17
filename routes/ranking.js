const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');

router.get('/', async (req, res) => {
    try {
        const users = await User.find({ valid: true }).select('username').lean();
        const scores = await Score.find({}).lean();

        const ranking = users.map(user => {
            const userScore = scores.find(score => score.userId.toString() === user._id.toString());
            return {
                username: user.username,
                score: userScore ? userScore.points : 0
            };
        }).sort((a, b) => b.score - a.score);

        res.json(ranking);
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        res.status(500).json({ error: 'Error al obtener el ranking' });
    }
});

router.post('/recalculate', async (req, res) => {
    try {
        const users = await User.find({ valid: true }).select('_id').lean();
        const matches = await Match.find({}).lean();

        for (const user of users) {
            const predictions = await Prediction.find({ userId: user._id }).lean();
            let totalPoints = 0;

            predictions.forEach(prediction => {
                const match = matches.find(match => match._id.toString() === prediction.matchId.toString());
                if (match) {
                    if (match.result1 === prediction.result1 && match.result2 === prediction.result2) {
                        totalPoints += 3; // 3 puntos por acertar el resultado exacto
                    } else if ((match.result1 > match.result2 && prediction.result1 > prediction.result2) ||
                               (match.result1 < match.result2 && prediction.result1 < prediction.result2) ||
                               (match.result1 === match.result2 && prediction.result1 === prediction.result2)) {
                        totalPoints += 1; // 1 punto por acertar el resultado (ganador o empate)
                    }
                    if (match.result1 === prediction.result1 || match.result2 === prediction.result2) {
                        totalPoints += 1; // 1 punto adicional por acertar la cantidad de goles de uno de los equipos
                    }
                }
            });

            await Score.updateOne({ userId: user._id }, { points: totalPoints }, { upsert: true });
        }

        res.json({ message: 'Ranking recalculado' });
    } catch (err) {
        console.error('Error al recalcular el ranking:', err);
        res.status(500).json({ error: 'Error al recalcular el ranking' });
    }
});

module.exports = router;
