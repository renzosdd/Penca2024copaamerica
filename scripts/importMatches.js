const Match = require('../models/Match');
const Competition = require('../models/Competition');
const { updateEliminationMatches } = require('../utils/bracket');
const rankingCache = require('../utils/rankingCache');
const { fetchEventsWithThrottle } = require('./sportsDb');
const fs = require('fs/promises');
const path = require('path');

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

function parseFixtureKickoff(match, dateValue, timeValue) {
  if (match.kickoff) {
    const parsed = new Date(match.kickoff);
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
    team1Badge: normalizeText(event.strHomeTeamBadge),
    team2Badge: normalizeText(event.strAwayTeamBadge),
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

function buildMatchPayloadFromFixture(match, competition, order) {
  const dateValue = normalizeText(match?.originalKickoff?.date);
  const timeValue = normalizeText(match?.originalKickoff?.time);
  const kickoff = parseFixtureKickoff(match, dateValue, timeValue);
  const groupName = normalizeText(match?.group || match?.stage) || 'Otros';
  const venue = match?.venue
    ? {
        country: normalizeText(match.venue.country),
        city: normalizeText(match.venue.city),
        stadium: normalizeText(match.venue.stadium)
      }
    : undefined;
  const resolvedOrder = Number.isFinite(match?.order) ? match.order : order;

  return {
    competition,
    team1: normalizeText(match?.team1),
    team2: normalizeText(match?.team2),
    team1Badge: null,
    team2Badge: null,
    date: dateValue,
    time: timeValue,
    kickoff,
    group_name: groupName,
    series: normalizeText(match?.id),
    venue,
    originalDate: dateValue,
    originalTime: timeValue,
    originalTimezone: normalizeText(match?.originalKickoff?.timezone),
    order: resolvedOrder
  };
}

async function loadFixtureFromFile() {
  const candidates = [
    path.resolve(__dirname, '..', 'worldcup2026.json'),
    path.resolve(__dirname, '..', 'public', 'samples', 'worldcup2026-fixture.json')
  ];

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.matches)) {
        return parsed.matches;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return [];
}

async function upsertFixtureMatches(competition, fixtures) {
  let imported = 0;
  for (const [index, match] of fixtures.entries()) {
    const fixtureId = normalizeText(match?.id) || String(index);
    const importId = `fixture:${fixtureId}`;
    const payload = buildMatchPayloadFromFixture(match, competition, index);
    await Match.updateOne(
      { competition, importId },
      { $set: payload, $setOnInsert: { importId } },
      { upsert: true }
    );
    imported += 1;
  }
  return imported;
}

async function importFixtureMatches(competition) {
  const fixtures = await loadFixtureFromFile();
  if (!fixtures.length) {
    return { imported: 0, missing: true };
  }
  const imported = await upsertFixtureMatches(competition, fixtures);
  await updateEliminationMatches(competition);
  await rankingCache.invalidate({ competition });
  return { imported };
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

  const allowFixtureFallback =
    options.allowFixtureFallback ?? process.env.ALLOW_FIXTURE_FALLBACK === 'true';
  const preferFixture = options.preferFixture ?? process.env.PREFER_FIXTURE_IMPORT === 'true';
  let fixtures = null;
  if (allowFixtureFallback || preferFixture) {
    fixtures = await loadFixtureFromFile();
  }
  const shouldUseFixture = Boolean(
    fixtures?.length && (preferFixture || events.length === 0)
  );

  let imported = 0;
  if (shouldUseFixture) {
    imported = await upsertFixtureMatches(competition, fixtures);
  } else {
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
  }

  await updateEliminationMatches(competition);
  await rankingCache.invalidate({ competition });

  return { imported };
}

importMatches.importFixture = importFixtureMatches;

module.exports = importMatches;
