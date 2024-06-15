const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const router = express.Router();

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    surname: String,
    email: String,
    dob: Date,
    avatar: Buffer,
    avatarContentType: String,
    role: { type: String, default: 'user' }
});

const User = mongoose.model('User', userSchema);

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt for user:', username);
    try {
        const user = await User.findOne({ username });
        console.log('User found:', user);
        if (!user) {
            console.log('User not found');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            console.log('Invalid password');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.session.user = user;
        console.log('Session set for user:', req.session.user);
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (!req.body.username) {
            return cb(new Error('Username is required'));
        }
        cb(null, true);
    }
});

router.post('/register', upload.single('avatar'), async (req, res) => {
    const { username, password, surname, email, dob } = req.body;
    const avatar = req.file ? req.file.buffer : null;
    const avatarContentType = req.file ? req.file.mimetype : null;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            surname,
            email,
            dob,
            avatar,
            avatarContentType
        });
        await user.save();
        req.session.user = user;
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Registration error', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
