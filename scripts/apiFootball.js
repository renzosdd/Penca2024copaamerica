const ApiUsage = require('../models/ApiUsage');

async function fetchFixturesWithThrottle(name, competition, leagueId, season) {
  const {
    FOOTBALL_API_KEY,
    FOOTBALL_LEAGUE_ID,
    FOOTBALL_SEASON,
    FOOTBALL_API_URL,
    FOOTBALL_UPDATE_INTERVAL
  } = process.env;

  const finalLeague = leagueId || FOOTBALL_LEAGUE_ID;
  const finalSeason = season || FOOTBALL_SEASON;

  if (!FOOTBALL_API_KEY || !finalLeague || !finalSeason) {
    throw new Error('Football API env vars missing');
  }

  const interval = parseInt(FOOTBALL_UPDATE_INTERVAL || '3600000', 10);
  const usage = await ApiUsage.findOne({ name, competition });
  if (usage && Date.now() - usage.lastUsed.getTime() < interval) {
    return { skipped: true, fixtures: [] };
  }

  const base = FOOTBALL_API_URL || 'https://v3.football.api-sports.io';
  const url = `${base}/fixtures?league=${finalLeague}&season=${finalSeason}`;
  const response = await fetch(url, { headers: { 'x-apisports-key': FOOTBALL_API_KEY } });

  if (!response.ok) {
    throw new Error(`Failed to fetch fixtures: ${response.status}`);
  }

  const apiData = await response.json();
  const fixtures = apiData.response || [];

  if (usage) {
    usage.lastUsed = new Date();
    await usage.save();
  } else {
    await ApiUsage.create({ name, competition, lastUsed: new Date() });
  }

  return { fixtures, skipped: false };
}

async function fetchCompetitionData(leagueId, season) {
  const { FOOTBALL_API_KEY, FOOTBALL_API_URL } = process.env;
  if (!FOOTBALL_API_KEY || !leagueId || !season) {
    throw new Error('Football API env vars missing');
  }

  const base = FOOTBALL_API_URL || 'https://v3.football.api-sports.io';
  const leagueUrl = `${base}/leagues?id=${leagueId}&season=${season}`;
  const leagueRes = await fetch(leagueUrl, {
    headers: { 'x-apisports-key': FOOTBALL_API_KEY }
  });

  if (!leagueRes.ok) {
    throw new Error(`Failed to fetch league info: ${leagueRes.status}`);
  }

  const leagueJson = await leagueRes.json();
  const league = leagueJson.response?.[0] || null;

  const fixturesUrl = `${base}/fixtures?league=${leagueId}&season=${season}`;
  const fixturesRes = await fetch(fixturesUrl, {
    headers: { 'x-apisports-key': FOOTBALL_API_KEY }
  });

  if (!fixturesRes.ok) {
    throw new Error(`Failed to fetch fixtures: ${fixturesRes.status}`);
  }

  const fixturesJson = await fixturesRes.json();
  const fixtures = fixturesJson.response || [];

  return { league, fixtures };
}

module.exports = { fetchFixturesWithThrottle, fetchCompetitionData };
