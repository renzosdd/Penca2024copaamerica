const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Match = require('../models/Match'); // Importar el modelo de partidos
const Penca = require('../models/Penca');
const { getMessage } = require('../utils/messages');
const { recordAudit } = require('../utils/audit');
const rankingCache = require('../utils/rankingCache');

const DEBUG = process.env.DEBUG === 'true';
function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

router.get('/', async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: getMessage('UNAUTHORIZED', req.lang) });
        }
        const predictions = await Prediction.find({ userId: user._id })
            .select('matchId pencaId result1 result2 username')
            .lean();
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ error: getMessage('PREDICTIONS_FETCH_ERROR', req.lang) });
    }
});

router.post('/', async (req, res) => {
    try {
        const { matchId, result1, result2, pencaId } = req.body;
        const r1 = Number(result1);
        const r2 = Number(result2);
        if (Number.isNaN(r1) || Number.isNaN(r2)) {
            return res.status(400).json({ error: getMessage('INVALID_RESULTS', req.lang) });
        }
        if (r1 < 0 || r2 < 0) {
            return res.status(400).json({ error: getMessage('NEGATIVE_GOALS', req.lang) });
        }
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: getMessage('UNAUTHORIZED', req.lang) });
        }

        if (!pencaId) {
            return res.status(400).json({ error: getMessage('PENCA_ID_REQUIRED', req.lang) });
        }

        const penca = await Penca.findById(pencaId);
        if (!penca || !penca.participants.some(id => id.equals(user._id))) {
            return res.status(403).json({ error: getMessage('NOT_IN_PENCA', req.lang) });
        }

        // Obtener información del partido
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: getMessage('MATCH_NOT_FOUND', req.lang) });
        }

        // Verificar si falta menos de media hora para el partido
        const currentTime = new Date();
        const matchDateTime = new Date(`${match.date}T${match.time}:00`); // Combinar fecha y hora

        debugLog(`currentTime: ${currentTime}`);
        debugLog(`matchDateTime: ${matchDateTime}`);

        const timeDifference = (matchDateTime - currentTime) / 60000; // Diferencia en minutos

        debugLog(`timeDifference: ${timeDifference} minutos`);

        if (timeDifference < 30) {
            return res.status(400).json({ error: getMessage('PREDICTION_TIME', req.lang) });
        }

        let prediction = await Prediction.findOne({ userId: user._id, matchId, pencaId });
        if (prediction) {
            prediction.result1 = r1;
            prediction.result2 = r2;
        } else {
            prediction = new Prediction({
                userId: user._id,
                matchId,
                pencaId,
                result1: r1,
                result2: r2,
                username: user.username
            });
        }
        await prediction.save();

        await rankingCache.invalidate({ pencaId, competition: match.competition });

        await recordAudit({
            action: 'prediction:upsert',
            entityType: 'prediction',
            entityId: prediction._id,
            actor: user._id,
            metadata: { pencaId, matchId }
        });
        res.json({ message: getMessage('PREDICTION_SAVED', req.lang) });
    } catch (err) {
        console.error('Error al guardar la predicción:', err);
        res.status(500).json({ error: getMessage('PREDICTION_SAVE_ERROR', req.lang) });
    }
});

module.exports = router;
