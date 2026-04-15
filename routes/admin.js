const express = require('express');
const path = require('path');
const router = express.Router();
const Match = require('../models/Match');
const Penca = require('../models/Penca');
const Prediction = require('../models/Prediction');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { DEFAULT_COMPETITION } = require('../config');
const { updateEliminationMatches, invalidateGroupStandings } = require('../utils/bracket');
const { fetchCompetitionData } = require('../scripts/sportsDb');
const importMatches = require('../scripts/importMatches');
const { invalidate: invalidateMatchCache } = require('../utils/matchCache');
const rankingCache = require('../utils/rankingCache');

const MATCH_LIST_FIELDS =
  'team1 team2 team1Badge team2Badge competition date time kickoff group_name series venue result1 result2 status order originalDate originalTime originalTimezone';

function parseKickoff(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumeric(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseScore(value) {
  if (value === null || value === '' || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

async function invalidateAdminCaches(competition) {
  await Promise.allSettled([
    invalidateMatchCache(competition),
    rankingCache.invalidate(competition ? { competition } : {}),
    invalidateGroupStandings(competition)
  ]);
}

function listMatchesFromDatabase() {
  return Match.find({ competition: DEFAULT_COMPETITION })
    .select(MATCH_LIST_FIELDS)
    .sort({ order: 1, kickoff: 1, date: 1, time: 1 })
    .lean();
}

router.post('/competitions/preview', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const leagueId = parseNumeric(req.body.apiLeagueId);
    const season = req.body.apiSeason;
    if (!leagueId || !season) {
      return res.status(400).json({ error: 'invalid payload' });
    }

    const { league, events } = await fetchCompetitionData(leagueId, season);
    const groupsMap = new Map();
    const matches = (events || []).map(event => {
      const groupName = event.strGroup || event.strRound || 'Otros';
      const groupEntry = groupsMap.get(groupName) || { name: groupName, teams: new Set() };
      if (event.strHomeTeam) groupEntry.teams.add(event.strHomeTeam);
      if (event.strAwayTeam) groupEntry.teams.add(event.strAwayTeam);
      groupsMap.set(groupName, groupEntry);
      return {
        team1: event.strHomeTeam,
        team2: event.strAwayTeam,
        date: event.dateEvent,
        time: event.strTime,
        group_name: groupName,
        series: event.idEvent
      };
    });

    const groups = [...groupsMap.values()].map(group => ({
      name: group.name,
      teams: [...group.teams]
    }));

    res.json({ league, matches, groups });
  } catch (error) {
    console.error('Error previewing competition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/edit', isAuthenticated, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

router.get('/matches', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await invalidateMatchCache(DEFAULT_COMPETITION).catch(error => {
      console.error('Error invalidating match cache before listing admin matches:', error);
    });
    let matches = await listMatchesFromDatabase();
    let importedFromFixture = false;
    if (!matches.length && typeof importMatches.importFixture === 'function') {
      const result = await importMatches.importFixture(DEFAULT_COMPETITION, {
        skipBracketUpdate: true
      });
      importedFromFixture = Boolean(result?.imported);
      if (importedFromFixture) {
        await invalidateAdminCaches(DEFAULT_COMPETITION);
        matches = await listMatchesFromDatabase();
      }
    }
    res.json({ competition: DEFAULT_COMPETITION, matches, importedFromFixture });
  } catch (error) {
    console.error('Error listing matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/matches/knockout-order', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order array required' });
    }
    await Promise.all(order.map((id, idx) =>
      Match.updateOne({ _id: id, competition: DEFAULT_COMPETITION }, { order: idx })
    ));
    await invalidateMatchCache(DEFAULT_COMPETITION);
    res.json({ message: 'Order updated' });
  } catch (error) {
    console.error('Error updating match order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/matches/:matchId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match || match.competition !== DEFAULT_COMPETITION) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const { team1, team2, date, time, group_name, series, status } = req.body;
    if (team1 !== undefined) match.team1 = team1;
    if (team2 !== undefined) match.team2 = team2;
    if (date !== undefined) match.date = date || null;
    if (time !== undefined) match.time = time || null;
    if (group_name !== undefined) match.group_name = group_name || 'Otros';
    if (series !== undefined) match.series = series || match.series;
    if (status !== undefined) match.status = status || match.status;
    if (req.body.kickoff !== undefined) {
      const kickoffValue = parseKickoff(req.body.kickoff);
      match.kickoff = kickoffValue || null;
    }
    if (req.body.originalDate !== undefined) {
      match.originalDate = req.body.originalDate || null;
    }
    if (req.body.originalTime !== undefined) {
      match.originalTime = req.body.originalTime || null;
    }
    if (req.body.originalTimezone !== undefined) {
      match.originalTimezone = req.body.originalTimezone || null;
    }
    if (req.body.venue !== undefined) {
      const venuePayload = req.body.venue || {};
      const normalized = {
        country: venuePayload.country || null,
        city: venuePayload.city || null,
        stadium: venuePayload.stadium || null
      };
      if (Object.values(normalized).some(Boolean)) {
        match.venue = normalized;
      } else {
        match.venue = undefined;
      }
    }

    await match.save();
    await invalidateMatchCache(DEFAULT_COMPETITION);
    res.json({ message: 'Match updated' });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/matches/:matchId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match || match.competition !== DEFAULT_COMPETITION) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const { result1, result2 } = req.body;
    const parsedResult1 = parseScore(result1);
    const parsedResult2 = parseScore(result2);
    if (parsedResult1 === undefined || parsedResult2 === undefined) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    if ((parsedResult1 == null) !== (parsedResult2 == null)) {
      return res.status(400).json({ error: 'Both scores are required' });
    }
    match.result1 = parsedResult1;
    match.result2 = parsedResult2;
    if (match.result1 != null && match.result2 != null) {
      match.status = 'finished';
    } else {
      match.status = 'scheduled';
    }
    await match.save();
    await updateEliminationMatches(match.competition);
    await invalidateAdminCaches(match.competition);
    res.json({ message: 'Match result updated' });
  } catch (error) {
    console.error('Error updating match result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/recalculate-bracket', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await updateEliminationMatches(DEFAULT_COMPETITION);
    await invalidateAdminCaches(DEFAULT_COMPETITION);
    res.json({ message: 'Bracket recalculated' });
  } catch (error) {
    console.error('Error recalculating bracket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/matches/clear', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const matchesResult = await Match.deleteMany({});
    const cleanupResults = await Promise.allSettled([
      Prediction.deleteMany({}),
      Penca.updateMany({}, { $set: { fixture: [] } }),
      invalidateMatchCache(),
      rankingCache.invalidate(),
      invalidateGroupStandings()
    ]);
    cleanupResults
      .filter(result => result.status === 'rejected')
      .forEach(result => console.error('Error during cleanup after clearing matches:', result.reason));
    const [predictionsResult, pencasResult] = cleanupResults.map(result =>
      result.status === 'fulfilled' ? result.value : null
    );
    res.json({
      message: 'Matches cleared',
      deleted: matchesResult.deletedCount || 0,
      predictionsDeleted: predictionsResult?.deletedCount || 0,
      pencasUpdated: pencasResult?.modifiedCount || 0
    });
  } catch (error) {
    console.error('Error clearing matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
