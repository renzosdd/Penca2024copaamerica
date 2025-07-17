const Match = require('../models/Match');
const { updateEliminationMatches } = require('../utils/bracket');

jest.mock('../models/Match', () => ({
  find: jest.fn(),
  updateOne: jest.fn()
}));

describe('updateEliminationMatches World Cup style', () => {
  afterEach(() => jest.clearAllMocks());

  it('replaces Round of 32 placeholders with group winners and runners-up', async () => {
    const matches = [];
    const groups = 'ABCDEFGHIJKL'.split('');
    for (const g of groups) {
      matches.push({ competition: 'WC', group_name: `Grupo ${g}`, team1: `${g}1`, team2: `${g}2`, result1: 1, result2: 0 });
    }
    // First call for calculateGroupStandings, then for quarters and semis
    Match.find.mockResolvedValueOnce(matches).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await updateEliminationMatches('WC');

    expect(Match.updateOne).toHaveBeenCalledWith(
      { competition: 'WC', group_name: 'Ronda de 32', $or: [{ team1: 'A1' }, { team2: 'A1' }] },
      expect.any(Array)
    );
    expect(Match.updateOne).toHaveBeenCalledWith(
      { competition: 'WC', group_name: 'Ronda de 32', $or: [{ team1: 'B2' }, { team2: 'B2' }] },
      expect.any(Array)
    );
    expect(Match.updateOne).toHaveBeenCalledTimes(24);
  });
});
