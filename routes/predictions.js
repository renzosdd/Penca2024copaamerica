const express = require('express');
const path = require('path');

module.exports = (db) => {
    const router = express.Router();

    // Ruta para servir la página de predicciones
    router.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/platform.html'));
    });

    // Ruta para enviar las predicciones de los usuarios
    router.post('/submit', async (req, res) => {
        const predictionsCollection = db.collection('predictions');
        const { matchId, predictedScore } = req.body;
        try {
            await predictionsCollection.updateOne(
                { userId: req.session.user._id, matchId: matchId },
                { $set: { userId: req.session.user._id, matchId: matchId, predictedScore: predictedScore } },
                { upsert: true }
            );
            res.send('Prediction submitted');
        } catch (err) {
            res.status(500).send('Error');
        }
    });

    // Ruta para obtener el ranking de los usuarios
    router.get('/ranking', async (req, res) => {
        const usersCollection = db.collection('users');
        const predictionsCollection = db.collection('predictions');
        const matchesCollection = db.collection('matches');
        try {
            const users = await usersCollection.find().toArray();
            const matches = await matchesCollection.find().toArray();
            const predictions = await predictionsCollection.find().toArray();

            let userPoints = {};
            users.forEach(user => {
                userPoints[user._id] = { username: user.username, points: 0 };
            });

            predictions.forEach(prediction => {
                const match = matches.find(m => m.matchId === prediction.matchId);
                if (match && match.result) {
                    const predicted = prediction.predictedScore.split('-').map(Number);
                    const actual = match.result.split('-').map(Number);

                    if (predicted[0] === actual[0] && predicted[1] === actual[1]) {
                        userPoints[prediction.userId].points += 3;
                    } else if (
                        (predicted[0] > predicted[1] && actual[0] > actual[1]) ||
                        (predicted[0] < predicted[1] && actual[0] < actual[1]) ||
                        (predicted[0] === predicted[1] && actual[0] === actual[1])
                    ) {
                        userPoints[prediction.userId].points += 1;
                    }

                    if (predicted[0] === actual[0] || predicted[1] === actual[1]) {
                        userPoints[prediction.userId].points += 1;
                    }
                }
            });

            let ranking = Object.values(userPoints).sort((a, b) => b.points - a.points);

            res.json(ranking);
        } catch (err) {
            res.status(500).send('Error');
        }
    });

    return router;
};
