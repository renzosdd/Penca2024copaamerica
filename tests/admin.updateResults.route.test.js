const request = require('supertest');
const express = require('express');

jest.mock('../scripts/updateResults');
jest.mock('../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next())
}));

const updateResults = require('../scripts/updateResults');
const adminRouter = require('../routes/admin');

describe('Admin update results route', () => {
  afterEach(() => jest.clearAllMocks());

  it('is not exposed while results are manual-only', async () => {
    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).post('/admin/update-results/Copa');

    expect(res.status).toBe(404);
    expect(updateResults).not.toHaveBeenCalled();
  });
});
