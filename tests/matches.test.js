const request = require('supertest');
const express = require('express');

jest.mock('../models/Match', () => ({
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  isAdmin: jest.fn((req, res, next) => next())
}));

const Match = require('../models/Match');
const matchesRouter = require('../routes/matches');

describe('Match Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates match results', async () => {
    const save = jest.fn().mockResolvedValue(true);
    Match.findById.mockResolvedValue({ save });

    const app = express();
    app.use(express.json());
    app.use('/matches', matchesRouter);

    const res = await request(app)
      .post('/matches/1')
      .send({ result1: 2, result2: 1 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Match result updated');
    expect(save).toHaveBeenCalled();
  });

  it('updates match info', async () => {
    const match = { _id: '1', save: jest.fn().mockResolvedValue(true) };
    Match.findById.mockResolvedValue(match);

    const app = express();
    app.use(express.json());
    app.use('/matches', matchesRouter);

    const res = await request(app)
      .put('/matches/1')
      .send({ team1: 'A', team2: 'B', date: '2024-07-01', time: '20:00' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Match updated');
    expect(match.team1).toBe('A');
    expect(match.team2).toBe('B');
    expect(match.date).toBe('2024-07-01');
    expect(match.time).toBe('20:00');
    expect(match.save).toHaveBeenCalled();
  });
});
