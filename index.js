const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

let db;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, async (err, client) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    db = client.db('penca_copa_america');

    // Inicialización de sesiones después de la conexión a la base de datos
    app.use(session({
        secret: 'secret',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            client: client,
            dbName: 'penca_copa_america',
            collectionName: 'sessions',
            ttl: 14 * 24 * 60 * 60 // 14 días
        })
    }));

    // Crear usuario admin si no existe
    await createAdminUser();

    // Iniciar el servidor después de la conexión y la creación del usuario admin
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/predictions', require('./routes/predictions')(db));
app.use('/admin', require('./routes/admin')(db));

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
        if (!user || !(await bcrypt.compare(password, user.password))) {
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
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await usersCollection.insertOne({ username, password: hashedPassword, surname, email, dob, avatar, role: 'user' });
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
