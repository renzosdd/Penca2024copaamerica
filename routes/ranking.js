const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const Score = require('../models/Score');
const Penca = require('../models/Penca');
const { DEFAULT_COMPETITION } = require('../config');

// Función para calcular los puntajes
async function calculateScores(pencaId, competition) {
    let userFilter = { valid: true };
    let matchFilter = {};
    let predictionFilter = {};
    let penca;
    let scoring = { exact: 3, outcome: 1, goals: 1 };

    if (pencaId) {
        penca = await Penca.findById(pencaId).select('participants fixture competition scoring');
        if (!penca) {
            return [];
        }
        if (penca.scoring) {
            scoring = { ...scoring, ...penca.scoring };
        }
        userFilter._id = { $in: penca.participants };
        predictionFilter.pencaId = pencaId;

        if (Array.isArray(penca.fixture) && penca.fixture.length > 0) {
            matchFilter._id = { $in: penca.fixture };
            predictionFilter.matchId = { $in: penca.fixture };
        } else if (penca.competition) {
            matchFilter.competition = penca.competition;
        }
    }

    if (competition && !pencaId) {
        matchFilter.competition = competition;
    }

    const users = await User.find(userFilter);
    const matches = await Match.find(matchFilter);

    if (matchFilter._id || matchFilter.competition) {
        const matchIds = matches.map(m => m._id);
        if (!predictionFilter.matchId) {
            predictionFilter.matchId = { $in: matchIds };
        }
    }

    const predictions = await Prediction.find(predictionFilter);

    let scores = [];

    for (const user of users) {
        let userScore = 0;
        const userPredictions = predictions.filter(prediction => prediction.userId.toString() === user._id.toString());

        for (const prediction of userPredictions) {
            const match = matches.find(m => m._id.toString() === prediction.matchId.toString());
            if (match && match.result1 !== undefined && match.result2 !== undefined) {
                if (prediction.result1 === match.result1 && prediction.result2 === match.result2) {
                    userScore += scoring.exact; // Resultado exacto
                } else if (
                    (prediction.result1 > prediction.result2 && match.result1 > match.result2) ||
                    (prediction.result1 < prediction.result2 && match.result1 < match.result2) ||
                    (prediction.result1 === prediction.result2 && match.result1 === match.result2)
                ) {
                    userScore += scoring.outcome; // Indicó resultado
                }
                if (prediction.result1 === match.result1 || prediction.result2 === match.result2) {
                    userScore += scoring.goals; // Adivinó goles de un equipo
                }
            }
        }

        // Agregamos la referencia del avatar
        const avatarPath = user.avatar ? '/avatar/' + user.username : '/images/avatar.webp';

        scores.push({
            userId: user._id,
            username: user.username,
            avatar: avatarPath,
            avatarContentType: user.avatarContentType,
            score: userScore
        });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores;
}

// Endpoint para obtener el ranking
router.get('/', async (req, res) => {
    try {
        const { pencaId, competition } = req.query;
        const scores = await calculateScores(pencaId, competition);
        res.json(scores);
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        res.status(500).json({ error: 'Error al obtener el ranking' });
    }
});

// Ranking por competencia (sin especificar penca)
router.get('/competition/:competition', async (req, res) => {
    try {
        const scores = await calculateScores(null, req.params.competition);
        res.json(scores);
    } catch (err) {
        console.error('Error al obtener el ranking por competencia:', err);
        res.status(500).json({ error: 'Error al obtener el ranking' });
    }
});

// Endpoint para recalcular los puntajes
router.post('/recalculate', async (req, res) => {
    try {
        const { pencaId, competition } = req.query;
        const scores = await calculateScores(pencaId, competition);
        const compName = competition || DEFAULT_COMPETITION;
        for (let score of scores) {
            await Score.updateOne(
                { userId: score.userId, competition: compName },
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
