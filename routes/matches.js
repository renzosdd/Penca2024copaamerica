const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const { getOrLoad } = require('../utils/matchCache');
const { DEFAULT_COMPETITION } = require('../config');

router.get('/', async (req, res) => {
  try {
    const matches = await getOrLoad(DEFAULT_COMPETITION, () =>
      Match.find({ competition: DEFAULT_COMPETITION })
        .select(
          'team1 team2 team1Badge team2Badge competition date time kickoff group_name series venue result1 result2 order originalDate originalTime originalTimezone'
        )
        .sort({ order: 1, kickoff: 1, date: 1, time: 1 })
        .lean()
    );
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
