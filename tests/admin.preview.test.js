const request = require('supertest');
const express = require('express');

jest.mock('../scripts/apiFootball', () => ({
  fetchCompetitionData: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next())
}));

const { fetchCompetitionData } = require('../scripts/apiFootball');
const adminRouter = require('../routes/admin');

describe('Admin competition preview', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns parsed groups and matches', async () => {
    fetchCompetitionData.mockResolvedValue({
      league: { league: { name: 'L' } },
      fixtures: [
        {
          fixture: { id: 1, date: '2024-06-01T10:00' },
          teams: { home: { name: 'A' }, away: { name: 'B' } },
          league: { round: 'Grupo A' }
        }
      ]
    });

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/competitions/preview')
      .send({ apiLeagueId: 1, apiSeason: 2024 });

    expect(res.status).toBe(200);
    expect(fetchCompetitionData).toHaveBeenCalledWith(1, 2024);
    expect(res.body.matches.length).toBe(1);
    expect(res.body.groups[0]).toEqual({ name: 'Grupo A', teams: ['A', 'B'] });
  });

  it('returns 400 for invalid input', async () => {
    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/competitions/preview')
      .send({ apiLeagueId: 'x', apiSeason: 2024 });

    expect(res.status).toBe(400);
    expect(fetchCompetitionData).not.toHaveBeenCalled();
  });
});
