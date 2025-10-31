const Match = require('../models/Match');
const { fetchFixturesWithThrottle } = require('./apiFootball');
const { updateEliminationMatches } = require('../utils/bracket');
const Competition = require('../models/Competition');
const rankingCache = require('../utils/rankingCache');

async function updateResults(competition) {
  const comp = await Competition.findOne({ name: competition });
  const { fixtures, skipped } = await fetchFixturesWithThrottle(
    'updateResults',
    competition,
    comp?.apiLeagueId,
    comp?.apiSeason
  );
  if (skipped) {
    return { skipped: true };
  }
  for (const f of fixtures) {
    const id = String(f.fixture?.id || '');
    const result1 = f.goals?.home ?? null;
    const result2 = f.goals?.away ?? null;
    await Match.updateOne({ series: id, competition }, { result1, result2 });
  }

  await updateEliminationMatches(competition);
  await rankingCache.invalidate({ competition });

  return { updated: fixtures.length };
}

module.exports = updateResults;
