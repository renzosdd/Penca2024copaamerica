const request = require('supertest');
const express = require('express');
const Match = require('../models/Match');
const { updateEliminationMatches } = require('../utils/bracket');

jest.mock('../models/Match', () => ({
  find: jest.fn(),
  updateOne: jest.fn(),
  insertMany: jest.fn()
}));

jest.mock('../models/Competition', () => {
  const CompetitionMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  return CompetitionMock;
});

jest.mock('../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next())
}));

const adminRouter = require('../routes/admin');

describe('updateEliminationMatches World Cup style', () => {
  afterEach(() => jest.clearAllMocks());

  it('replaces Round of 32 placeholders with group winners and runners-up', async () => {
    const matches = [];
    const groups = 'ABCDEFGHIJKL'.split('');
    for (const g of groups) {
      matches.push({ competition: 'WC', group_name: `Grupo ${g}`, team1: `${g}1`, team2: `${g}2`, result1: 1, result2: 0 });
    }
    // First call for calculateGroupStandings, then for quarters and semis
    Match.find.mockResolvedValueOnce(matches).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await updateEliminationMatches('WC');

    expect(Match.updateOne).toHaveBeenCalledWith(
      { competition: 'WC', group_name: 'Ronda de 32', $or: [{ team1: 'A1' }, { team2: 'A1' }] },
      expect.any(Array)
    );
    expect(Match.updateOne).toHaveBeenCalledWith(
      { competition: 'WC', group_name: 'Ronda de 32', $or: [{ team1: 'B2' }, { team2: 'B2' }] },
      expect.any(Array)
    );
    expect(Match.updateOne).toHaveBeenCalledTimes(24);
  });
});

describe('competition creation knockout defaults', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates Copa America style matches', async () => {
    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/competitions')
      .field('name', 'Copa')
      .field('groupsCount', '4')
      .field('integrantsPerGroup', '4');

    expect(res.status).toBe(201);
    expect(Match.insertMany).toHaveBeenCalledTimes(2);
    const elim = Match.insertMany.mock.calls[1][0];
    expect(elim[0]).toHaveProperty('group_name', 'Cuartos de final');
    expect(elim[elim.length - 1]).toHaveProperty('group_name', 'Final');
  });

  it('creates World Cup style Round of 32', async () => {
    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/competitions')
      .field('name', 'Mundial')
      .field('groupsCount', '6')
      .field('integrantsPerGroup', '4');

    expect(res.status).toBe(201);
    expect(Match.insertMany).toHaveBeenCalledTimes(2);
    const elim = Match.insertMany.mock.calls[1][0];
    expect(elim.some(m => m.group_name === 'Ronda de 32')).toBe(true);
  });
});
