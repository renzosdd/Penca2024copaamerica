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

  it('returns skipped when API call is throttled', async () => {
    updateResults.mockResolvedValue({ skipped: true });

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).post('/admin/update-results/Copa');

    expect(res.status).toBe(200);
    expect(updateResults).toHaveBeenCalledWith('Copa');
    expect(res.body.skipped).toBe(true);
  });

  it('returns success message when results updated', async () => {
    updateResults.mockResolvedValue({ updated: 1 });

    const app = express();
    app.use('/admin', adminRouter);

    const res = await request(app).post('/admin/update-results/Copa');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Results updated' });
  });
});
