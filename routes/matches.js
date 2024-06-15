const express = require('express');
const Match = require('../models/Match');
const router = express.Router();

// Middleware de autenticación
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.status(403).json({ error: 'Forbidden' });
}

// Middleware de autorización para admin
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Forbidden' });
}

// Obtener todos los partidos
router.get('/', async (req, res) => {
    try {
        const matches = await Match.find();
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Actualizar un partido (solo admin)
router.post('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { result1, result2 } = req.body;
    if (!Number.isInteger(result1) || !Number.isInteger(result2)) {
        return res.status(400).json({ error: 'Results must be integers' });
    }
    try {
        const match = await Match.findByIdAndUpdate(id, { result1, result2 }, { new: true });
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json(match);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
