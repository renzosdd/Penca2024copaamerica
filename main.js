const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

let db;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
        console.error('Failed to connect to the database. Exiting now...', err);
        process.exit();
    }
    db = client.db('penca_copa_america');
    console.log('Database connection established');

    // Configurar express-session después de la conexión a la base de datos
    app.use(session({
        secret: 'secret',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: uri,
            dbName: 'penca_copa_america',
            collectionName: 'sessions',
            ttl: 14 * 24 * 60 * 60 // 14 días
        })
    }));

    createAdminUser().then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }).catch((err) => {
        console.error('Failed to create admin user', err);
        process.exit();
    });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard.html', isAuthenticated, (req, res) => {
    if (!db) {
        return res.status(500).send('Database connection not established');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.use('/predictions', isAuthenticated, (req, res, next) => {
    if (!db) {
        return res.status(500).send('Database connection not established');
    }
    require('./routes/predictions')(db)(req, res, next);
});

app.use('/admin', isAuthenticated, isAdmin, (req, res, next) => {
    if (!db) {
        return res.status(500).send('Database connection not established');
    }
    require('./routes/admin')(db)(req, res, next);
});

async function createAdminUser() {
    const usersCollection = db.collection('users');
    const adminUser = await usersCollection.findOne({ username: 'admin' });
    if (!adminUser) {
        const hashedPassword = await bcrypt.hash('Penca2024Ren', 10);
        await usersCollection.insertOne({ username: 'admin', password: hashedPassword, role: 'admin' });
        console.log('Admin user created');
    }
}

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const usersCollection = db.collection('users');
    try {
        const user = await usersCollection.findOne({ username });
        console.log('User found:', user);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            console.log('Invalid username or password');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!req.session) {
            console.log('Session not initialized');
            return res.status(500).json({ error: 'Session not initialized' });
        }
        req.session.user = user;
        console.log('Session set for user:', req.session.user);
        res.status(200).json({ message: 'Login exitoso' });
    } catch (err) {
        console.error('Login error', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/register', upload.single('avatar'), async (req, res) => {
    const { username, password, surname, email, dob } = req.body;
    const avatar = req.file ? req.file.filename : null;
    const usersCollection = db.collection('users');
    try {
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await usersCollection.insertOne({ username, password: hashedPassword, surname, email, dob, avatar, role: 'user' });
        req.session.user = user.ops[0];
        res.redirect('/dashboard.html');
    } catch (err) {
        console.error('Registration error', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/');
}

function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).send('Forbidden');
}

app.use((req, res) => {
    res.status(404).send('404: Page not found');
});

module.exports = app;
