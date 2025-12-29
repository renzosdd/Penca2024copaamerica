const importMatches = require('../scripts/importMatches');
const Match = require('../models/Match');
const Competition = require('../models/Competition');
const { updateEliminationMatches } = require('../utils/bracket');
const rankingCache = require('../utils/rankingCache');
const { fetchEventsWithThrottle } = require('../scripts/sportsDb');
const fs = require('fs/promises');

jest.mock('../models/Match', () => ({
  updateOne: jest.fn()
}));

jest.mock('../models/Competition', () => ({
  findOne: jest.fn()
}));

jest.mock('../utils/bracket', () => ({
  updateEliminationMatches: jest.fn()
}));

jest.mock('../utils/rankingCache', () => ({
  invalidate: jest.fn()
}));

jest.mock('../scripts/sportsDb', () => ({
  fetchEventsWithThrottle: jest.fn()
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));

const fixtureMatches = [
  {
    id: 'match-1',
    stage: 'Fase de grupos',
    group: 'Grupo A',
    team1: 'A1',
    team2: 'A2',
    kickoff: '2026-06-08T12:00-05:00',
    originalKickoff: {
      date: '2026-06-08',
      time: '12:00',
      timezone: 'America/Mexico_City'
    },
    venue: {
      country: 'México',
      city: 'Ciudad de México',
      stadium: 'Estadio Azteca'
    },
    order: 0
  },
  {
    id: 'match-2',
    stage: 'Fase de grupos',
    group: 'Grupo A',
    team1: 'A3',
    team2: 'A4',
    kickoff: '2026-06-09T12:00-05:00',
    originalKickoff: {
      date: '2026-06-09',
      time: '12:00',
      timezone: 'America/Mexico_City'
    },
    venue: {
      country: 'México',
      city: 'Guadalajara',
      stadium: 'Estadio Akron'
    },
    order: 1
  }
];

beforeEach(() => {
  Competition.findOne.mockResolvedValue({ apiLeagueId: '1', apiSeason: '2026' });
  fetchEventsWithThrottle.mockResolvedValue({ events: [], skipped: false });
  fs.readFile.mockImplementation((filePath) => {
    if (filePath.includes('worldcup2026.json')) {
      return Promise.resolve(JSON.stringify({ matches: fixtureMatches }));
    }
    const error = new Error('not found');
    error.code = 'ENOENT';
    return Promise.reject(error);
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('imports fixture matches when events are empty and fallback is enabled', async () => {
  const result = await importMatches('Mundial 2026', { allowFixtureFallback: true });

  expect(result.imported).toBe(2);
  expect(Match.updateOne).toHaveBeenCalledTimes(2);
  expect(Match.updateOne).toHaveBeenNthCalledWith(
    1,
    { competition: 'Mundial 2026', importId: 'fixture:match-1' },
    expect.objectContaining({
      $set: expect.objectContaining({
        team1: 'A1',
        team2: 'A2',
        group_name: 'Grupo A'
      }),
      $setOnInsert: { importId: 'fixture:match-1' }
    }),
    { upsert: true }
  );
  expect(Match.updateOne).toHaveBeenNthCalledWith(
    2,
    { competition: 'Mundial 2026', importId: 'fixture:match-2' },
    expect.objectContaining({
      $set: expect.objectContaining({
        team1: 'A3',
        team2: 'A4',
        group_name: 'Grupo A'
      }),
      $setOnInsert: { importId: 'fixture:match-2' }
    }),
    { upsert: true }
  );
  expect(updateEliminationMatches).toHaveBeenCalledWith('Mundial 2026');
  expect(rankingCache.invalidate).toHaveBeenCalledWith({ competition: 'Mundial 2026' });
});
