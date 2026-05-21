const request = require('supertest');
const express = require('express');

jest.mock('../models/Match', () => ({ find: jest.fn() }));
jest.mock('../scripts/importMatches', () => ({ importFixture: jest.fn() }));
jest.mock('../utils/matchCache', () => ({ invalidate: jest.fn().mockResolvedValue(undefined) }));

const Match = require('../models/Match');
const matchesRouter = require('../routes/matches');
const { DEFAULT_COMPETITION } = require('../config');

describe('Matches Routes', () => {
  afterEach(() => jest.clearAllMocks());

  it('lists matches for the World Cup competition', async () => {
    Match.find.mockResolvedValue([{ _id: 'm1' }]);

    const app = express();
    app.use('/matches', matchesRouter);

    const res = await request(app).get('/matches');

    expect(res.status).toBe(200);
    expect(Match.find).toHaveBeenCalledWith({ competition: DEFAULT_COMPETITION });
    expect(res.body[0]._id).toBe('m1');
  });
});
