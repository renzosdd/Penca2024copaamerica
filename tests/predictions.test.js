const request = require('supertest');
const express = require('express');

jest.mock('../models/Prediction', () => {
  const PredictionMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  PredictionMock.find = jest.fn();
  PredictionMock.findOne = jest.fn();
  return PredictionMock;
});

jest.mock('../models/Match', () => ({
  findById: jest.fn()
}));

const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const predictionsRouter = require('../routes/predictions');
const { getMessage } = require('../utils/messages');

describe('Predictions Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('saves a new prediction', async () => {
    Prediction.findOne.mockResolvedValue(null);
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString().split('T')[0];
    Match.findById.mockResolvedValue({ date: futureDate, time: '23:59' });

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'u1', username: 'tester' } }; next(); });
    app.use('/predictions', predictionsRouter);

    const res = await request(app)
      .post('/predictions')
      .send({ matchId: 'm1', result1: 1, result2: 0 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(getMessage('PREDICTION_SAVED'));
    expect(Prediction).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', matchId: 'm1' }));
  });

  it('rejects prediction when match is less than 30 minutes away', async () => {
    Prediction.findOne.mockResolvedValue(null);
    const soon = new Date(Date.now() + 15 * 60 * 1000);
    const date = soon.toISOString().split('T')[0];
    const time = soon.toTimeString().slice(0,5);
    Match.findById.mockResolvedValue({ date, time });

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'u1', username: 'tester' } }; next(); });
    app.use('/predictions', predictionsRouter);

    const res = await request(app)
      .post('/predictions')
      .send({ matchId: 'm1', result1: 2, result2: 1 });

    expect(res.status).toBe(400);
  });

  it('rejects prediction with negative scores', async () => {
    Prediction.findOne.mockResolvedValue(null);
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString().split('T')[0];
    Match.findById.mockResolvedValue({ date: futureDate, time: '23:59' });

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'u1', username: 'tester' } }; next(); });
    app.use('/predictions', predictionsRouter);

    const res = await request(app)
      .post('/predictions')
      .send({ matchId: 'm1', result1: -1, result2: 0 });

    expect(res.status).toBe(400);
  });
});
