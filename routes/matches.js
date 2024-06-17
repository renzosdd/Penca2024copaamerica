const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const fetch = require('node-fetch');
const { isAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try {
        const matches = await Match.find();
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving matches' });
    }
});

router.post('/:id', isAdmin, async (req, res) => {
    try {
        const { result1, result2 } = req.body;
        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        match.result1 = result1;
        match.result2 = result2;
        await match.save();
        res.json({ message: 'Match result updated' });
        // Recalcular puntaje de todos los usuarios
        //await fetch('/ranking/recalculate', { method: 'POST' });
    } catch (err) {
        res.status(500).json({ error: 'Error updating match result' });
    }
});

module.exports = router;