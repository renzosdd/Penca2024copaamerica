const express = require('express');
const router = express.Router();
const Match = require('../models/Match');

router.get('/:competition/matches', async (req, res) => {
  const matches = await Match.find({ competition: req.params.competition });
  res.json(matches);
});

module.exports = router;
