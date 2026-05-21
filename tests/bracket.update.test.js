const Match = require('../models/Match');
const { updateEliminationMatches } = require('../utils/bracket');

jest.mock('../models/Match', () => ({
  find: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  insertMany: jest.fn()
}));

describe('updateEliminationMatches World Cup style', () => {
  afterEach(() => jest.clearAllMocks());

  it('replaces Round of 32 placeholders with group winners and runners-up', async () => {
    const matches = [];
    const groups = 'ABCDEFGHIJKL'.split('');
    for (const g of groups) {
      matches.push({ competition: 'WC', group_name: `Grupo ${g}`, team1: `${g}1`, team2: `${g}2`, result1: 1, result2: 0 });
    }
    const r32Matches = Array.from({ length: 16 }, (_, index) => ({
      _id: `r32-${index}`,
      competition: 'WC',
      group_name: 'Ronda de 32',
      team1: `placeholder-${index}-1`,
      team2: `placeholder-${index}-2`
    }));
    Match.find
      .mockResolvedValueOnce(matches)
      .mockResolvedValueOnce(matches)
      .mockResolvedValueOnce(r32Matches)
      .mockResolvedValue([]);

    await updateEliminationMatches('WC');

    expect(Match.updateOne).toHaveBeenCalledWith(
      { _id: 'r32-0' },
      { $set: { team1: 'A1' } }
    );
    expect(Match.updateOne).toHaveBeenCalledWith(
      { _id: 'r32-0' },
      { $set: { team2: 'B2' } }
    );
    expect(Match.updateOne).toHaveBeenCalledWith(
      { _id: 'r32-15' },
      { $set: { team2: expect.stringMatching(/Mejor tercero/) } }
    );
  });
});
