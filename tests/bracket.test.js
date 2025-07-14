const Match = require('../models/Match');
const { calculateGroupStandings } = require('../utils/bracket');


jest.mock('../models/Match', () => ({
  find: jest.fn(),
  updateOne: jest.fn()
}));

describe('Bracket helpers', () => {
  afterEach(() => jest.clearAllMocks());

  it('calculates group standings order', async () => {
    const matches = [
      { competition: 'Copa', group_name: 'Grupo A', team1: 'A1', team2: 'A2', result1: 1, result2: 0 },
      { competition: 'Copa', group_name: 'Grupo A', team1: 'A3', team2: 'A1', result1: 0, result2: 2 },
      { competition: 'Copa', group_name: 'Grupo A', team1: 'A2', team2: 'A3', result1: 1, result2: 1 },
      { competition: 'Copa', group_name: 'Grupo B', team1: 'B1', team2: 'B2', result1: 0, result2: 0 },
      { competition: 'Copa', group_name: 'Grupo B', team1: 'B2', team2: 'B3', result1: 2, result2: 1 },
      { competition: 'Copa', group_name: 'Grupo B', team1: 'B1', team2: 'B3', result1: 1, result2: 3 }
    ];
    Match.find.mockResolvedValue(matches);

    const standings = await calculateGroupStandings('Copa');

    expect(Match.find).toHaveBeenCalledWith({ competition: 'Copa' });
    expect(standings['Grupo A'].map(t => t.team)).toEqual(['A1', 'A2', 'A3']);
    expect(standings['Grupo B'].map(t => t.team)).toEqual(['B2', 'B3', 'B1']);

  });
});
