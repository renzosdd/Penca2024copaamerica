const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const matchSchema = new mongoose.Schema({
    date: String,
    time: String,
    team1: String,
    team2: String,
    competition: String,
    group_name: String,
    series: String,
    tournament: String,
    result1: Number,
    result2: Number
});

const Match = mongoose.model('Match', matchSchema);

router.get('/', async (req, res) => {
    try {
        const matches = await Match.find();
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/:id', async (req, res) => {
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
