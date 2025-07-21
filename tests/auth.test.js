const request = require('supertest');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { getMessage } = require('../utils/messages');

jest.mock('../models/User', () => {
  const UserMock = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  UserMock.findOne = jest.fn();
  return UserMock;
});

jest.mock('../models/Score', () => {
  return jest.fn(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
});

const User = require('../models/User');
const Score = require('../models/Score');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(bodyParser.json());
    app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

    app.post('/login', async (req, res) => {
      const { username, password } = req.body;
      try {
        const user = await User.findOne({ username });
        if (!user) {
          return res.status(401).json({ error: getMessage('USER_NOT_FOUND') });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({ error: getMessage('INCORRECT_PASSWORD') });
        }
        req.session.user = user;
        res.json({ success: true, redirectUrl: '/dashboard' });
      } catch (err) {
        res.status(500).json({ error: getMessage('INTERNAL_ERROR') });
      }
    });

    app.post('/register', async (req, res) => {
      const { username, password, email } = req.body;
      try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
          return res.status(400).json({ error: getMessage('USER_EXISTS') });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, email });
        await user.save();
        const score = new Score({ userId: user._id, competition: 'Copa America 2024' });
        await score.save();
        req.session.user = user;
        res.json({ success: true, redirectUrl: '/dashboard' });
      } catch (err) {
        res.status(500).json({ error: getMessage('INTERNAL_ERROR') });
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs in a user with valid credentials', async () => {
    const hashed = await bcrypt.hash('pass', 10);
    User.findOne.mockResolvedValue({ _id: '1', username: 'test', password: hashed });

    const res = await request(app).post('/login').send({ username: 'test', password: 'pass' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('registers a new user', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post('/register').send({ username: 'new', email: 'new@example.com', password: 'pass' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(User).toHaveBeenCalledWith(expect.objectContaining({ username: 'new' }));
  });
});

