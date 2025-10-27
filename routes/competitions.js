const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const { getOrLoad } = require('../utils/matchCache');

router.get('/:competition/matches', async (req, res) => {
  const competition = req.params.competition;
  try {
    const matches = await getOrLoad(competition, () =>
      Match.find({ competition })
        .select(
          'team1 team2 competition date time kickoff group_name series venue result1 result2 order originalDate originalTime originalTimezone'
        )
        .sort({ order: 1, kickoff: 1, date: 1, time: 1 })
        .lean()
    );
    res.json(matches);
  } catch (error) {
    console.error('Error fetching competition matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
