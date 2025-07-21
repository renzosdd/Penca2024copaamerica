export default function pointsForPrediction(prediction, match, scoring = { exact: 3, outcome: 1, goals: 1 }) {
  let pts = 0;
  if (!prediction || !match) return pts;
  if (match.result1 !== undefined && match.result2 !== undefined) {
    if (prediction.result1 === match.result1 && prediction.result2 === match.result2) {
      pts += scoring.exact;
    } else if (
      (prediction.result1 > prediction.result2 && match.result1 > match.result2) ||
      (prediction.result1 < prediction.result2 && match.result1 < match.result2) ||
      (prediction.result1 === prediction.result2 && match.result1 === match.result2)
    ) {
      pts += scoring.outcome;
    }
    if (prediction.result1 === match.result1 || prediction.result2 === match.result2) {
      pts += scoring.goals;
    }
  }
  return pts;
}
