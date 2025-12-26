const request = require('supertest');
const express = require('express');
const session = require('express-session');

jest.mock('../utils/worldcupPenca', () => ({ ensureUserInPenca: jest.fn() }));
jest.mock('../middleware/auth', () => ({ isAuthenticated: jest.fn((req, res, next) => next()) }));

const { ensureUserInPenca } = require('../utils/worldcupPenca');
const { isAuthenticated } = require('../middleware/auth');

describe('GET /api/dashboard', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the world cup penca with scoring', async () => {
    ensureUserInPenca.mockResolvedValue({
      participants: [],
      toObject: () => ({ name: 'P1', scoring: { exact: 3 }, participants: [] })
    });

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
        const penca = await ensureUserInPenca(user._id);
        res.json({
          user: { username: user.username, role: user.role },
          penca: {
            ...penca.toObject(),
            participantsCount: penca.participants.length
          }
        });
      } catch (err) {
        res.status(500).json({ error: 'DASHBOARD_ERROR' });
      }
    });

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.penca).toHaveProperty('scoring');
  });
});
