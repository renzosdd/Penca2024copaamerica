const request = require('supertest');
const express = require('express');
const session = require('express-session');

const isAuthenticated = (req, res, next) => next();

describe('GET /owner route', () => {
  it('redirects admins to /admin/edit', async () => {
    const app = express();
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    app.use((req, res, next) => {
      req.session.user = { _id: 'u1', role: 'admin' };
      next();
    });

    app.get('/owner', isAuthenticated, async (req, res) => {
      const { user } = req.session;
      if (user.role !== 'owner') {
        if (user.role === 'admin') return res.redirect('/admin/edit');
        return res.redirect('/dashboard');
      }
      res.status(200).end();
    });

    const res = await request(app).get('/owner');
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/admin/edit');
  });
});
