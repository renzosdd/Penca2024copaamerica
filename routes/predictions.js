const express = require('express');
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const router = express.Router();

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'user') {
        return next();
    }
    res.status(403).json({ error: 'Forbidden' });
}

// Obtener todas las predicciones
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const predictions = await Prediction.find();
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Enviar o actualizar una predicción
router.post('/', isAuthenticated, async (req, res) => {
    const { matchId, result1, result2 } = req.body;

    if (isNaN(parseInt(result1)) || isNaN(parseInt(result2))) {
        return res.status(400).json({ error: 'Results must be integers' });
    }

    try {
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const matchTime = new Date(`${match.date}T${match.time}`);
        const oneHourBeforeMatch = new Date(matchTime.getTime() - 60 * 60 * 1000);
        const currentTime = new Date();

        if (currentTime > oneHourBeforeMatch) {
            return res.status(400).json({ error: 'Cannot change prediction within one hour of the match start' });
        }

        const existingPrediction = await Prediction.findOne({ username: req.session.user.username, matchId });
        if (existingPrediction) {
            existingPrediction.result1 = parseInt(result1);
            existingPrediction.result2 = parseInt(result2);
            await existingPrediction.save();
            return res.json(existingPrediction);
        }

        const prediction = new Prediction({
            username: req.session.user.username,
            matchId,
            result1: parseInt(result1),
            result2: parseInt(result2)
        });
        await prediction.save();
        res.json(prediction);
    } catch (err) {
        console.error('Error al guardar la predicción:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
