const request = require('supertest');
const express = require('express');

jest.mock('../models/Penca', () => {
  const PencaMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  PencaMock.findById = jest.fn();
  PencaMock.findByIdAndDelete = jest.fn();
  return PencaMock;
});

jest.mock('../models/Competition', () => {
  const CompetitionMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  CompetitionMock.find = jest.fn();
  CompetitionMock.findById = jest.fn();
  CompetitionMock.findByIdAndDelete = jest.fn();
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
  UserMock.updateOne = jest.fn();
  UserMock.find = jest.fn();
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

// -----------------------------
// TESTS
// -----------------------------

describe('Admin penca creation', () => {
  afterEach(() => jest.clearAllMocks());

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
      .field('competition', 'Comp1')
      .attach('fixture', Buffer.from(JSON.stringify(fixture)), 'fixture.json');

    expect(res.status).toBe(201);
    expect(Penca).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test',
      owner: 'u1',
      participantLimit: 10,
      competition: 'Comp1'
    }));
    expect(Match.insertMany).toHaveBeenCalled();
  });
});

describe('Admin penca listing', () => {
  afterEach(() => jest.clearAllMocks());

  it('lists pencas with codes', async () => {
    const query = { select: jest.fn().mockResolvedValue([{ name: 'P1', code: 'ABCD' }]) };
    Penca.find.mockReturnValue(query);

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).get('/admin/pencas');

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('code', 'ABCD');
  });
});

describe('Admin competition creation', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a competition', async () => {
    Match.insertMany.mockResolvedValue([{ _id: 'm1' }]);

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/competitions')
      .send({ name: 'Copa Test', groupsCount: 1, integrantsPerGroup: 2 });

    expect(res.status).toBe(201);
    expect(Competition).toHaveBeenCalledWith(expect.objectContaining({ name: 'Copa Test' }));
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
  afterEach(() => jest.clearAllMocks());

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
  afterEach(() => jest.clearAllMocks());

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

describe('Admin competition modification', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates a competition', async () => {
    const comp = { _id: 'c1', save: jest.fn().mockResolvedValue(true) };
    Competition.findById.mockResolvedValue(comp);

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .put('/admin/competitions/c1')
      .send({ name: 'New' });

    expect(res.status).toBe(200);
    expect(comp.name).toBe('New');
    expect(comp.save).toHaveBeenCalled();
  });

  it('deletes a competition', async () => {
    Competition.findByIdAndDelete.mockResolvedValue({ _id: 'c1' });

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).delete('/admin/competitions/c1');

    expect(res.status).toBe(200);
  });
});

describe('Admin penca modification', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates a penca owner', async () => {
    const penca = { _id: 'p1', owner: 'u1', save: jest.fn().mockResolvedValue(true) };
    Penca.findById.mockResolvedValue(penca);
    User.findById.mockResolvedValue({ _id: 'u2' });

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .put('/admin/pencas/p1')
      .send({ owner: 'u2' });

    expect(res.status).toBe(200);
    expect(penca.owner).toBe('u2');
    expect(User.updateOne).toHaveBeenCalled();
  });

  it('updates a penca competition', async () => {
    const penca = { _id: 'p1', save: jest.fn().mockResolvedValue(true) };
    Penca.findById.mockResolvedValue(penca);

    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .put('/admin/pencas/p1')
      .send({ competition: 'NewComp' });

    expect(res.status).toBe(200);
    expect(penca.competition).toBe('NewComp');
  });

  it('deletes a penca', async () => {
    Penca.findByIdAndDelete.mockResolvedValue({ _id: 'p1', owner: 'u1' });

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).delete('/admin/pencas/p1');

    expect(res.status).toBe(200);
    expect(User.updateOne).toHaveBeenCalled();
  });
});

describe('Admin edit pagination', () => {
  afterEach(() => jest.clearAllMocks());

  it('paginates users based on query', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ username: 'u1' }])
    };
    User.find.mockReturnValue(query);

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app)
      .get('/admin/edit')
      .query({ page: '2', limit: '5' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(5);
  });
});
