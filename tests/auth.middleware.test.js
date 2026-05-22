const request = require('supertest');
const express = require('express');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');

describe('auth middleware', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns JSON 401 for unauthenticated API routes', async () => {
    const app = express();
    app.get('/admin/matches', isAuthenticated, (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/admin/matches');

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error).toBe('No autorizado');
  });

  it('returns JSON 403 for non-admin API routes', async () => {
    const app = express();
    app.use((req, res, next) => {
      req.session = { user: { _id: 'u1', role: 'user' } };
      next();
    });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'u1', role: 'user' })
    });
    app.post('/admin/matches/m1', isAuthenticated, isAdmin, (req, res) => res.json({ ok: true }));

    const res = await request(app).post('/admin/matches/m1');

    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error).toBe('No tenés permisos para realizar esta acción');
  });

  it('refreshes a stale admin role from the database', async () => {
    const app = express();
    app.use((req, res, next) => {
      req.session = { user: { _id: 'u1', role: 'user' } };
      next();
    });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'u1', role: 'admin' })
    });
    app.post('/admin/matches/m1', isAuthenticated, isAdmin, (req, res) => res.json({ ok: true }));

    const res = await request(app).post('/admin/matches/m1');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
