const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI || 'mongodb+srv://admindbpenca:AdminDbPenca2024Ren@pencacopaamerica2024.yispiqt.mongodb.net/penca_copa_america?retryWrites=true&w=majority&appName=PencaCopaAmerica2024';

console.log('Mongo URI:', uri);  // Verifica que la URI se está leyendo correctamente

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: uri,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60 // 14 días
    })
}));

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Database connection established'))
    .catch(err => {
        console.error('Failed to connect to the database. Exiting now...', err);
        process.exit(1);
    });

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

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const { user } = req.session;
    res.render('dashboard', { user });
});

app.post('/login', async (req, res) => {
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

// Configurar Multer para almacenar archivos en memoria y usar el nombre de usuario
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

app.post('/register', upload.single('avatar'), async (req, res) => {
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

app.get('/avatar/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user || !user.avatar) {
            return res.status(404).send('Avatar not found');
        }
        res.set('Content-Type', user.avatarContentType);
        res.send(user.avatar);
    } catch (err) {
        res.status(500).send('Error retrieving avatar');
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

app.use('/matches', require('./routes/matches'));
app.use('/predictions', require('./routes/predictions'));

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.redirect('/');
    });
});

app.use((req, res) => {
    res.status(404).send('404: Page not found');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
