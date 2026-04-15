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

async function resolveQuery(query, fields) {
    if (query && typeof query.select === 'function') {
        const selected = query.select(fields);
        return typeof selected.lean === 'function' ? selected.lean() : selected;
    }
    return query;
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

    const matches = await resolveQuery(
        Match.find(matchFilter),
        'result1 result2 competition'
    ) || [];

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
    const predictions = completedMatchIds.length
        ? (await resolveQuery(
            Prediction.find({ ...predictionFilter, matchId: { $in: completedMatchIds } }),
            'userId matchId result1 result2 pencaId'
        ) || [])
        : [];

    let userFilter = {};
    const participantIds = Array.isArray(penca.participants) ? penca.participants : [];
    const participantIdSet = new Set(participantIds.map(id => id?.toString()).filter(Boolean));
    if (participantIds.length) {
        userFilter._id = { $in: participantIds };
    } else {
        const participantSet = new Set(predictions.map(prediction => prediction.userId.toString()));
        if (participantSet.size) {
            userFilter._id = { $in: Array.from(participantSet) };
        }
    }

    if (premiumOnly) {
        const criteria = premiumCriteria();
        userFilter = Object.keys(userFilter).length ? { $and: [userFilter, criteria] } : criteria;
    }

    userFilter.role = 'user';
    userFilter.valid = true;

    const queriedUsers = await resolveQuery(
        User.find(userFilter),
        'username displayName avatar avatarUrl avatarContentType'
    ) || [];
    const users = participantIdSet.size
        ? queriedUsers.filter(user => participantIdSet.has(user._id?.toString()))
        : queriedUsers;

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
        let exactHits = 0;
        let goalError = 0;

        for (const prediction of userPredictions) {
            const match = matchesById.get(prediction.matchId.toString());
            if (!match || match.result1 == null || match.result2 == null) {
                continue;
            }
            userScore += calculatePoints({ prediction, match, scoring });
            if (prediction.result1 === match.result1 && prediction.result2 === match.result2) {
                exactHits += 1;
            }
            goalError += Math.abs((prediction.result1 ?? 0) - match.result1) + Math.abs((prediction.result2 ?? 0) - match.result2);
        }

        const avatarPath = user.avatar ? '/avatar/' + user.username : (user.avatarUrl || '/images/avatar.webp');
        const label = user.displayName || user.username;

        return {
            userId: user._id,
            username: user.username,
            displayName: label,
            avatar: avatarPath,
            avatarContentType: user.avatarContentType,
            score: userScore,
            exactHits,
            goalError
        };
    });

    scores.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
        if (a.goalError !== b.goalError) return a.goalError - b.goalError;
        return String(a.displayName).localeCompare(String(b.displayName), 'es');
    });
    return scores;
}

// Endpoint para obtener el ranking
router.get('/', async (req, res) => {
    try {
        const premiumOnly = req.query.premium === 'true';
        const variant = premiumOnly ? 'premium' : 'all';
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
        const paginate = (scores) => {
            const start = (page - 1) * limit;
            return {
                items: scores.slice(start, start + limit),
                total: scores.length,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(scores.length / limit))
            };
        };
        const penca = await ensureWorldCupPenca();
        const cached = await rankingCache.get(penca?._id, DEFAULT_COMPETITION, variant);
        if (Array.isArray(cached) && cached.length > 0) {
            return res.json(paginate(cached));
        }
        const scores = await calculateScores(penca, { premiumOnly });
        await rankingCache.set(penca?._id, DEFAULT_COMPETITION, variant, scores);
        res.json(paginate(scores));
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        res.status(500).json({ error: getMessage('RANKING_ERROR', req.lang) });
    }
});

module.exports = router;
