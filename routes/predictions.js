const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Match = require('../models/Match'); // Importar el modelo de partidos
const Penca = require('../models/Penca');

router.get('/', async (req, res) => {
    try {
        const predictions = await Prediction.find();
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ error: 'Error al recuperar las predicciones' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { matchId, result1, result2, pencaId } = req.body;
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        if (!pencaId) {
            return res.status(400).json({ error: 'pencaId requerido' });
        }

        const penca = await Penca.findById(pencaId);
        if (!penca || !penca.participants.includes(user._id)) {
            return res.status(403).json({ error: 'No pertenece a la penca' });
        }

        // Obtener información del partido
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }

        // Verificar si falta menos de media hora para el partido
        const currentTime = new Date();
        const matchDateTime = new Date(`${match.date}T${match.time}:00`); // Combinar fecha y hora

        console.log(`currentTime: ${currentTime}`);
        console.log(`matchDateTime: ${matchDateTime}`);

        const timeDifference = (matchDateTime - currentTime) / 60000; // Diferencia en minutos

        console.log(`timeDifference: ${timeDifference} minutos`);

        if (timeDifference < 30) {
            return res.status(400).json({ error: 'No se puede enviar la predicción dentro de los 30 minutos previos al inicio del partido' });
        }

        let prediction = await Prediction.findOne({ userId: user._id, matchId, pencaId });
        if (prediction) {
            prediction.result1 = result1;
            prediction.result2 = result2;
        } else {
            prediction = new Prediction({
                userId: user._id,
                matchId,
                pencaId,
                result1,
                result2,
                username: user.username
            });
        }
        await prediction.save();
        res.json({ message: 'Predicción guardada' });
    } catch (err) {
        console.error('Error al guardar la predicción:', err);
        res.status(500).json({ error: 'Error al guardar la predicción' });
    }
});

module.exports = router;
