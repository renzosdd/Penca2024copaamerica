const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const { DEFAULT_COMPETITION } = require('../config');
const { DEFAULT_SCORING, sanitizeScoring, calculatePoints } = require('../utils/scoring');
const { getMessage } = require('../utils/messages');
const rankingCache = require('../utils/rankingCache');
const { ensureWorldCupPenca } = require('../utils/worldcupPenca');

// Función para calcular los puntajes
function premiumCriteria() {
    const now = new Date();
    return {
        isPremium: true,
        $or: [{ premiumUntil: null }, { premiumUntil: { $gte: now } }]
    };
}

async function calculateScores(penca, { premiumOnly = false } = {}) {
    if (!penca) {
        return [];
    }

    const matchFilter = {};
    const predictionFilter = { pencaId: penca._id };
    const scoring = sanitizeScoring(penca.scoring || DEFAULT_SCORING);

    if (Array.isArray(penca.fixture) && penca.fixture.length > 0) {
        matchFilter._id = { $in: penca.fixture };
    } else if (penca.competition) {
        matchFilter.competition = penca.competition;
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
    if (!completedMatchIds.length) {
        return [];
    }

    predictionFilter.matchId = { $in: completedMatchIds };
    const predictions = await Prediction.find(predictionFilter)
        .select('userId matchId result1 result2 pencaId')
        .lean();

    if (!predictions.length) {
        return [];
    }

    let userFilter = {};
    const participantIds = Array.isArray(penca.participants) ? penca.participants : [];
    if (participantIds.length) {
        userFilter._id = { $in: participantIds };
    } else {
        const participantSet = new Set(predictions.map(prediction => prediction.userId.toString()));
        userFilter._id = { $in: Array.from(participantSet) };
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
        const premiumOnly = req.query.premium === 'true';
        const variant = premiumOnly ? 'premium' : 'all';
        const penca = await ensureWorldCupPenca();
        const cached = await rankingCache.get(penca?._id, DEFAULT_COMPETITION, variant);
        if (cached) {
            return res.json(cached);
        }
        const scores = await calculateScores(penca, { premiumOnly });
        await rankingCache.set(penca?._id, DEFAULT_COMPETITION, variant, scores);
        res.json(scores);
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        res.status(500).json({ error: getMessage('RANKING_ERROR', req.lang) });
    }
});

module.exports = router;
