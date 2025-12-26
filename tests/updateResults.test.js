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

jest.mock('../models/Competition', () => ({
  findOne: jest.fn()
}));

const Match = require('../models/Match');
const ApiUsage = require('../models/ApiUsage');
const Competition = require('../models/Competition');
const { updateEliminationMatches } = require('../utils/bracket');

describe('updateResults script', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.SPORTSDB_API_KEY = 'k';
    process.env.SPORTSDB_LEAGUE_ID = '1';
    process.env.SPORTSDB_SEASON = '2024';
    process.env.SPORTSDB_API_URL = 'http://api';
    process.env.SPORTSDB_UPDATE_INTERVAL = '3600000';
    Competition.findOne.mockResolvedValue({ apiLeagueId: 1, apiSeason: 2024 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates matches from API', async () => {
    ApiUsage.findOne.mockResolvedValue(null);
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          {
            idEvent: '10',
            intHomeScore: 2,
            intAwayScore: 1
          }
        ]
      })
    });

    const res = await updateResults('Copa');

    expect(Competition.findOne).toHaveBeenCalledWith({ name: 'Copa' });
    expect(global.fetch).toHaveBeenCalledWith('http://api/k/eventsseason.php?id=1&season=2024');
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

    expect(Competition.findOne).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(Match.updateOne).not.toHaveBeenCalled();
    expect(updateEliminationMatches).not.toHaveBeenCalled();
    expect(res.skipped).toBe(true);
  });
});
