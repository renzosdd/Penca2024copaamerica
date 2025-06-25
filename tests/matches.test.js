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
});
