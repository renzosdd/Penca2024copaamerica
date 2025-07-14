const Match = require('../models/Match');

jest.mock('../models/Match', () => ({
  find: jest.fn(),
  updateOne: jest.fn()
}));

const { calculateGroupStandings, updateEliminationMatches } = require('../bracket');

describe('calculateGroupStandings', () => {
  it('orders teams by points, goal difference and goals for', () => {
    const matches = [
      { team1: 'A', team2: 'B', result1: 1, result2: 0 },
      { team1: 'C', team2: 'D', result1: 0, result2: 0 },
      { team1: 'A', team2: 'C', result1: 2, result2: 1 },
      { team1: 'B', team2: 'D', result1: 0, result2: 1 },
      { team1: 'A', team2: 'D', result1: 1, result2: 1 },
      { team1: 'B', team2: 'C', result1: 3, result2: 2 }
    ];

    const standings = calculateGroupStandings(matches);
    const order = standings.map(s => s.team);
    expect(order).toEqual(['A', 'D', 'B', 'C']);
  });
});

describe('updateEliminationMatches', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates quarter finals based on group standings', async () => {
    const quarter = [
      { _id: 'm1', team1: 'Ganador A', team2: 'Segundo B' },
      { _id: 'm2', team1: 'Ganador B', team2: 'Segundo A' }
    ];
    Match.find.mockResolvedValue(quarter);

    const standings = {
      A: [{ team: 'A1' }, { team: 'A2' }],
      B: [{ team: 'B1' }, { team: 'B2' }]
    };

    const updated = await updateEliminationMatches(standings);

    expect(Match.find).toHaveBeenCalledWith({ group_name: 'Cuartos de final' });
    expect(Match.updateOne).toHaveBeenCalledTimes(2);
    expect(Match.updateOne).toHaveBeenCalledWith({ _id: 'm1' }, { team1: 'A1', team2: 'B2' });
    expect(Match.updateOne).toHaveBeenCalledWith({ _id: 'm2' }, { team1: 'B1', team2: 'A2' });
    expect(updated).toEqual([
      { _id: 'm1', team1: 'A1', team2: 'B2' },
      { _id: 'm2', team1: 'B1', team2: 'A2' }
    ]);
  });
});
