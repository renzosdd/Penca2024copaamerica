const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const importMatches = require('../scripts/importMatches');
const { invalidate: invalidateMatchCache } = require('../utils/matchCache');
const { DEFAULT_COMPETITION } = require('../config');

const MATCH_LIST_FIELDS =
  'team1 team2 team1Badge team2Badge competition date time kickoff group_name series venue result1 result2 order originalDate originalTime originalTimezone';

function listMatchesFromDatabase() {
  return Match.find({ competition: DEFAULT_COMPETITION })
    .select(MATCH_LIST_FIELDS)
    .sort({ order: 1, kickoff: 1, date: 1, time: 1 })
    .lean();
}

router.get('/', async (req, res) => {
  try {
    await invalidateMatchCache(DEFAULT_COMPETITION).catch(error => {
      console.error('Error invalidating match cache before listing matches:', error);
    });
    let matches = await listMatchesFromDatabase();
    if (!matches.length && typeof importMatches.importFixture === 'function') {
      const result = await importMatches.importFixture(DEFAULT_COMPETITION, {
        skipBracketUpdate: true
      });
      if (result?.imported) {
        await invalidateMatchCache(DEFAULT_COMPETITION).catch(error => {
          console.error('Error invalidating match cache after fixture import:', error);
        });
        matches = await listMatchesFromDatabase();
      }
    }
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
