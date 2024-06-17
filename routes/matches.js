const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const fetch = require('node-fetch');
const { isAdmin } = require('../middleware/auth');

// Ruta para obtener todos los partidos
router.get('/', async (req, res) => {
    try {
        const matches = await Match.find();
        res.json(matches);
    } catch (err) {
        console.error('Error retrieving matches', err);
        res.status(500).json({ error: 'Error retrieving matches' });
    }
});

// Ruta para actualizar un resultado de partido (solo admin)
router.post('/update', isAdmin, async (req, res) => {
    const { result1, result2 } = req.body;
    try {
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        match.result1 = result1;
        match.result2 = result2;
        await match.save();
        res.json({ success: true });
        // Recalcular puntaje de todos los usuarios
        await fetch('/ranking/recalculate', { method: 'POST' });
    } catch (err) {
        console.error('Error updating match', err);
        res.status(500).json({ error: 'Error al enviar el resultado' });
    }
});

module.exports = router;
