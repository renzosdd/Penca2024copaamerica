const Match = require('../models/Match');
const ApiUsage = require('../models/ApiUsage');

async function updateResults(competition) {
  const {
    FOOTBALL_API_KEY,
    FOOTBALL_LEAGUE_ID,
    FOOTBALL_SEASON,
    FOOTBALL_API_URL,
    FOOTBALL_UPDATE_INTERVAL
  } = process.env;

  if (!FOOTBALL_API_KEY || !FOOTBALL_LEAGUE_ID || !FOOTBALL_SEASON) {
    throw new Error('Football API env vars missing');
  }

  const interval = parseInt(FOOTBALL_UPDATE_INTERVAL || '3600000', 10);
  const usage = await ApiUsage.findOne({ name: 'updateResults', competition });
  if (usage && Date.now() - usage.lastUsed.getTime() < interval) {
    return { skipped: true };
  }

  const base = FOOTBALL_API_URL || 'https://v3.football.api-sports.io';
  const url = `${base}/fixtures?league=${FOOTBALL_LEAGUE_ID}&season=${FOOTBALL_SEASON}`;
  const response = await fetch(url, { headers: { 'x-apisports-key': FOOTBALL_API_KEY } });

  if (!response.ok) {
    throw new Error(`Failed to fetch fixtures: ${response.status}`);
  }

  const apiData = await response.json();
  const fixtures = apiData.response || [];
  for (const f of fixtures) {
    const id = String(f.fixture?.id || '');
    const result1 = f.goals?.home ?? null;
    const result2 = f.goals?.away ?? null;
    await Match.updateOne({ series: id, competition }, { result1, result2 });
  }

  if (usage) {
    usage.lastUsed = new Date();
    await usage.save();
  } else {
    await ApiUsage.create({ name: 'updateResults', competition, lastUsed: new Date() });
  }

  return { updated: fixtures.length };
}

module.exports = updateResults;
