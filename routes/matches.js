const express = require('express');
const router = express.Router();
const db = require('../database'); // Asegúrate de que la ruta es correcta

// Endpoint para obtener los partidos
router.get('/', (req, res) => {
    db.all('SELECT * FROM matches', (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching matches' });
        } else {
            res.json({ matches: rows });
        }
    });
});

module.exports = router;
