const express = require('express');
const router = express.Router();
const db = require('../database');

// Endpoint para obtener el leaderboard
router.get('/', (req, res) => {
    db.all('SELECT username, firstName, lastName, points FROM users JOIN user_points ON users.id = user_points.user_id WHERE isAdmin = 0 ORDER BY points DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching leaderboard' });
        } else {
            res.json(rows);
        }
    });
});

module.exports = router; // Exportar el router correctamente
