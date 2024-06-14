const express = require('express');
const router = express.Router();
const db = require('../database'); // Asegúrate de que la ruta es correcta

// Endpoint para obtener el perfil de usuario
router.get('/', (req, res) => {
    const userId = req.user.id;
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching user' });
        } else {
            res.json({ user: row });
        }
    });
});

module.exports = router;
