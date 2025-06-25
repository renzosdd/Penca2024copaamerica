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
    expect(res.body.message).toBe('Predicción guardada');
    expect(Prediction).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', matchId: 'm1' }));
  });
});
