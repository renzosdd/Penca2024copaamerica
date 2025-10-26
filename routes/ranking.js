const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const Score = require('../models/Score');
const Penca = require('../models/Penca');
const { DEFAULT_COMPETITION } = require('../config');
const { DEFAULT_SCORING, sanitizeScoring, calculatePoints } = require('../utils/scoring');
const { getMessage } = require('../utils/messages');

// Función para calcular los puntajes
async function calculateScores(pencaId, competition) {
    // Solo filtramos por participantes de la penca cuando sea necesario
    // No requerimos que los usuarios sean válidos aquí
    let userFilter = {};
    let matchFilter = {};
    let predictionFilter = {};
    let penca;
    let scoring = { ...DEFAULT_SCORING };

    if (pencaId) {
        penca = await Penca.findById(pencaId).select('participants fixture competition scoring');
        if (!penca) {
            return [];
        }
        if (penca.scoring) {
            scoring = sanitizeScoring(penca.scoring);
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
            if (match) {
                userScore += calculatePoints({ prediction, match, scoring });
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
        res.status(500).json({ error: getMessage('RANKING_ERROR', req.lang) });
    }
});

// Ranking por competencia (sin especificar penca)
router.get('/competition/:competition', async (req, res) => {
    try {
        const scores = await calculateScores(null, req.params.competition);
        res.json(scores);
    } catch (err) {
        console.error('Error al obtener el ranking por competencia:', err);
        res.status(500).json({ error: getMessage('RANKING_ERROR', req.lang) });
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
        res.json({ message: getMessage('SCORES_RECALCULATED', req.lang) });
    } catch (err) {
        console.error('Error al recalcular los puntajes:', err);
        res.status(500).json({ error: getMessage('SCORES_RECALC_ERROR', req.lang) });
    }
});

module.exports = router;
