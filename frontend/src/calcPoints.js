const DEFAULT_SCORING = {
  exact: 5,
  outcome: 3,
  goalDifference: 2,
  teamGoals: 1,
  cleanSheet: 1
};

const sanitize = scoring => ({
  exact: Number.isFinite(Number(scoring?.exact)) ? Number(scoring.exact) : DEFAULT_SCORING.exact,
  outcome: Number.isFinite(Number(scoring?.outcome)) ? Number(scoring.outcome) : DEFAULT_SCORING.outcome,
  goalDifference: Number.isFinite(Number(scoring?.goalDifference))
    ? Number(scoring.goalDifference)
    : DEFAULT_SCORING.goalDifference,
  teamGoals: Number.isFinite(Number(scoring?.teamGoals)) ? Number(scoring.teamGoals) : DEFAULT_SCORING.teamGoals,
  cleanSheet: Number.isFinite(Number(scoring?.cleanSheet)) ? Number(scoring.cleanSheet) : DEFAULT_SCORING.cleanSheet
});

const outcome = (a, b) => {
  if (a === b) return 'draw';
  return a > b ? 'team1' : 'team2';
};

export default function pointsForPrediction(prediction, match, scoring) {
  if (!prediction || !match) return 0;
  if (match.result1 === undefined || match.result2 === undefined) return 0;

  const safeScoring = sanitize(scoring);
  let pts = 0;

  const predictedOutcome = outcome(prediction.result1, prediction.result2);
  const actualOutcome = outcome(match.result1, match.result2);

  if (prediction.result1 === match.result1 && prediction.result2 === match.result2) {
    pts += safeScoring.exact;
  } else if (predictedOutcome === actualOutcome) {
    pts += safeScoring.outcome;
  }

  const predictedDiff = prediction.result1 - prediction.result2;
  const actualDiff = match.result1 - match.result2;
  if (predictedDiff === actualDiff) {
    pts += safeScoring.goalDifference;
  }

  if (prediction.result1 === match.result1) {
    pts += safeScoring.teamGoals;
  }
  if (prediction.result2 === match.result2) {
    pts += safeScoring.teamGoals;
  }

  if (prediction.result2 === 0 && match.result2 === 0) {
    pts += safeScoring.cleanSheet;
  }
  if (prediction.result1 === 0 && match.result1 === 0) {
    pts += safeScoring.cleanSheet;
  }

  return pts;
}
