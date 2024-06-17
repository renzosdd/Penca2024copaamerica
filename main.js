const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
const ejs = require('ejs');
const { isAuthenticated, isAdmin } = require('./middleware/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI || 'mongodb+srv://admindbpenca:AdminDbPenca2024Ren@pencacopaamerica2024.yispiqt.mongodb.net/penca_copa_america?retryWrites=true&w=majority&appName=PencaCopaAmerica2024';

console.log('Mongo URI:', uri);

// Solucionar advertencia de `strictQuery`
mongoose.set('strictQuery', true);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: uri,
        collectionName: 'sessions',
        ttl: 30 * 60, // 30 minutos en segundos
    }),
    cookie: { maxAge: 30 * 60 * 1000 } // 30 minutos en milisegundos
}));

mongoose.connect(uri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000
})
    .then(() => console.log('Database connection established'))
    .catch(err => {
        console.error('Failed to connect to the database. Exiting now...', err);
        process.exit(1);
    });

const User = require('./models/User');
const Score = require('./models/Score');

// Crear o actualizar el usuario administrador
const ensureAdminUser = async () => {
    const adminData = {
        username: 'admin',
        password: 'Admin12345', // Asegúrate de usar una contraseña segura en producción
        name: 'Admin',
        surname: 'Admin',
        email: 'admin@example.com',
        dob: new Date('2000-01-01'),
        role: 'admin',
        valid: true
    };

    try {
        let admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            adminData.password = hashedPassword;
            admin = new User(adminData);
            await admin.save();
            console.log('Admin user created');
        } else {
            const updateData = { ...adminData };
            delete updateData.password; // No actualizar la contraseña si ya existe el admin
            await User.updateOne({ _id: admin._id }, updateData);
            console.log('Admin user updated');
        }
    } catch (err) {
        console.error('Error ensuring admin user', err);
    }
};

ensureAdminUser();

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Configurar EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const { user } = req.session;
    res.render('dashboard', { user });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Intento de inicio de sesión para el usuario:', username);
    try {
        const user = await User.findOne({ username });
        console.log('Usuario encontrado:', user);
        if (!user) {
            console.log('Usuario no encontrado');
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log('Coincidencia de contraseña:', passwordMatch);
        if (!passwordMatch) {
            console.log('Contraseña incorrecta');
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        req.session.user = user;
        console.log('Sesión establecida para el usuario:', req.session.user);
        res.json({ success: true, redirectUrl: '/dashboard' });
    } catch (err) {
        console.error('Error de inicio de sesión', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Configurar Multer para almacenar archivos en memoria y usar el nombre de usuario
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes.'));
        }
    }
});

app.post('/register', upload.single('avatar'), async (req, res) => {
    const { name, username, password, surname, email, dob } = req.body;
    const avatar = req.file ? req.file.buffer : null;
    const avatarContentType = req.file ? req.file.mimetype : null;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name,
            username,
            password: hashedPassword,
            surname,
            email,
            dob,
            avatar,
            avatarContentType,
            valid: true // Asignar campo valid a true
        });
        await user.save();
        // Crear registro de puntaje
        const score = new Score({
            userId: user._id,
            competition: 'Copa America 2024'
        });
        await score.save();
        req.session.user = user;
        console.log('Usuario registrado y sesión iniciada:', req.session.user);
        res.json({ success: true, redirectUrl: '/dashboard' });
    } catch (err) {
        console.error('Error de registro', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/avatar/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user || !user.avatar) {
            return res.status(404).send('Avatar no encontrado');
        }
        res.set('Content-Type', user.avatarContentType);
        res.send(user.avatar);
    } catch (err) {
        res.status(500).send('Error al recuperar el avatar');
    }
});

app.use('/matches', isAuthenticated, require('./routes/matches'));
app.use('/predictions', isAuthenticated, require('./routes/predictions'));
app.use('/ranking', isAuthenticated, require('./routes/ranking'));

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.redirect('/');
    });
});

app.use((req, res) => {
    res.status(404).send('404: Página no encontrada');
});

app.listen(PORT, () => {
    console.log(`El servidor está ejecutando en el puerto ${PORT}`);
});
