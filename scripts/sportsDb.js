const ApiUsage = require('../models/ApiUsage');

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function resolveSportsDbConfig(leagueId, season) {
  const {
    SPORTSDB_API_KEY,
    SPORTSDB_LEAGUE_ID,
    SPORTSDB_SEASON,
    SPORTSDB_API_URL
  } = process.env;

  const finalLeague = leagueId || SPORTSDB_LEAGUE_ID;
  const finalSeason = season || SPORTSDB_SEASON;

  if (!SPORTSDB_API_KEY || !finalLeague || !finalSeason) {
    throw new Error('SportsDB env vars missing');
  }

  const base = (SPORTSDB_API_URL || 'https://www.thesportsdb.com/api/v2/json').replace(/\/$/, '');
  const apiBase = `${base}/${SPORTSDB_API_KEY}`;

  return { apiBase, finalLeague, finalSeason };
}

async function fetchEventsWithThrottle(name, competition, leagueId, season) {
  const { SPORTSDB_UPDATE_INTERVAL } = process.env;
  const interval = parsePositiveInt(SPORTSDB_UPDATE_INTERVAL, 3600000);

  const usage = await ApiUsage.findOne({ name, competition });
  if (usage && Date.now() - usage.lastUsed.getTime() < interval) {
    return { skipped: true, events: [] };
  }

  const { apiBase, finalLeague, finalSeason } = resolveSportsDbConfig(leagueId, season);
  const url = `${apiBase}/eventsseason.php?id=${encodeURIComponent(finalLeague)}&season=${encodeURIComponent(finalSeason)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`);
  }

  const apiData = await response.json();
  const events = apiData.events || [];

  if (usage) {
    usage.lastUsed = new Date();
    await usage.save();
  } else {
    await ApiUsage.create({ name, competition, lastUsed: new Date() });
  }

  return { events, skipped: false };
}

async function fetchCompetitionData(leagueId, season) {
  const { apiBase, finalLeague, finalSeason } = resolveSportsDbConfig(leagueId, season);
  const leagueUrl = `${apiBase}/lookupleague.php?id=${encodeURIComponent(finalLeague)}`;
  const leagueRes = await fetch(leagueUrl);

  if (!leagueRes.ok) {
    throw new Error(`Failed to fetch league info: ${leagueRes.status}`);
  }

  const leagueJson = await leagueRes.json();
  const league = leagueJson.leagues?.[0] || null;

  const eventsUrl = `${apiBase}/eventsseason.php?id=${encodeURIComponent(finalLeague)}&season=${encodeURIComponent(finalSeason)}`;
  const eventsRes = await fetch(eventsUrl);

  if (!eventsRes.ok) {
    throw new Error(`Failed to fetch events: ${eventsRes.status}`);
  }

  const eventsJson = await eventsRes.json();
  const events = eventsJson.events || [];

  return { league, events };
}

module.exports = { fetchEventsWithThrottle, fetchCompetitionData };
