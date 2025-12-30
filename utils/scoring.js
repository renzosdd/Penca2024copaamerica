const DEFAULT_SCORING = Object.freeze({
  exact: 5,
  outcome: 3,
  goalDifference: 2,
  teamGoals: 1,
  cleanSheet: 0
});

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeScoring(scoring = {}) {
  return {
    exact: normalizeNumber(scoring.exact, DEFAULT_SCORING.exact),
    outcome: normalizeNumber(scoring.outcome, DEFAULT_SCORING.outcome),
    goalDifference: normalizeNumber(scoring.goalDifference, DEFAULT_SCORING.goalDifference),
    teamGoals: normalizeNumber(scoring.teamGoals, DEFAULT_SCORING.teamGoals),
    cleanSheet: 0
  };
}

function buildRulesDescription(scoringInput) {
  const scoring = sanitizeScoring(scoringInput);
  return [
    `• ${scoring.exact} puntos por acertar el marcador exacto`,
    `• ${scoring.outcome} puntos por acertar el resultado (victoria/empate)`,
    `• ${scoring.goalDifference} puntos por acertar la diferencia de goles`,
    `• ${scoring.teamGoals} punto por cada equipo con goles exactos`
  ].join('\n');
}

function getMatchOutcome(result1, result2) {
  if (result1 === result2) return 'draw';
  return result1 > result2 ? 'team1' : 'team2';
}

function calculatePoints({ prediction, match, scoring: scoringInput }) {
  if (!prediction || !match) return 0;
  if (match.result1 === undefined || match.result2 === undefined) return 0;

  const scoring = sanitizeScoring(scoringInput);
  let points = 0;

  const predictedOutcome = getMatchOutcome(prediction.result1, prediction.result2);
  const actualOutcome = getMatchOutcome(match.result1, match.result2);

  if (prediction.result1 === match.result1 && prediction.result2 === match.result2) {
    points += scoring.exact;
  } else if (predictedOutcome === actualOutcome) {
    points += scoring.outcome;
  }

  const predictedDiff = prediction.result1 - prediction.result2;
  const actualDiff = match.result1 - match.result2;
  if (predictedDiff === actualDiff) {
    points += scoring.goalDifference;
  }

  if (prediction.result1 === match.result1) {
    points += scoring.teamGoals;
  }
  if (prediction.result2 === match.result2) {
    points += scoring.teamGoals;
  }

  return points;
}

module.exports = {
  DEFAULT_SCORING,
  sanitizeScoring,
  buildRulesDescription,
  calculatePoints
};
