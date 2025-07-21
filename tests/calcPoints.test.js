let pointsForPrediction;

beforeAll(async () => {
  pointsForPrediction = (await import('../frontend/src/calcPoints.js')).default;
});

describe('pointsForPrediction', () => {
  const scoring = { exact: 3, outcome: 1, goals: 1 };

  test('awards exact and goal points for perfect prediction', () => {
    const pred = { result1: 2, result2: 1 };
    const match = { result1: 2, result2: 1 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(4);
  });

  test('awards outcome points only when no goals match', () => {
    const pred = { result1: 1, result2: 0 };
    const match = { result1: 2, result2: 1 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(1);
  });

  test('awards goal points when outcome is wrong but one score matches', () => {
    const pred = { result1: 2, result2: 3 };
    const match = { result1: 2, result2: 1 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(1);
  });

  test('awards outcome and goal points when outcome correct and one score matches', () => {
    const pred = { result1: 3, result2: 1 };
    const match = { result1: 2, result2: 1 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(2);
  });

  test('returns zero when nothing matches', () => {
    const pred = { result1: 0, result2: 2 };
    const match = { result1: 1, result2: 0 };
    expect(pointsForPrediction(pred, match, scoring)).toBe(0);
  });

  test('uses custom scoring values', () => {
    const pred = { result1: 1, result2: 1 };
    const match = { result1: 1, result2: 1 };
    const custom = { exact: 5, outcome: 2, goals: 1 };
    expect(pointsForPrediction(pred, match, custom)).toBe(6);
  });
});
