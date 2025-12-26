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

const buildAdminApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = { user: { _id: 'admin1', role: 'admin' } };
    next();
  });
  app.use('/admin', adminRouter);
  return app;
};

// -----------------------------
// TESTS
// -----------------------------

describe('Admin penca creation', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a penca without fixture', async () => {
    const app = buildAdminApp();

    const res = await request(app)
      .post('/admin/pencas')
      .field('name', 'Test')
      .field('participantLimit', '10')
      .field('competition', 'Comp1');


    expect(res.status).toBe(201);
    expect(Penca).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test',
      owner: 'admin1',
      participantLimit: 10,
      competition: 'Comp1'
    }));
    expect(Match.insertMany).not.toHaveBeenCalled();
  });
});

describe('Admin penca listing', () => {
  afterEach(() => jest.clearAllMocks());

  it('lists pencas with codes', async () => {
    const query = { select: jest.fn().mockResolvedValue([{ name: 'P1', code: 'ABCD' }]) };
    Penca.find.mockReturnValue(query);

    const app = buildAdminApp();

    const res = await request(app).get('/admin/pencas');

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('code', 'ABCD');
  });
});

describe('Admin competition creation', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a competition', async () => {
    Match.insertMany.mockResolvedValue([{ _id: 'm1' }]);

    const app = buildAdminApp();

    const res = await request(app)
      .post('/admin/competitions')
      .send({
        name: 'Copa Test',
        tournament: 'Tourn',
        country: 'AR',
        seasonStart: '2024-01-01',
        seasonEnd: '2024-12-31'
      });

    expect(res.status).toBe(201);
    expect(Competition).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Copa Test',
        tournament: 'Tourn',
        country: 'AR'
      })
    );
    expect(Match.insertMany).not.toHaveBeenCalled();

  });

  it('creates a competition with fixture', async () => {
    Match.insertMany.mockResolvedValue([{ _id: 'm1' }]);

    const app = buildAdminApp();

    const fixture = [
      { date: '2024-06-01', time: '10:00', team1: 'A', team2: 'B', group_name: 'Grupo A', series: 'Fase de grupos', tournament: 'Copa' }
    ];

    const res = await request(app)
      .post('/admin/competitions')
      .send({ name: 'Copa', fixture });

    expect(res.status).toBe(201);
    expect(Match.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ team1: 'A', team2: 'B', competition: 'Copa' })
      ])
    );
  });

  it('creates a competition with fixture JSON', async () => {
    Match.insertMany.mockResolvedValue([{ _id: 'm1' }]);

    const app = buildAdminApp();

    const fixture = [
      { date: '2024-06-01', time: '10:00', team1: 'A', team2: 'B', group_name: 'Grupo A', series: 'Fase de grupos', tournament: 'Copa' }
    ];

    const res = await request(app)
      .post('/admin/competitions')
      .field('name', 'Copa')
      .attach('fixtureFile', Buffer.from(JSON.stringify(fixture)), 'fixture.json');

    expect(res.status).toBe(201);
    expect(Match.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ team1: 'A', team2: 'B', competition: 'Copa' })
      ])
    );
  });

  it('rejects fixture missing required fields', async () => {
    const app = buildAdminApp();

    const fixture = [
      { date: '2024-06-01', team1: 'A', team2: 'B', group_name: 'Grupo A', series: 'Fase de grupos', tournament: 'Copa' }
    ];

    const res = await request(app)
      .post('/admin/competitions')
      .send({ name: 'Copa', fixture });

    expect(res.status).toBe(400);
    expect(Match.insertMany).not.toHaveBeenCalled();
  });

  it('rejects fixture with mismatched match count', async () => {
    const app = buildAdminApp();

    const fixture = [
      { date: '2024-06-01', time: '10:00', team1: 'A', team2: 'B', group_name: 'Grupo A', series: 'Fase de grupos', tournament: 'Copa' }
    ];

    const res = await request(app)
      .post('/admin/competitions')
      .send({ name: 'Copa', fixture, expectedMatches: 2 });

    expect(res.status).toBe(400);
  });

  it('rejects duplicate matches', async () => {
    const app = buildAdminApp();

    const fixture = [
      { date: '2024-06-01', time: '10:00', team1: 'A', team2: 'B', group_name: 'Grupo A', series: 'Fase de grupos', tournament: 'Copa' },
      { date: '2024-06-01', time: '10:00', team1: 'A', team2: 'B', group_name: 'Grupo A', series: 'Fase de grupos', tournament: 'Copa' }
    ];

    const res = await request(app)
      .post('/admin/competitions')
      .send({ name: 'Copa', fixture, expectedMatches: 2 });

    expect(res.status).toBe(400);
  });

  it('lists competitions', async () => {
    Competition.find.mockResolvedValue([{ name: 'Copa Test' }]);

    const app = buildAdminApp();

    const res = await request(app).get('/admin/competitions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ name: 'Copa Test' }]);
  });
});

describe('Admin competition modification', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates a competition', async () => {
    const comp = { _id: 'c1', save: jest.fn().mockResolvedValue(true) };
    Competition.findById.mockResolvedValue(comp);

    const app = buildAdminApp();

    const res = await request(app)
      .put('/admin/competitions/c1')
      .send({ name: 'New', tournament: 'TNew' });

    expect(res.status).toBe(200);
    expect(comp.name).toBe('New');
    expect(comp.tournament).toBe('TNew');
    expect(comp.save).toHaveBeenCalled();
  });

  it('deletes a competition', async () => {
    Competition.findByIdAndDelete.mockResolvedValue({ _id: 'c1' });

    const app = buildAdminApp();

    const res = await request(app).delete('/admin/competitions/c1');

    expect(res.status).toBe(200);
  });
});

describe('Admin penca modification', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates a penca competition', async () => {
    const penca = { _id: 'p1', save: jest.fn().mockResolvedValue(true) };
    Penca.findById.mockResolvedValue(penca);

    const app = buildAdminApp();

    const res = await request(app)
      .put('/admin/pencas/p1')
      .send({ competition: 'NewComp' });

    expect(res.status).toBe(200);
    expect(penca.competition).toBe('NewComp');
  });

  it('deletes a penca', async () => {
    Penca.findByIdAndDelete.mockResolvedValue({ _id: 'p1', owner: 'u1' });

    const app = buildAdminApp();

    const res = await request(app).delete('/admin/pencas/p1');

    expect(res.status).toBe(200);
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

    const app = buildAdminApp();

    const res = await request(app)
      .get('/admin/edit')
      .query({ page: '2', limit: '5' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(5);
  });
});
