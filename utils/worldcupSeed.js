const path = require('path');
const { promises: fs } = require('fs');
const Competition = require('../models/Competition');
const Match = require('../models/Match');

const COMPETITION_NAME = 'Mundial 2026';
const DEFAULT_TOURNAMENT = 'Copa Mundial de la FIFA 2026';
const HOST_COUNTRIES = 'Canadá, Estados Unidos y México';

function parseKickoff(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizeMatch(match, index, competitionName, tournamentName) {
  const original = match.originalKickoff || {};
  const venue = match.venue || {};
  const kickoff = parseKickoff(match.kickoff || match.kickoffUtc || match.kickoffISO);
  const originalDate = match.originalDate || original.date || match.date || null;
  const originalTime = match.originalTime || original.time || match.time || null;
  const originalTimezone = match.originalTimezone || original.timezone || original.tz || null;
  const normalizedVenue = {
    country: venue.country || match.venueCountry || null,
    city: venue.city || match.venueCity || null,
    stadium: venue.stadium || match.venueStadium || null
  };

  const hasVenue = Object.values(normalizedVenue).some(Boolean);

  return {
    date: match.date || originalDate || null,
    time: match.time || originalTime || null,
    kickoff: kickoff || (originalDate && originalTime ? parseKickoff(`${originalDate}T${originalTime}Z`) : null),
    originalDate: originalDate || null,
    originalTime: originalTime || null,
    originalTimezone: originalTimezone || null,
    team1: (match.team1 || '').trim(),
    team2: (match.team2 || '').trim(),
    competition: competitionName,
    group_name: match.group || match.group_name || 'Otros',
    series: match.stage || match.series || 'Fase de grupos',
    tournament: match.tournament || tournamentName,
    venue: hasVenue ? normalizedVenue : undefined,
    order: index,
    result1: match.result1 ?? null,
    result2: match.result2 ?? null
  };
}

function pickSeasonBounds(matches) {
  const dates = matches
    .map(m => (m.kickoff instanceof Date ? m.kickoff : (m.date ? new Date(m.date) : null)))
    .filter(d => d && !Number.isNaN(d.getTime()));

  if (!dates.length) {
    return { seasonStart: null, seasonEnd: null };
  }

  const min = new Date(Math.min(...dates.map(d => d.getTime())));
  const max = new Date(Math.max(...dates.map(d => d.getTime())));
  return { seasonStart: min, seasonEnd: max };
}

function parseWorldCupFixture(raw) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return { competition: {}, matches: parsed };
  }

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.matches)) {
      return { competition: parsed.competition || {}, matches: parsed.matches };
    }
    if (Array.isArray(parsed.fixture)) {
      return { competition: parsed.competition || {}, matches: parsed.fixture };
    }
  }

  return { competition: {}, matches: [] };
}

async function ensureWorldCup2026() {
  try {
    let existingCompetition = await Competition.findOne({ name: COMPETITION_NAME });
    let existingMatches = await Match.countDocuments({ competition: COMPETITION_NAME });

    if (existingCompetition && existingMatches > 0) {
      return { created: false, matchesInserted: false };
    }

    const fixturePath = path.join(__dirname, '..', 'worldcup2026.json');
    const raw = await fs.readFile(fixturePath, 'utf-8');
    const { competition: competitionSpec, matches: fixture } = parseWorldCupFixture(raw);

    const competitionName = competitionSpec.name || COMPETITION_NAME;
    const tournamentName = competitionSpec.tournament || DEFAULT_TOURNAMENT;
    const hostCountries = competitionSpec.country || competitionSpec.hosts || HOST_COUNTRIES;

    if (competitionName !== COMPETITION_NAME) {
      existingCompetition = await Competition.findOne({ name: competitionName });
      existingMatches = await Match.countDocuments({ competition: competitionName });
      if (existingCompetition && existingMatches > 0) {
        return { created: false, matchesInserted: false };
      }
    }

    const sanitized = fixture.map((match, index) => sanitizeMatch(match, index, competitionName, tournamentName));
    const { seasonStart, seasonEnd } = pickSeasonBounds(sanitized);

    if (!existingCompetition) {
      await Competition.create({
        name: competitionName,
        groupsCount: competitionSpec.groupsCount ?? 12,
        integrantsPerGroup: competitionSpec.integrantsPerGroup ?? 4,
        qualifiersPerGroup: competitionSpec.qualifiersPerGroup ?? 2,
        tournament: sanitized[0]?.tournament || tournamentName,
        country: hostCountries,
        seasonStart,
        seasonEnd,
        apiLeagueId: competitionSpec.apiLeagueId ?? null,
        apiSeason: competitionSpec.apiSeason ?? 2026
      });
    } else {
      const update = {};
      const desiredGroups = competitionSpec.groupsCount ?? 12;
      const desiredIntegrants = competitionSpec.integrantsPerGroup ?? 4;
      const desiredQualifiers = competitionSpec.qualifiersPerGroup ?? 2;
      if (existingCompetition.groupsCount !== desiredGroups) update.groupsCount = desiredGroups;
      if (existingCompetition.integrantsPerGroup !== desiredIntegrants) update.integrantsPerGroup = desiredIntegrants;
      if (existingCompetition.qualifiersPerGroup !== desiredQualifiers) update.qualifiersPerGroup = desiredQualifiers;
      if (!existingCompetition.tournament) update.tournament = sanitized[0]?.tournament || tournamentName;
      if (!existingCompetition.country) update.country = hostCountries;
      if (!existingCompetition.seasonStart && seasonStart) update.seasonStart = seasonStart;
      if (!existingCompetition.seasonEnd && seasonEnd) update.seasonEnd = seasonEnd;
      if (existingCompetition.apiSeason == null) update.apiSeason = competitionSpec.apiSeason ?? 2026;
      if (existingCompetition.apiLeagueId == null && competitionSpec.apiLeagueId != null) {
        update.apiLeagueId = competitionSpec.apiLeagueId;
      }
      if (Object.keys(update).length) {
        await Competition.updateOne({ _id: existingCompetition._id }, update);
      }
    }

    if (existingMatches === 0 && sanitized.length) {
      const insertPayload = sanitized.map(m => ({
        ...m,
        kickoff: m.kickoff || undefined,
        venue: m.venue || undefined
      }));
      await Match.insertMany(insertPayload);
      return { created: !existingCompetition, matchesInserted: true };
    }

    return { created: !existingCompetition, matchesInserted: false };
  } catch (error) {
    console.error('World Cup 2026 seed failed:', error.message);
    return { created: false, matchesInserted: false, error: error.message };
  }
}

module.exports = { ensureWorldCup2026 };
