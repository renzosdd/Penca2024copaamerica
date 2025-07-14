const express = require('express');
const router = express.Router();
const Match = require('../models/Match');

function calculateGroupStandings(matches) {
  const groups = {};
  for (const m of matches) {
    if (!/^Grupo/i.test(m.group_name)) continue;
    const g = m.group_name;
    groups[g] = groups[g] || {};
    groups[g][m.team1] = groups[g][m.team1] || { team: m.team1, points: 0, gf: 0, ga: 0 };
    groups[g][m.team2] = groups[g][m.team2] || { team: m.team2, points: 0, gf: 0, ga: 0 };
    if (m.result1 != null && m.result2 != null) {
      const t1 = groups[g][m.team1];
      const t2 = groups[g][m.team2];
      t1.gf += m.result1;
      t1.ga += m.result2;
      t2.gf += m.result2;
      t2.ga += m.result1;
      if (m.result1 > m.result2) {
        t1.points += 3;
      } else if (m.result1 < m.result2) {
        t2.points += 3;
      } else {
        t1.points += 1;
        t2.points += 1;
      }
    }
  }
  return Object.entries(groups).map(([group, teams]) => ({
    group,
    teams: Object.values(teams).map(t => ({
      team: t.team,
      points: t.points,
      gf: t.gf,
      ga: t.ga,
      gd: t.gf - t.ga
    })).sort((a, b) =>
      b.points - a.points || b.gd - a.gd || b.gf - a.gf
    )
  }));
}

router.get('/:competition', async (req, res) => {
  try {
    const matches = await Match.find({ competition: req.params.competition });
    const standings = calculateGroupStandings(matches);
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving group standings' });
  }
});

module.exports = { router, calculateGroupStandings };
