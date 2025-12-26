const Match = require('../models/Match');
const { fetchEventsWithThrottle } = require('./sportsDb');
const { updateEliminationMatches } = require('../utils/bracket');
const Competition = require('../models/Competition');
const rankingCache = require('../utils/rankingCache');

function parseScore(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function updateResults(competition) {
  const comp = await Competition.findOne({ name: competition });
  const { events, skipped } = await fetchEventsWithThrottle(
    'updateResults',
    competition,
    comp?.apiLeagueId,
    comp?.apiSeason
  );
  if (skipped) {
    return { skipped: true };
  }
  for (const event of events) {
    const id = String(event.idEvent || '');
    const result1 = parseScore(event.intHomeScore);
    const result2 = parseScore(event.intAwayScore);
    await Match.updateOne({ series: id, competition }, { result1, result2 });
  }

  await updateEliminationMatches(competition);
  await rankingCache.invalidate({ competition });

  return { updated: events.length };
}

module.exports = updateResults;
