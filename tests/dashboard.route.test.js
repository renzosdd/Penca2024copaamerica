const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Simple isAuthenticated stub
const isAuthenticated = (req, res, next) => next();

describe('GET /dashboard route', () => {
  it('redirects admins to /admin/edit', async () => {
    const app = express();
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));
    // set admin user in session
    app.use((req, res, next) => {
      req.session.user = { _id: 'u1', role: 'admin' };
      next();
    });

    app.get('/dashboard', isAuthenticated, async (req, res) => {
      const { user } = req.session;
      if (user.role === 'admin') {
        return res.redirect('/admin/edit');
      }
      res.status(200).end();
    });

    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/admin/edit');
  });
});
