const { fetchFixturesWithThrottle } = require('../scripts/apiFootball');

jest.mock('../models/ApiUsage', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  prototype: { save: jest.fn() }
}));

beforeEach(() => {
  global.fetch = jest.fn();
  process.env.FOOTBALL_API_KEY = 'k';
  process.env.FOOTBALL_LEAGUE_ID = '1';
  process.env.FOOTBALL_SEASON = '2024';
  process.env.FOOTBALL_API_URL = 'http://api';
  process.env.FOOTBALL_UPDATE_INTERVAL = '3600000';
});

afterEach(() => jest.clearAllMocks());

const ApiUsage = require('../models/ApiUsage');

test('fetches fixtures and records usage', async () => {
  ApiUsage.findOne.mockResolvedValue(null);
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ response: [{ fixture: { id: 1 } }] })
  });

  const { fixtures, skipped } = await fetchFixturesWithThrottle('createCompetition', 'Copa', 1, 2024);

  expect(skipped).toBe(false);
  expect(global.fetch).toHaveBeenCalledWith(
    'http://api/fixtures?league=1&season=2024',
    { headers: { 'x-apisports-key': 'k' } }
  );
  expect(ApiUsage.create).toHaveBeenCalled();
  expect(fixtures.length).toBe(1);
});

test('skips when interval not elapsed', async () => {
  ApiUsage.findOne.mockResolvedValue({ lastUsed: new Date() });

  const { skipped } = await fetchFixturesWithThrottle('createCompetition', 'Copa', 1, 2024);

  expect(skipped).toBe(true);
  expect(global.fetch).not.toHaveBeenCalled();
});
