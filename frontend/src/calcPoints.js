export const DEFAULT_SCORING = {
  exact: 5,
  outcome: 3,
  goalDifference: 2,
  teamGoals: 1,
  cleanSheet: 0
};

export const sanitizeScoring = scoring => ({
  exact: Number.isFinite(Number(scoring?.exact)) ? Number(scoring.exact) : DEFAULT_SCORING.exact,
  outcome: Number.isFinite(Number(scoring?.outcome)) ? Number(scoring.outcome) : DEFAULT_SCORING.outcome,
  goalDifference: Number.isFinite(Number(scoring?.goalDifference))
    ? Number(scoring.goalDifference)
    : DEFAULT_SCORING.goalDifference,
  teamGoals: Number.isFinite(Number(scoring?.teamGoals)) ? Number(scoring.teamGoals) : DEFAULT_SCORING.teamGoals,
  cleanSheet: 0
});

const outcome = (a, b) => {
  if (a === b) return 'draw';
  return a > b ? 'team1' : 'team2';
};

export function calculatePointsBreakdown(prediction, match, scoring) {
  const safeScoring = sanitizeScoring(scoring);
  const breakdown = {
    total: 0,
    scoring: safeScoring,
    earned: {
      exact: false,
      outcome: false,
      goalDifference: false,
      team1Goals: false,
      team2Goals: false
    }
  };

  if (!prediction || !match) {
    return breakdown;
  }

  if (match.result1 == null || match.result2 == null) {
    return breakdown;
  }

  const predictedOutcome = outcome(prediction.result1, prediction.result2);
  const actualOutcome = outcome(match.result1, match.result2);

  if (prediction.result1 === match.result1 && prediction.result2 === match.result2) {
    breakdown.earned.exact = true;
    breakdown.total += safeScoring.exact;
  } else if (predictedOutcome === actualOutcome) {
    breakdown.earned.outcome = true;
    breakdown.total += safeScoring.outcome;
  }

  const predictedDiff = prediction.result1 - prediction.result2;
  const actualDiff = match.result1 - match.result2;
  if (predictedDiff === actualDiff) {
    breakdown.earned.goalDifference = true;
    breakdown.total += safeScoring.goalDifference;
  }

  if (prediction.result1 === match.result1) {
    breakdown.earned.team1Goals = true;
    breakdown.total += safeScoring.teamGoals;
  }
  if (prediction.result2 === match.result2) {
    breakdown.earned.team2Goals = true;
    breakdown.total += safeScoring.teamGoals;
  }

  return breakdown;
}

export default function pointsForPrediction(prediction, match, scoring) {
  return calculatePointsBreakdown(prediction, match, scoring).total;
}
