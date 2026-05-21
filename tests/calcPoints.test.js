const { calculatePoints } = require('../utils/scoring');

function pointsForPrediction(prediction, match, scoring) {
  return calculatePoints({ prediction, match, scoring });
}

describe('pointsForPrediction', () => {
  const scoring = { exact: 8, outcome: 3, goalDifference: 5, teamGoals: 1, penaltyWinner: 1, maxNonExact: 7 };

  test('awards exact score only for perfect prediction', () => {
    const pred = { result1: 2, result2: 1 };
    const match = { result1: 2, result2: 1 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(8);
  });

  test('awards goal difference when scoreline is close but not exact', () => {
    const pred = { result1: 1, result2: 0 };
    const match = { result1: 2, result2: 1 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(5);
  });

  test('awards goal points when outcome is wrong but one score matches', () => {
    const pred = { result1: 2, result2: 3 };
    const match = { result1: 2, result2: 1 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(1);
  });

  test('awards outcome and goal points when outcome correct and one score matches', () => {
    const pred = { result1: 3, result2: 1 };
    const match = { result1: 2, result2: 1 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(4);
  });

  test('returns zero when nothing matches', () => {
    const pred = { result1: 0, result2: 2 };
    const match = { result1: 1, result2: 0 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(0);
  });

  test('adds penalty winner bonus only after a draw prediction', () => {
    const pred = { result1: 1, result2: 1 };
    const match = { result1: 1, result2: 1, penaltyWinner: 'team2' };
    expect(pointsForPrediction({ ...pred, penaltyWinner: 'team2' }, match, scoring)).toBe(9);
  });
});
