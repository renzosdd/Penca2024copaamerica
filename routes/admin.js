const express = require('express');
const path = require('path');
const router = express.Router();
const Match = require('../models/Match');
const Penca = require('../models/Penca');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { DEFAULT_COMPETITION } = require('../config');
const { updateEliminationMatches, invalidateGroupStandings } = require('../utils/bracket');
const { ensureWorldCupPenca } = require('../utils/worldcupPenca');
const { notifyPlayerApproval } = require('../utils/emailService');
const klaviyo = require('../utils/klaviyoService');
const { fetchCompetitionData } = require('../scripts/sportsDb');
const importMatches = require('../scripts/importMatches');
const { invalidate: invalidateMatchCache } = require('../utils/matchCache');
const rankingCache = require('../utils/rankingCache');

const MATCH_LIST_FIELDS =
  'team1 team2 team1Badge team2Badge competition date time kickoff group_name series venue result1 result2 penaltyWinner status order originalDate originalTime originalTimezone';

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

function isKnockoutMatch(match) {
  const group = String(match?.group_name || '');
  return group && !group.startsWith('Grupo');
}

function normalizePenaltyWinner(value) {
  return value === 'team1' || value === 'team2' ? value : null;
}

function kickoffDate(match) {
  if (match?.kickoff) {
    const date = new Date(match.kickoff);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (match?.date && match?.time) {
    const date = new Date(`${match.date}T${match.time}:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

async function buildMissingSummary() {
  const [users, matches, predictions] = await Promise.all([
    User.find({ role: 'user', valid: true })
      .select('username displayName name surname email')
      .lean(),
    Match.find({ competition: DEFAULT_COMPETITION })
      .select(MATCH_LIST_FIELDS)
      .sort({ order: 1, kickoff: 1, date: 1, time: 1 })
      .lean(),
    Prediction.find({})
      .select('userId matchId')
      .lean()
  ]);

  const now = new Date();
  const openMatches = matches.filter(match => {
    const kickoff = kickoffDate(match);
    if (!kickoff || match.status === 'finished' || match.status === 'live') return false;
    return (kickoff.getTime() - now.getTime()) / 60000 >= 30;
  });
  const closingSoon = openMatches.filter(match => {
    const kickoff = kickoffDate(match);
    const hours = (kickoff.getTime() - now.getTime()) / 36e5;
    return hours <= 48;
  });
  const withoutResult = matches.filter(match => {
    const kickoff = kickoffDate(match);
    return kickoff && kickoff < now && match.result1 == null && match.result2 == null;
  });

  const predictedByUser = new Map();
  for (const prediction of predictions) {
    const userId = prediction.userId?.toString();
    if (!userId) continue;
    if (!predictedByUser.has(userId)) predictedByUser.set(userId, new Set());
    predictedByUser.get(userId).add(prediction.matchId?.toString());
  }

  const players = users.map(user => {
    const predicted = predictedByUser.get(user._id.toString()) || new Set();
    const missingMatches = openMatches.filter(match => !predicted.has(match._id.toString()));
    return {
      ...user,
      missingCount: missingMatches.length,
      predictedOpenCount: openMatches.length - missingMatches.length,
      openCount: openMatches.length,
      nextMissingMatch: missingMatches[0] || null
    };
  });

  return {
    openMatchesCount: openMatches.length,
    playersMissing: players.filter(player => player.missingCount > 0),
    completePlayers: players.filter(player => player.missingCount === 0),
    closingSoon,
    withoutResult
  };
}

async function invalidateAdminCaches(competition) {
  await Promise.allSettled([
    invalidateMatchCache(competition),
    rankingCache.invalidate(competition ? { competition } : {}),
    invalidateGroupStandings(competition)
  ]);
}

function listMatchesFromDatabase() {
  const query = Match.find({ competition: DEFAULT_COMPETITION });
  if (!query || typeof query.select !== 'function') {
    return query;
  }
  const selected = query.select(MATCH_LIST_FIELDS);
  const sorted = selected && typeof selected.sort === 'function'
    ? selected.sort({ order: 1, kickoff: 1, date: 1, time: 1 })
    : selected;
  return sorted && typeof sorted.lean === 'function' ? sorted.lean() : sorted;
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

router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('username displayName name surname email valid approvalStatus approvedAt createdAt')
      .sort({ valid: 1, createdAt: -1, username: 1 })
      .lean();
    const normalized = users.map(user => ({
      ...user,
      approvalStatus: user.valid ? 'approved' : (user.approvalStatus || 'pending')
    }));
    res.json({
      pending: normalized.filter(user => user.approvalStatus === 'pending'),
      approved: normalized.filter(user => user.approvalStatus === 'approved'),
      rejected: normalized.filter(user => user.approvalStatus === 'rejected')
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/missing', isAuthenticated, isAdmin, async (req, res) => {
  try {
    res.json(await buildMissingSummary());
  } catch (error) {
    console.error('Error building missing summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reminders/missing-predictions', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const summary = await buildMissingSummary();
    const baseUrl = process.env.APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const dashboardUrl = baseUrl ? `${baseUrl}/dashboard` : '/dashboard';
    const results = await Promise.allSettled(summary.playersMissing.map(player =>
      klaviyo.notifyMissingPredictions({
        player,
        missingCount: player.missingCount,
        nextMatch: player.nextMissingMatch,
        dashboardUrl
      })
    ));
    const sent = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.filter(result => result.status === 'rejected').length;
    res.json({ sent, failed, total: summary.playersMissing.length, klaviyoConfigured: klaviyo.isConfigured() });
  } catch (error) {
    console.error('Error sending missing prediction reminders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:userId/approve', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, role: 'user' });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.valid = true;
    user.approvalStatus = 'approved';
    user.approvedAt = new Date();
    await user.save();

    const penca = await ensureWorldCupPenca(req.session.user?._id);
    if (penca) {
      await Penca.updateOne({ _id: penca._id }, { $addToSet: { participants: user._id } });
      await User.updateOne({ _id: user._id }, { $addToSet: { pencas: penca._id } });
    }

    let emailSent = false;
    try {
      emailSent = await notifyPlayerApproval({ player: user, penca });
    } catch (emailError) {
      console.error('Approval email error:', emailError);
    }

    res.json({ message: 'User approved', emailSent });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:userId/reject', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, role: 'user' });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.valid = false;
    user.approvalStatus = 'rejected';
    await user.save();
    await Penca.updateMany({}, { $pull: { participants: user._id } });
    res.json({ message: 'User rejected' });
  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
    let penaltyWinner = normalizePenaltyWinner(req.body.penaltyWinner);
    if (parsedResult1 === undefined || parsedResult2 === undefined) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    if ((parsedResult1 == null) !== (parsedResult2 == null)) {
      return res.status(400).json({ error: 'Both scores are required' });
    }
    if (
      isKnockoutMatch(match) &&
      parsedResult1 != null &&
      parsedResult1 === parsedResult2 &&
      !penaltyWinner
    ) {
      return res.status(400).json({ error: 'Penalty winner is required for tied knockout matches' });
    }
    if (!isKnockoutMatch(match) || parsedResult1 !== parsedResult2) {
      penaltyWinner = null;
    }
    match.result1 = parsedResult1;
    match.result2 = parsedResult2;
    match.penaltyWinner = penaltyWinner;
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

router.post('/matches/reset-fixture', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const confirmation = String(req.body?.confirmation || '').trim();
    if (confirmation !== 'REINICIAR') {
      return res.status(400).json({ error: 'Confirmation required' });
    }
    const matchesResult = await Match.deleteMany({ competition: DEFAULT_COMPETITION });
    const predictionsResult = await Prediction.deleteMany({});
    await Penca.updateMany({ competition: DEFAULT_COMPETITION }, { $set: { fixture: [] } });
    const importResult = typeof importMatches.importFixture === 'function'
      ? await importMatches.importFixture(DEFAULT_COMPETITION, { skipBracketUpdate: true })
      : { imported: 0 };
    await invalidateAdminCaches(DEFAULT_COMPETITION);
    res.json({
      message: 'Fixture reset',
      deletedMatches: matchesResult.deletedCount || 0,
      deletedPredictions: predictionsResult.deletedCount || 0,
      importedMatches: importResult.imported || 0
    });
  } catch (error) {
    console.error('Error resetting fixture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
