const path = require('path');
const { promises: fs } = require('fs');
const Competition = require('../models/Competition');
const Match = require('../models/Match');

const COMPETITION_NAME = 'Mundial 2026';
const DEFAULT_TOURNAMENT = 'Copa Mundial de la FIFA 2026';
const HOST_COUNTRIES = 'Canadá, Estados Unidos y México';

function sanitizeMatch(match, index) {
  return {
    date: match.date || null,
    time: match.time || null,
    team1: (match.team1 || '').trim(),
    team2: (match.team2 || '').trim(),
    competition: COMPETITION_NAME,
    group_name: match.group_name || 'Otros',
    series: match.series || 'Fase de grupos',
    tournament: match.tournament || DEFAULT_TOURNAMENT,
    order: index,
    result1: match.result1 ?? null,
    result2: match.result2 ?? null
  };
}

function pickSeasonBounds(matches) {
  const dates = matches
    .map(m => m.date)
    .filter(Boolean)
    .map(d => new Date(d));

  if (!dates.length) {
    return { seasonStart: null, seasonEnd: null };
  }

  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  return { seasonStart: min, seasonEnd: max };
}

async function ensureWorldCup2026() {
  try {
    const existingCompetition = await Competition.findOne({ name: COMPETITION_NAME });
    const existingMatches = await Match.countDocuments({ competition: COMPETITION_NAME });

    if (existingCompetition && existingMatches > 0) {
      return { created: false, matchesInserted: false };
    }

    const fixturePath = path.join(__dirname, '..', 'worldcup2026.json');
    const raw = await fs.readFile(fixturePath, 'utf-8');
    const fixture = JSON.parse(raw);

    const sanitized = fixture.map(sanitizeMatch);
    const { seasonStart, seasonEnd } = pickSeasonBounds(sanitized);

    if (!existingCompetition) {
      await Competition.create({
        name: COMPETITION_NAME,
        groupsCount: 12,
        integrantsPerGroup: 4,
        qualifiersPerGroup: 2,
        tournament: sanitized[0]?.tournament || DEFAULT_TOURNAMENT,
        country: HOST_COUNTRIES,
        seasonStart,
        seasonEnd,
        apiLeagueId: null,
        apiSeason: 2026
      });
    } else {
      const update = {};
      if (existingCompetition.groupsCount !== 12) update.groupsCount = 12;
      if (existingCompetition.integrantsPerGroup !== 4) update.integrantsPerGroup = 4;
      if (existingCompetition.qualifiersPerGroup !== 2) update.qualifiersPerGroup = 2;
      if (!existingCompetition.tournament) update.tournament = sanitized[0]?.tournament || DEFAULT_TOURNAMENT;
      if (!existingCompetition.country) update.country = HOST_COUNTRIES;
      if (!existingCompetition.seasonStart && seasonStart) update.seasonStart = seasonStart;
      if (!existingCompetition.seasonEnd && seasonEnd) update.seasonEnd = seasonEnd;
      if (existingCompetition.apiSeason == null) update.apiSeason = 2026;
      if (Object.keys(update).length) {
        await Competition.updateOne({ _id: existingCompetition._id }, update);
      }
    }

    if (existingMatches === 0 && sanitized.length) {
      await Match.insertMany(sanitized);
      return { created: !existingCompetition, matchesInserted: true };
    }

    return { created: !existingCompetition, matchesInserted: false };
  } catch (error) {
    console.error('World Cup 2026 seed failed:', error.message);
    return { created: false, matchesInserted: false, error: error.message };
  }
}

module.exports = { ensureWorldCup2026 };
