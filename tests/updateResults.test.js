const updateResults = require('../scripts/updateResults');

jest.mock('../models/Match', () => ({
  updateOne: jest.fn()
}));

jest.mock('../utils/bracket', () => ({
  updateEliminationMatches: jest.fn()
}));

jest.mock('../models/ApiUsage', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

const Match = require('../models/Match');
const ApiUsage = require('../models/ApiUsage');
const { updateEliminationMatches } = require('../utils/bracket');

describe('updateResults script', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.FOOTBALL_API_KEY = 'k';
    process.env.FOOTBALL_LEAGUE_ID = '1';
    process.env.FOOTBALL_SEASON = '2024';
    process.env.FOOTBALL_API_URL = 'http://api';
    process.env.FOOTBALL_UPDATE_INTERVAL = '3600000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates matches from API', async () => {
    ApiUsage.findOne.mockResolvedValue(null);
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        response: [
          {
            fixture: { id: 10 },
            goals: { home: 2, away: 1 }
          }
        ]
      })
    });

    const res = await updateResults('Copa');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://api/fixtures?league=1&season=2024',
      { headers: { 'x-apisports-key': 'k' } }
    );
    expect(Match.updateOne).toHaveBeenCalledWith(
      { series: '10', competition: 'Copa' },
      { result1: 2, result2: 1 }
    );
    expect(updateEliminationMatches).toHaveBeenCalledWith('Copa');
    expect(ApiUsage.create).toHaveBeenCalled();
    expect(res.updated).toBe(1);
  });

  it('skips when called before interval', async () => {
    ApiUsage.findOne.mockResolvedValue({ lastUsed: new Date() });

    const res = await updateResults('Copa');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(Match.updateOne).not.toHaveBeenCalled();
    expect(updateEliminationMatches).not.toHaveBeenCalled();
    expect(res.skipped).toBe(true);
  });
});
