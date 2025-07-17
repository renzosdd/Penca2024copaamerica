const request = require('supertest');
const express = require('express');

jest.mock('../models/Match', () => ({
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../utils/bracket', () => ({
  updateEliminationMatches: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next())
}));

const Match = require('../models/Match');
const { updateEliminationMatches } = require('../utils/bracket');
const adminRouter = require('../routes/admin');

describe('Admin match management', () => {
  afterEach(() => jest.clearAllMocks());

  it('lists matches for a competition', async () => {
    Match.find.mockResolvedValue([{ _id: 'm1' }]);

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).get('/admin/competitions/c1/matches');

    expect(res.status).toBe(200);
    expect(Match.find).toHaveBeenCalledWith({ competition: 'c1' });
    expect(res.body[0]._id).toBe('m1');
  });

  it('updates match info', async () => {
    const match = { _id: 'm1', competition: 'c1', save: jest.fn().mockResolvedValue(true) };
    Match.findById.mockResolvedValue(match);

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .put('/admin/competitions/c1/matches/m1')
      .send({ team1: 'A' });

    expect(res.status).toBe(200);
    expect(match.team1).toBe('A');
    expect(match.save).toHaveBeenCalled();
  });

  it('updates match result and recalculates bracket', async () => {
    const match = { _id: 'm1', competition: 'c1', save: jest.fn().mockResolvedValue(true) };
    Match.findById.mockResolvedValue(match);

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/competitions/c1/matches/m1')
      .send({ result1: 2, result2: 1 });

    expect(res.status).toBe(200);
    expect(match.result1).toBe(2);
    expect(match.result2).toBe(1);
    expect(updateEliminationMatches).toHaveBeenCalledWith('c1');
  });
});
