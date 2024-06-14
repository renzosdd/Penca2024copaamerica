const express = require('express');
const router = express.Router();
const connectToDatabase = require('../database');

router.get('/', async (req, res) => {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    try {
        const leaderboard = await usersCollection.find({ isAdmin: false }).sort({ points: -1 }).toArray();
        res.json(leaderboard);
    } catch (err) {
        console.error('Error fetching leaderboard:', err.message);
        res.status(500).json({ error: 'Error fetching leaderboard' });
    }
});

module.exports = router;
