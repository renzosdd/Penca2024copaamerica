const request = require('supertest');
const express = require('express');

jest.mock('../models/Match', () => ({ find: jest.fn() }));

const Match = require('../models/Match');
const competitionsRouter = require('../routes/competitions');

describe('Competitions Routes', () => {
  afterEach(() => jest.clearAllMocks());

  it('lists matches for a competition', async () => {
    Match.find.mockResolvedValue([{ _id: 'm1' }]);

    const app = express();
    app.use('/competitions', competitionsRouter);

    const res = await request(app).get('/competitions/c1/matches');

    expect(res.status).toBe(200);
    expect(Match.find).toHaveBeenCalledWith({ competition: 'c1' });
    expect(res.body[0]._id).toBe('m1');
  });
});
