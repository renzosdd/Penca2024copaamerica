const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Match = require('../models/Match'); // Importar el modelo de partidos

router.get('/', async (req, res) => {
    try {
        const predictions = await Prediction.find();
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving predictions' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { matchId, result1, result2 } = req.body;
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Obtener información del partido
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        // Verificar si falta menos de media hora para el partido
        const currentTime = new Date();
        const matchDateTime = new Date(`${match.date}T${match.time}:00`); // Combinar fecha y hora
        const timeDifference = (matchDateTime - currentTime) / 60000; // Diferencia en minutos

        if (timeDifference < 30) {
            return res.status(400).json({ error: 'Cannot submit prediction within 30 minutes of match start' });
        }

        let prediction = await Prediction.findOne({ userId: user._id, matchId });
        if (prediction) {
            prediction.result1 = result1;
            prediction.result2 = result2;
        } else {
            prediction = new Prediction({
                userId: user._id,
                matchId,
                result1,
                result2,
                username: user.username
            });
        }
        await prediction.save();
        res.json({ message: 'Prediction saved' });
    } catch (err) {
        res.status(500).json({ error: 'Error saving prediction' });
    }
});

module.exports = router;
