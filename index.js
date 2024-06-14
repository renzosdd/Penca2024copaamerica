const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

let db;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) return console.error(err);
    db = client.db('penca_copa_america');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/predictions', require('./routes/predictions')(db));
app.use('/admin', require('./routes/admin')(db));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const usersCollection = db.collection('users');
    try {
        const user = await usersCollection.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.session.user = user;
        res.redirect('/platform');
    } catch (err) {
        res.status(500).send('Error');
    }
});

app.post('/register', upload.single('avatar'), async (req, res) => {
    const { username, password, surname, email, dob } = req.body;
    const avatar = req.file ? req.file.filename : null;
    const usersCollection = db.collection('users');
    try {
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const user = await usersCollection.insertOne({ username, password, surname, email, dob, avatar, role: 'user' });
        req.session.user = user.ops[0];
        res.redirect('/platform');
    } catch (err) {
        res.status(500).send('Error');
    }
});

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/');
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).send('Forbidden');
}

app.use('/predictions', isAuthenticated);
app.use('/admin', [isAuthenticated, isAdmin]);

app.use((req, res) => {
    res.status(404).send('404: Page not found');
});
