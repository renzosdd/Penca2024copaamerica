const request = require('supertest');
const express = require('express');

jest.mock('../utils/bracket', () => ({
  updateEliminationMatches: jest.fn(),
  invalidateGroupStandings: jest.fn()
}));
jest.mock('../utils/matchCache', () => ({ invalidate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../utils/rankingCache', () => ({ invalidate: jest.fn().mockResolvedValue(undefined) }));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next())
}));

const { updateEliminationMatches } = require('../utils/bracket');
const adminRouter = require('../routes/admin');
const { DEFAULT_COMPETITION } = require('../config');

describe('recalculate bracket route', () => {
  afterEach(() => jest.clearAllMocks());

  it('triggers bracket recalculation for the World Cup', async () => {
    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/recalculate-bracket');

    expect(res.status).toBe(200);
    expect(updateEliminationMatches).toHaveBeenCalledWith(DEFAULT_COMPETITION);
  });
});
