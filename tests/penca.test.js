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

describe('Penca participant approval and removal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('approves a pending participant', async () => {
    const penca = {
      _id: 'p1',
      owner: 'o1',
      participants: [],
      pendingRequests: ['u2'],
      save: jest.fn().mockResolvedValue(true)
    };
    Penca.findById = jest.fn().mockResolvedValue(penca);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'o1' } }; next(); });
    app.use('/pencas', pencaRouter);

    const res = await request(app).post('/pencas/approve/p1/u2');

    expect(res.status).toBe(200);
    expect(penca.pendingRequests).toEqual([]);
    expect(penca.participants).toContain('u2');
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'u2' }, { $addToSet: { pencas: penca._id } });
  });

  it('removes a participant', async () => {
    const penca = {
      _id: 'p1',
      owner: 'o1',
      participants: ['u2'],
      pendingRequests: [],
      save: jest.fn().mockResolvedValue(true)
    };
    Penca.findById = jest.fn().mockResolvedValue(penca);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'o1' } }; next(); });
    app.use('/pencas', pencaRouter);

    const res = await request(app).delete('/pencas/participant/p1/u2');

    expect(res.status).toBe(200);
    expect(penca.participants).not.toContain('u2');
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'u2' }, { $pull: { pencas: penca._id } });
  });
});
