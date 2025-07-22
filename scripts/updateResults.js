const Match = require('../models/Match');
const { fetchFixturesWithThrottle } = require('./apiFootball');
const { updateEliminationMatches } = require('../utils/bracket');

async function updateResults(competition) {
  const { fixtures, skipped } = await fetchFixturesWithThrottle('updateResults', competition);
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

  return { updated: fixtures.length };
}

module.exports = updateResults;
