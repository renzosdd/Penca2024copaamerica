const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./database'); // Import the database configuration

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
        const dir = 'uploads/';
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
app.post('/register', upload.single('avatar'), (req, res) => {
    const { username, password, email, firstName, lastName, phone } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : '/images/avatar.webp';
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(`INSERT INTO users (username, password, email, firstName, lastName, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)`, [username, hashedPassword, email, firstName, lastName, phone, avatar], function(err) {
        if (err) {
            console.error('Error creating user:', err.message);
            res.status(500).json({ error: 'Error creating user' });
        } else {
            res.status(201).json({ message: 'User registered successfully' });
        }
    });
});

// User login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            res.status(500).json({ error: 'Error fetching user' });
        } else if (!user) {
            res.status(400).json({ error: 'Invalid username or password' });
        } else {
            const passwordMatch = bcrypt.compareSync(password, user.password);
            if (!passwordMatch) {
                res.status(400).json({ error: 'Invalid username or password' });
            } else {
                const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
                res.json({ accessToken: token, user });
            }
        }
    });
});

// Serve login.html as default if not authenticated
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
