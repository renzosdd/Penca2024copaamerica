const request = require('supertest');
const express = require('express');

jest.mock('../models/User', () => ({ find: jest.fn() }));
jest.mock('../models/Match', () => ({ find: jest.fn() }));
jest.mock('../models/Prediction', () => ({ find: jest.fn() }));
jest.mock('../utils/worldcupPenca', () => ({ ensureWorldCupPenca: jest.fn() }));
jest.mock('../utils/rankingCache', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined)
}));

const User = require('../models/User');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');
const { ensureWorldCupPenca } = require('../utils/worldcupPenca');
const rankingRouter = require('../routes/ranking');

describe('GET /ranking', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns an array of scores', async () => {
    ensureWorldCupPenca.mockResolvedValue({ _id: 'p1', participants: ['u1'], competition: 'Mundial 2026' });
    User.find.mockResolvedValue([{ _id: 'u1', username: 'testuser' }]);
    Match.find.mockResolvedValue([{ _id: 'm1', result1: 1, result2: 0 }]);
    Prediction.find.mockResolvedValue([
      { userId: 'u1', matchId: 'm1', result1: 1, result2: 0 },
    ]);

    const app = express();
    app.use('/ranking', rankingRouter);

    const res = await request(app).get('/ranking');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0]).toHaveProperty('score');
  });

  it('filters scores by penca participants', async () => {
    ensureWorldCupPenca.mockResolvedValue({ _id: 'p1', participants: ['u1'], competition: 'Mundial 2026' });
    User.find.mockResolvedValue([
      { _id: 'u1', username: 'u1' },
      { _id: 'u2', username: 'u2' }
    ]);
    Match.find.mockResolvedValue([{ _id: 'm1', result1: 1, result2: 0 }]);
    Prediction.find.mockResolvedValue([
      { pencaId: 'p1', userId: 'u1', matchId: 'm1', result1: 1, result2: 0 },
      { pencaId: 'p1', userId: 'u2', matchId: 'm1', result1: 1, result2: 0 }
    ]);

    const app = express();
    app.use('/ranking', rankingRouter);

    const res = await request(app).get('/ranking');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].userId).toBe('u1');
  });

  it('shows participants with zero points before completed matches', async () => {
    ensureWorldCupPenca.mockResolvedValue({ _id: 'p1', participants: ['u1', 'u2'], competition: 'Mundial 2026' });
    User.find.mockResolvedValue([
      { _id: 'u1', username: 'u1', displayName: 'Jugador Uno' },
      { _id: 'u2', username: 'u2', displayName: 'Jugador Dos' }
    ]);
    Match.find.mockResolvedValue([{ _id: 'm1', result1: null, result2: null }]);
    Prediction.find.mockResolvedValue([]);

    const app = express();
    app.use('/ranking', rankingRouter);

    const res = await request(app).get('/ranking');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items.map(item => item.score)).toEqual([0, 0]);
    expect(Prediction.find).not.toHaveBeenCalled();
  });
});
