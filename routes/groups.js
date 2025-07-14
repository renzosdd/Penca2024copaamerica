const express = require('express');
const router = express.Router();
const { calculateGroupStandings } = require('../utils/bracket');


router.get('/:competition', async (req, res) => {
  try {
    const raw = await calculateGroupStandings(req.params.competition);
    const standings = Object.entries(raw).map(([group, teams]) => ({ group, teams }));
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving group standings' });
  }
});

module.exports = { router, calculateGroupStandings };
