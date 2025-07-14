const request = require('supertest');
const express = require('express');

jest.mock('../models/Match', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  isAdmin: jest.fn((req, res, next) => next())
}));

const Match = require('../models/Match');
const matchesRouter = require('../routes/matches');

describe('Match Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates match results', async () => {
    const save = jest.fn().mockResolvedValue(true);
    Match.findById.mockResolvedValue({ save });

    const app = express();
    app.use(express.json());
    app.use('/matches', matchesRouter);

    const res = await request(app)
      .post('/matches/1')
      .send({ result1: 2, result2: 1 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Match result updated');
    expect(save).toHaveBeenCalled();
  });

  it('updates match info', async () => {
    const match = { _id: '1', save: jest.fn().mockResolvedValue(true) };
    Match.findById.mockResolvedValue(match);

    const app = express();
    app.use(express.json());
    app.use('/matches', matchesRouter);

    const res = await request(app)
      .put('/matches/1')
      .send({ team1: 'A', team2: 'B', date: '2024-07-01', time: '20:00' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Match updated');
    expect(match.team1).toBe('A');
    expect(match.team2).toBe('B');
    expect(match.date).toBe('2024-07-01');
    expect(match.time).toBe('20:00');
    expect(match.save).toHaveBeenCalled();
  });

  it('recalculates bracket after editing results', async () => {
    const save = jest.fn().mockResolvedValue(true);
    Match.findById.mockResolvedValue({ _id: '1', competition: 'Copa', save });
    Match.find.mockResolvedValue([
      { competition: 'Copa', group_name: 'Grupo A', team1: 'A1', team2: 'A2', result1: 1, result2: 0 },
      { competition: 'Copa', group_name: 'Grupo B', team1: 'B1', team2: 'B2', result1: 0, result2: 2 },
      { competition: 'Copa', group_name: 'Grupo C', team1: 'C1', team2: 'C2', result1: 1, result2: 0 },
      { competition: 'Copa', group_name: 'Grupo D', team1: 'D1', team2: 'D2', result1: 0, result2: 3 },
      { competition: 'Copa', group_name: 'Cuartos de final', team1: 'Ganador A', team2: 'Segundo B' },
      { competition: 'Copa', group_name: 'Cuartos de final', team1: 'Ganador B', team2: 'Segundo A' },
      { competition: 'Copa', group_name: 'Cuartos de final', team1: 'Ganador D', team2: 'Segundo C' },
      { competition: 'Copa', group_name: 'Cuartos de final', team1: 'Ganador C', team2: 'Segundo D' }
    ]);

    const app = express();
    app.use(express.json());
    app.use('/matches', matchesRouter);

    const res = await request(app)
      .post('/matches/1')
      .send({ result1: 1, result2: 0 });

    expect(res.status).toBe(200);
    expect(Match.updateOne).toHaveBeenCalledWith(
      { competition: 'Copa', group_name: 'Cuartos de final', $or: [{ team1: 'Ganador A' }, { team2: 'Ganador A' }] },
      expect.any(Array)
    );
  });
});
