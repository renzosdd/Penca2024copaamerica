const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const { DEFAULT_COMPETITION } = require('../config');

function labelRound(name) {
  const n = name.toLowerCase();
  if (n.includes('cuartos')) return 'Cuartos de final';
  if (n.includes('semi')) return 'Semifinales';
  if (n.includes('tercer')) return 'Tercer puesto';
  if (n.includes('final')) return 'Final';
  return null;
}

router.get('/', async (req, res) => {
  try {
    const matches = await Match.find({ competition: DEFAULT_COMPETITION });
    const bracket = {};
    for (const m of matches) {
      const round = labelRound(m.group_name || '');
      if (!round) continue;
      bracket[round] = bracket[round] || [];
      bracket[round].push(m);
    }
    Object.values(bracket).forEach(arr =>
      arr.sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
      })
    );
    res.json(bracket);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving bracket' });
  }
});

module.exports = router;
