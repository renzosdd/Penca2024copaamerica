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

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function buildFallbackMatchQuery(competition, event) {
  const team1 = normalizeText(event.strHomeTeam);
  const team2 = normalizeText(event.strAwayTeam);
  const date = normalizeText(event.dateEvent);
  const time = normalizeText(event.strTime);

  if (!team1 || !team2 || !date) {
    return null;
  }

  const teamFilters = [
    { team1, team2 },
    { team1: team2, team2: team1 }
  ];

  const dateFilters = [];
  if (time) {
    dateFilters.push({ date, time });
    dateFilters.push({ originalDate: date, originalTime: time });
  }
  dateFilters.push({ date });
  dateFilters.push({ originalDate: date });

  return {
    competition,
    $and: [
      { $or: teamFilters },
      { $or: dateFilters }
    ]
  };
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
    const updatePayload = { $set: { result1, result2 } };
    const primaryResult = await Match.updateOne(
      { series: id, competition },
      updatePayload
    );
    if (primaryResult.matchedCount === 0) {
      const fallbackQuery = buildFallbackMatchQuery(competition, event);
      if (fallbackQuery) {
        const fallbackUpdate = { ...updatePayload };
        if (id) {
          fallbackUpdate.$set.series = id;
        }
        await Match.updateOne(fallbackQuery, fallbackUpdate);
      }
    }
  }

  await updateEliminationMatches(competition);
  await rankingCache.invalidate({ competition });

  return { updated: events.length };
}

module.exports = updateResults;
