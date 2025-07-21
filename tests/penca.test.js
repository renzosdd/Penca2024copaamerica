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

describe('Penca join flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('joins penca with valid code', async () => {
    const penca = {
      _id: 'p1',
      participants: [],
      pendingRequests: [],
      participantLimit: 10,
      save: jest.fn().mockResolvedValue(true)
    };
    Penca.findOne = jest.fn().mockResolvedValue(penca);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'u1', role: 'user', pencas: [] } }; next(); });
    app.use('/pencas', pencaRouter);

    const res = await request(app)
      .post('/pencas/join')
      .send({ code: 'CODE' });

    expect(res.status).toBe(200);
    expect(penca.pendingRequests).toContain('u1');
    expect(penca.save).toHaveBeenCalled();
  });

  it('returns 404 when code is invalid', async () => {
    Penca.findOne = jest.fn().mockResolvedValue(null);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'u1', role: 'user', pencas: [] } }; next(); });
    app.use('/pencas', pencaRouter);

    const res = await request(app)
      .post('/pencas/join')
      .send({ code: 'BAD', competition: 'C1' });

    expect(res.status).toBe(404);
    expect(Penca.findOne).toHaveBeenCalledWith({ code: 'BAD', competition: 'C1' });
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

describe('Penca listing includes code', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns code when listing all pencas', async () => {
    const query = { select: jest.fn().mockResolvedValue([{ name: 'P1', code: 'ABCD' }]) };
    Penca.find = jest.fn().mockReturnValue(query);

    const app = express();
    app.use('/pencas', pencaRouter);

    const res = await request(app).get('/pencas');
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('code', 'ABCD');
  });

  it('returns code for owner pencas', async () => {
    const pencaData = [{ name: 'P2', code: 'EFGH', participants: [], pendingRequests: [] }];
    const query = { select: jest.fn(() => query), populate: jest.fn() };
    query.select.mockReturnValue(query);
    query.populate
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce(pencaData);
    Penca.find = jest.fn().mockReturnValue(query);

    const app = express();
    app.use((req, res, next) => { req.session = { user: { _id: 'o1' } }; next(); });
    app.use('/pencas', pencaRouter);

    const res = await request(app).get('/pencas/mine');
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('code', 'EFGH');
  });
});

describe('Penca rules and prizes update', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates rules and prizes', async () => {
    const penca = {
      _id: 'p1',
      owner: 'o1',
      save: jest.fn().mockResolvedValue(true)
    };
    Penca.findById = jest.fn().mockResolvedValue(penca);

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.session = { user: { _id: 'o1' } }; next(); });
    app.use('/pencas', pencaRouter);

    const res = await request(app)
      .put('/pencas/p1')
      .send({ rules: 'new', prizes: 'prize' });

    expect(res.status).toBe(200);
    expect(penca.rules).toBe('new');
    expect(penca.prizes).toBe('prize');
    expect(penca.save).toHaveBeenCalled();
  });
});
