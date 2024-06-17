const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const Score = require('../models/Score');

// Función para calcular los puntajes
async function calculateScores() {
    const users = await User.find({ valid: true });
    const matches = await Match.find();
    const predictions = await Prediction.find();

    let scores = [];

    users.forEach(user => {
        let userScore = 0;
        predictions
            .filter(prediction => prediction.userId.toString() === user._id.toString())
            .forEach(prediction => {
                const match = matches.find(m => m._id.toString() === prediction.matchId.toString());
                if (match && match.result1 !== undefined && match.result2 !== undefined) {
                    if (prediction.result1 === match.result1 && prediction.result2 === match.result2) {
                        userScore += 3; // Resultado exacto
                    } else if (
                        (prediction.result1 > prediction.result2 && match.result1 > match.result2) ||
                        (prediction.result1 < prediction.result2 && match.result1 < match.result2) ||
                        (prediction.result1 === prediction.result2 && match.result1 === match.result2)
                    ) {
                        userScore += 1; // Indicó resultado
                    }
                    if (prediction.result1 === match.result1 || prediction.result2 === match.result2) {
                        userScore += 1; // Adivinó goles de un equipo
                    }
                }
            });

        scores.push({
            username: user.username,
            score: userScore
        });
    });

    return scores;
}

router.get('/', async (req, res) => {
    try {
        const scores = await calculateScores();
        res.json(scores);
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        res.status(500).json({ error: 'Error al obtener el ranking' });
    }
});

router.post('/recalculate', async (req, res) => {
    try {
        const scores = await calculateScores();
        for (let score of scores) {
            await Score.updateOne(
                { userId: score.userId, competition: 'Copa America 2024' },
                { $set: { score: score.score } },
                { upsert: true }
            );
        }
        res.json({ message: 'Puntajes recalculados correctamente' });
    } catch (err) {
        console.error('Error al recalcular los puntajes:', err);
        res.status(500).json({ error: 'Error al recalcular los puntajes' });
    }
});

module.exports = router;
