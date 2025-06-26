const request = require('supertest');
const express = require('express');

jest.mock('../models/Penca', () => {
  return jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
});

jest.mock('../models/Competition', () => {
  const CompetitionMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  CompetitionMock.find = jest.fn();
  return CompetitionMock;
});

jest.mock('../models/Match', () => ({
  insertMany: jest.fn()
}));

jest.mock('../models/User', () => {
  const UserMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  UserMock.findById = jest.fn();
  UserMock.findOne = jest.fn();
  UserMock.deleteOne = jest.fn();
  return UserMock;
});

jest.mock('../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next())
}));

const Penca = require('../models/Penca');
const Match = require('../models/Match');
const User = require('../models/User');
const Competition = require('../models/Competition');
const adminRouter = require('../routes/admin');

describe('Admin penca creation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a penca and loads matches', async () => {
    User.findById.mockResolvedValue({ _id: 'u1', ownedPencas: [], save: jest.fn().mockResolvedValue(true) });
    Match.insertMany.mockResolvedValue([{ _id: 'm1' }]);

    const app = express();
    app.use('/admin', adminRouter);

    const fixture = [{ team1: 'A', team2: 'B' }];

    const res = await request(app)
      .post('/admin/pencas')
      .field('name', 'Test')
      .field('owner', 'u1')
      .field('participantLimit', '10')
      .attach('fixture', Buffer.from(JSON.stringify(fixture)), 'fixture.json');

    expect(res.status).toBe(201);
    expect(Penca).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test',
      owner: 'u1',
      participantLimit: 10
    }));
    expect(Match.insertMany).toHaveBeenCalled();
  });
});

describe('Admin competition creation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a competition with fixture', async () => {
    Match.insertMany.mockResolvedValue([{ _id: 'm1' }]);

    const app = express();
    app.use('/admin', adminRouter);

    const fixture = [{ team1: 'A', team2: 'B' }];

    const res = await request(app)
      .post('/admin/competitions')
      .field('name', 'Copa Test')
      .attach('fixture', Buffer.from(JSON.stringify(fixture)), 'fixture.json');

    expect(res.status).toBe(201);
    expect(Competition).toHaveBeenCalledWith(expect.objectContaining({ name: 'Copa Test' }));
    expect(Match.insertMany).toHaveBeenCalled();
  });

  it('lists competitions', async () => {
    Competition.find.mockResolvedValue([{ name: 'Copa Test' }]);

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).get('/admin/competitions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ name: 'Copa Test' }]);
  });
});

describe('Admin owner creation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new owner', async () => {
    User.findOne.mockResolvedValue(null);

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/owners')
      .send({ username: 'owner1', password: 'pass', email: 'o1@example.com' });

    expect(res.status).toBe(201);
    expect(User).toHaveBeenCalledWith(expect.objectContaining({
      username: 'owner1',
      email: 'o1@example.com',
      role: 'owner'
    }));
  });

  it('fails when username or email exists', async () => {
    User.findOne.mockResolvedValue({ _id: 'exists' });

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/owners')
      .send({ username: 'owner1', password: 'pass', email: 'o1@example.com' });

    expect(res.status).toBe(409);
  });
});

describe('Admin owner update and delete', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates an owner', async () => {
    const owner = { _id: 'o1', role: 'owner', save: jest.fn().mockResolvedValue(true) };
    User.findById.mockResolvedValue(owner);

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .put('/admin/owners/o1')
      .send({ username: 'new' });

    expect(res.status).toBe(200);
    expect(owner.save).toHaveBeenCalled();
    expect(owner.username).toBe('new');
  });

  it('deletes an owner', async () => {
    const owner = { _id: 'o1', role: 'owner' };
    User.findById.mockResolvedValue(owner);
    User.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).delete('/admin/owners/o1');

    expect(res.status).toBe(200);
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'o1' });
  });
});
