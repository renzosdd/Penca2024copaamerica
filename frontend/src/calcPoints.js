export const DEFAULT_SCORING = {
  exact: 8,
  outcome: 3,
  goalDifference: 5,
  teamGoals: 1,
  penaltyWinner: 1,
  maxNonExact: 7
};

export const sanitizeScoring = scoring => ({
  exact: Number.isFinite(Number(scoring?.exact)) ? Number(scoring.exact) : DEFAULT_SCORING.exact,
  outcome: Number.isFinite(Number(scoring?.outcome)) ? Number(scoring.outcome) : DEFAULT_SCORING.outcome,
  goalDifference: Number.isFinite(Number(scoring?.goalDifference))
    ? Number(scoring.goalDifference)
    : DEFAULT_SCORING.goalDifference,
  teamGoals: Number.isFinite(Number(scoring?.teamGoals)) ? Number(scoring.teamGoals) : DEFAULT_SCORING.teamGoals,
  penaltyWinner: Number.isFinite(Number(scoring?.penaltyWinner))
    ? Number(scoring.penaltyWinner)
    : DEFAULT_SCORING.penaltyWinner,
  maxNonExact: Number.isFinite(Number(scoring?.maxNonExact)) ? Number(scoring.maxNonExact) : DEFAULT_SCORING.maxNonExact
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
      team2Goals: false,
      penaltyWinner: false
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

  const isExact = prediction.result1 === match.result1 && prediction.result2 === match.result2;

  if (isExact) {
    breakdown.earned.exact = true;
    breakdown.total += safeScoring.exact;
  } else {
    const predictedDiff = prediction.result1 - prediction.result2;
    const actualDiff = match.result1 - match.result2;
    if (predictedDiff === actualDiff) {
      breakdown.earned.goalDifference = true;
      breakdown.total += safeScoring.goalDifference;
    } else if (predictedOutcome === actualOutcome) {
      breakdown.earned.outcome = true;
      breakdown.total += safeScoring.outcome;
    }

    if (prediction.result1 === match.result1) {
      breakdown.earned.team1Goals = true;
      breakdown.total += safeScoring.teamGoals;
    }
    if (prediction.result2 === match.result2) {
      breakdown.earned.team2Goals = true;
      breakdown.total += safeScoring.teamGoals;
    }
    breakdown.total = Math.min(breakdown.total, safeScoring.maxNonExact);
  }

  if (
    match.result1 === match.result2 &&
    prediction.result1 === prediction.result2 &&
    match.penaltyWinner &&
    prediction.penaltyWinner === match.penaltyWinner
  ) {
    breakdown.earned.penaltyWinner = true;
    breakdown.total += safeScoring.penaltyWinner;
  }

  return breakdown;
}

export default function pointsForPrediction(prediction, match, scoring) {
  return calculatePointsBreakdown(prediction, match, scoring).total;
}
