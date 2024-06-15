const express = require('express');
const path = require('path');

module.exports = (db) => {
    const router = express.Router();

    // Ruta para servir la página de administración
    router.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/dashboard.html'));
    });

    // Ruta para actualizar los resultados de los partidos
    router.post('/update', async (req, res) => {
        const matchesCollection = db.collection('matches');
        const { matchId, result } = req.body;
        try {
            await matchesCollection.updateOne(
                { matchId: matchId },
                { $set: { result: result } },
                { upsert: true }
            );
            res.send('Results updated');
        } catch (err) {
            res.status(500).send('Error');
        }
    });

    return router;
};
