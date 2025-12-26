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
const rankingCache = require('../utils/rankingCache');

// Función para calcular los puntajes
function premiumCriteria() {
    const now = new Date();
    return {
        isPremium: true,
        $or: [{ premiumUntil: null }, { premiumUntil: { $gte: now } }]
    };
}

async function calculateScores(pencaId, competition, { premiumOnly = false } = {}) {
    // Solo filtramos por participantes de la penca cuando sea necesario
    // No requerimos que los usuarios sean válidos aquí
    const matchFilter = {};
    const predictionFilter = {};
    let userFilter = {};
    let penca;
    let scoring = { ...DEFAULT_SCORING };
    let participantIds = null;

    if (pencaId) {
        penca = await Penca.findById(pencaId)
            .select('participants fixture competition scoring')
            .lean();
        if (!penca) {
            return [];
        }
        if (penca.scoring) {
            scoring = sanitizeScoring(penca.scoring);
        }

        if (Array.isArray(penca.participants) && penca.participants.length > 0) {
            participantIds = penca.participants.map(id => id.toString());
            userFilter._id = { $in: penca.participants };
        }

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

    const matches = await Match.find(matchFilter)
        .select('result1 result2 competition')
        .lean();

    const matchesById = new Map();
    const completedMatches = [];
    matches.forEach(match => {
        const key = match._id.toString();
        matchesById.set(key, match);
        if (match.result1 != null && match.result2 != null) {
            completedMatches.push(match);
        }
    });

    const completedMatchIds = completedMatches.map(match => match._id);
    const completedIdSet = new Set(completedMatches.map(match => match._id.toString()));

    let shouldLoadPredictions = completedMatches.length > 0;

    if (predictionFilter.matchId && predictionFilter.matchId.$in) {
        predictionFilter.matchId.$in = predictionFilter.matchId.$in.filter(id => completedIdSet.has(id.toString()));
        if (!predictionFilter.matchId.$in.length) {
            delete predictionFilter.matchId;
        }
    } else if (completedMatchIds.length) {
        predictionFilter.matchId = { $in: completedMatchIds };
    }

    if (!participantIds) {
        shouldLoadPredictions = true;
    }

    let predictions = [];
    if (shouldLoadPredictions) {
        predictions = await Prediction.find(predictionFilter)
            .select('userId matchId result1 result2 pencaId')
            .lean();
    }

    if (!participantIds && predictions.length) {
        const participantSet = new Set(predictions.map(prediction => prediction.userId.toString()));
        if (participantSet.size) {
            userFilter._id = { $in: Array.from(participantSet) };
        }
    }

    if (!participantIds && pencaId && !predictions.length) {
        // No tenemos participantes explícitos ni predicciones registradas
        return [];
    }

    if (premiumOnly) {
        const criteria = premiumCriteria();
        userFilter = Object.keys(userFilter).length ? { $and: [userFilter, criteria] } : criteria;
    }

    const users = await User.find(userFilter)
        .select('username avatar avatarContentType')
        .lean();

    if (!users.length) {
        return [];
    }

    const predictionsByUser = new Map();
    predictions.forEach(prediction => {
        const key = prediction.userId.toString();
        if (!predictionsByUser.has(key)) {
            predictionsByUser.set(key, []);
        }
        predictionsByUser.get(key).push(prediction);
    });

    const scores = users.map(user => {
        const userPredictions = predictionsByUser.get(user._id.toString()) || [];
        let userScore = 0;

        for (const prediction of userPredictions) {
            const match = matchesById.get(prediction.matchId.toString());
            if (!match || match.result1 == null || match.result2 == null) {
                continue;
            }
            userScore += calculatePoints({ prediction, match, scoring });
        }

        const avatarPath = user.avatar ? '/avatar/' + user.username : '/images/avatar.webp';

        return {
            userId: user._id,
            username: user.username,
            avatar: avatarPath,
            avatarContentType: user.avatarContentType,
            score: userScore
        };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores;
}

// Endpoint para obtener el ranking
router.get('/', async (req, res) => {
    try {
        const { pencaId, competition } = req.query;
        const premiumOnly = req.query.premium === 'true';
        const variant = premiumOnly ? 'premium' : 'all';
        const cached = await rankingCache.get(pencaId, competition, variant);
        if (cached) {
            return res.json(cached);
        }
        const scores = await calculateScores(pencaId, competition, { premiumOnly });
        await rankingCache.set(pencaId, competition, variant, scores);
        res.json(scores);
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        res.status(500).json({ error: getMessage('RANKING_ERROR', req.lang) });
    }
});

// Ranking por competencia (sin especificar penca)
router.get('/competition/:competition', async (req, res) => {
    try {
        const cacheKeyCompetition = req.params.competition;
        const premiumOnly = req.query.premium === 'true';
        const variant = premiumOnly ? 'premium' : 'all';
        const cached = await rankingCache.get(null, cacheKeyCompetition, variant);
        if (cached) {
            return res.json(cached);
        }
        const scores = await calculateScores(null, cacheKeyCompetition, { premiumOnly });
        await rankingCache.set(null, cacheKeyCompetition, variant, scores);
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
        if (!compName) {
            return res.status(400).json({ error: getMessage('COMPETITION_REQUIRED', req.lang) });
        }
        for (let score of scores) {
            await Score.updateOne(
                { userId: score.userId, competition: compName },
                { $set: { score: score.score } },
                { upsert: true }
            );
        }
        await rankingCache.invalidate({ competition: compName });
        res.json({ message: getMessage('SCORES_RECALCULATED', req.lang) });
    } catch (err) {
        console.error('Error al recalcular los puntajes:', err);
        res.status(500).json({ error: getMessage('SCORES_RECALC_ERROR', req.lang) });
    }
});

module.exports = router;
