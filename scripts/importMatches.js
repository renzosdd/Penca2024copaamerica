const Match = require('../models/Match');
const Competition = require('../models/Competition');
const { updateEliminationMatches } = require('../utils/bracket');
const rankingCache = require('../utils/rankingCache');
const { fetchEventsWithThrottle } = require('./sportsDb');

function normalizeText(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function buildVenue(event) {
  const venue = {
    country: normalizeText(event.strCountry),
    city: normalizeText(event.strCity),
    stadium: normalizeText(event.strVenue)
  };
  if (Object.values(venue).some(Boolean)) {
    return venue;
  }
  return undefined;
}

function parseKickoff(event, dateValue, timeValue) {
  if (event.strTimestamp) {
    const parsed = new Date(event.strTimestamp);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (dateValue && timeValue) {
    const parsed = new Date(`${dateValue}T${timeValue}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function buildMatchPayload(event, competition, order) {
  const dateValue = normalizeText(event.dateEvent);
  const timeValue = normalizeText(event.strTime);
  const kickoff = parseKickoff(event, dateValue, timeValue);
  const groupName = normalizeText(event.strGroup || event.strRound) || 'Otros';

  return {
    competition,
    team1: normalizeText(event.strHomeTeam),
    team2: normalizeText(event.strAwayTeam),
    date: dateValue,
    time: timeValue,
    kickoff,
    group_name: groupName,
    series: normalizeText(event.idEvent),
    venue: buildVenue(event),
    originalDate: dateValue,
    originalTime: timeValue,
    originalTimezone: normalizeText(event.strTimezone),
    order
  };
}

async function importMatches(competition, options = {}) {
  const comp = await Competition.findOne({ name: competition });
  const { events, skipped } = await fetchEventsWithThrottle(
    'importMatches',
    competition,
    comp?.apiLeagueId,
    comp?.apiSeason,
    options
  );
  if (skipped) {
    return { skipped: true };
  }

  let imported = 0;
  for (const [index, event] of events.entries()) {
    if (!event.idEvent) {
      continue;
    }
    const importId = `sportsdb:${event.idEvent}`;
    const payload = buildMatchPayload(event, competition, index);
    await Match.updateOne(
      { competition, importId },
      { $set: payload, $setOnInsert: { importId } },
      { upsert: true }
    );
    imported += 1;
  }

  await updateEliminationMatches(competition);
  await rankingCache.invalidate({ competition });

  return { imported };
}

module.exports = importMatches;
