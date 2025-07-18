const request = require('supertest');
const express = require('express');

jest.mock('../utils/bracket', () => ({
  updateEliminationMatches: jest.fn(),
  generateEliminationBracket: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next())
}));

const { generateEliminationBracket } = require('../utils/bracket');
const adminRouter = require('../routes/admin');

describe('generate bracket route', () => {
  afterEach(() => jest.clearAllMocks());

  it('triggers bracket generation', async () => {
    const app = express();
    app.use(express.json());
    app.use('/admin', adminRouter);

    const res = await request(app)
      .post('/admin/generate-bracket/Copa')
      .send({ qualifiersPerGroup: 2 });

    expect(res.status).toBe(200);
    expect(generateEliminationBracket).toHaveBeenCalledWith('Copa', 2);
  });
});
