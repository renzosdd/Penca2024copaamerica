const request = require('supertest');
const express = require('express');
const session = require('express-session');

jest.mock('../models/Penca', () => ({ find: jest.fn() }));
jest.mock('../middleware/auth', () => ({ isAuthenticated: jest.fn((req, res, next) => next()) }));

const Penca = require('../models/Penca');
const { isAuthenticated } = require('../middleware/auth');

describe('GET /api/dashboard', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns pencas with scoring property', async () => {
    const query = { select: jest.fn().mockResolvedValue([{ name: 'P1', scoring: { exact: 3 } }]) };
    Penca.find.mockReturnValue(query);

    const app = express();
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    app.use((req, res, next) => {
      req.session.user = { _id: 'u1', username: 'user', role: 'user' };
      next();
    });

    app.get('/api/dashboard', isAuthenticated, async (req, res) => {
      const { user } = req.session;
      if (user.role === 'admin') {
        return res.status(403).json({ error: 'ADMIN_ONLY' });
      }
      try {
        const pencas = await Penca.find({ participants: user._id }).select('name _id competition fixture rules prizes scoring');
        res.json({ user: { username: user.username, role: user.role }, pencas });
      } catch (err) {
        res.status(500).json({ error: 'DASHBOARD_ERROR' });
      }
    });

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.pencas[0]).toHaveProperty('scoring');
    expect(query.select).toHaveBeenCalledWith('name _id competition fixture rules prizes scoring');
  });
});
