const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const connectToDatabase = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Secret key for JWT
const JWT_SECRET = 'a123b456c789d012e345f678g901h234i567j890k123l456m789n012o345p678q901r234s567t890u123v456w789x012y345z678a901b234c567d890e123f456g789h012';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).send('Access Denied');
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send('Invalid Token');
        }
        req.user = decoded;
        next();
    });
};

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = '/tmp/uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Rutas
const profileRouter = require('./routes/profile');
const matchesRouter = require('./routes/matches');
const predictionsRouter = require('./routes/predictions');
const leaderboardRouter = require('./routes/leaderboard');

app.use('/profile', checkAuth, profileRouter);
app.use('/matches', checkAuth, matchesRouter);
app.use('/predictions', checkAuth, predictionsRouter);
app.use('/leaderboard', checkAuth, leaderboardRouter);

// User registration endpoint
app.post('/register', upload.single('avatar'), async (req, res) => {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const { username, password, email, firstName, lastName, phone } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : '/images/avatar.webp';
    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
        await usersCollection.insertOne({
            username,
            password: hashedPassword,
            email,
            firstName,
            lastName,
            phone,
            avatar,
            role: 'user',
            isAdmin: false
        });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Error creating user:', err.message);
        res.status(500).json({ error: 'Error creating user' });
    }
});

// User login endpoint
app.post('/login', async (req, res) => {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const { username, password } = req.body;

    try {
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ accessToken: token, user });
    } catch (err) {
        console.error('Error fetching user:', err.message);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// Serve login.html as default if not authenticated
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
