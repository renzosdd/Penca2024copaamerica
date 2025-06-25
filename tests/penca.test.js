const request = require('supertest');
const express = require('express');

jest.mock('../models/Penca', () => {
  return jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
});

jest.mock('../models/User', () => ({
  updateOne: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => next())
}));

const Penca = require('../models/Penca');
const User = require('../models/User');
const pencaRouter = require('../routes/penca');

describe('Penca Routes creation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not add owner to participants when creating', async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'u1' } }; next(); });
    app.use('/pencas', pencaRouter);

    const res = await request(app)
      .post('/pencas')
      .send({ name: 'Test', participantLimit: 10 });

    expect(res.status).toBe(201);
    expect(Penca.mock.calls[0][0].participants).toEqual([]);
  });
});

describe('Penca join role check', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects join when user role is not "user"', async () => {
    require('../models/Penca').findOne = jest.fn();
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'u1', role: 'owner', pencas: [] } }; next(); });
    app.use('/pencas', pencaRouter);

    const res = await request(app)
      .post('/pencas/join')
      .send({ code: 'ABC' });

    expect(res.status).toBe(403);
    expect(require('../models/Penca').findOne).not.toHaveBeenCalled();
  });
});
