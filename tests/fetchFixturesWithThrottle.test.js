const { fetchEventsWithThrottle } = require('../scripts/sportsDb');

jest.mock('../models/ApiUsage', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  prototype: { save: jest.fn() }
}));

beforeEach(() => {
  global.fetch = jest.fn();
  process.env.SPORTSDB_API_KEY = 'k';
  process.env.SPORTSDB_LEAGUE_ID = '1';
  process.env.SPORTSDB_SEASON = '2024';
  process.env.SPORTSDB_API_URL = 'http://api';
  process.env.SPORTSDB_UPDATE_INTERVAL = '3600000';
});

afterEach(() => jest.clearAllMocks());

const ApiUsage = require('../models/ApiUsage');

test('fetches events and records usage', async () => {
  ApiUsage.findOne.mockResolvedValue(null);
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ events: [{ idEvent: '1' }] })
  });

  const { events, skipped } = await fetchEventsWithThrottle('createCompetition', 'Copa', 1, 2024);

  expect(skipped).toBe(false);
  expect(global.fetch).toHaveBeenCalledWith(
    'http://api/k/eventsseason.php?id=1&season=2024'
  );
  expect(ApiUsage.create).toHaveBeenCalled();
  expect(events.length).toBe(1);
});

test('skips when interval not elapsed', async () => {
  ApiUsage.findOne.mockResolvedValue({ lastUsed: new Date() });

  const { skipped } = await fetchEventsWithThrottle('createCompetition', 'Copa', 1, 2024);

  expect(skipped).toBe(true);
  expect(global.fetch).not.toHaveBeenCalled();
});
