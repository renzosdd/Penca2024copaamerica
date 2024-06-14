const express = require('express');
const router = express.Router();
const db = require('../database');

// Endpoint para obtener las predicciones del usuario
router.get('/:userId', (req, res) => {
    const userId = req.params.userId;
    db.all('SELECT * FROM predictions WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching predictions' });
        } else {
            res.json({ predictions: rows });
        }
    });
});

module.exports = router; // Exportar el router correctamente
