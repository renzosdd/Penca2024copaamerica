const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
const { isAuthenticated, isAdmin } = require('./middleware/auth');
const cacheControl = require('./middleware/cacheControl');
const { DEFAULT_COMPETITION } = require('./config');
const Competition = require('./models/Competition');
const Penca = require("./models/Penca");

dotenv.config();

const DEBUG = process.env.DEBUG === 'true';
function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

if (!process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET is not defined. Exiting...');
    process.exit(1);
}

const SESSION_SECRET = process.env.SESSION_SECRET;

const app = express();
const PORT = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI environment variable not provided. Exiting...');
    process.exit(1);
}

// Evitar exponer credenciales en los logs
const maskedUri = uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1****:****@');
debugLog('Mongo URI:', maskedUri);

const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    maxPoolSize: 10 // Ajusta el tamaño del pool según tus necesidades
};

mongoose.set('strictQuery', true);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: uri,
        collectionName: 'sessions',
        ttl: 30 * 60, // 30 minutos en segundos
    }),
    cookie: { maxAge: 30 * 60 * 1000 } // 30 minutos en milisegundos
}));

mongoose.connect(uri, mongooseOptions)
    .then(async () => {
        debugLog('Conexión a la base de datos establecida');
        await initializeDatabase();
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos. Saliendo...', err);
        process.exit(1);
    });

mongoose.connection.on('connected', () => {
    debugLog('Mongoose conectado a la base de datos');
});

mongoose.connection.on('error', (err) => {
    console.error('Error en la conexión de Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
    debugLog('Conexión de Mongoose perdida. Reintentando...');
    mongoose.connect(uri, mongooseOptions).catch((err) => {
        console.error('Error al reintentar la conexión de Mongoose:', err);
    });
});

const User = require('./models/User');
const Score = require('./models/Score');
const Match = require('./models/Match');
const Prediction = require('./models/Prediction');
const adminRouter = require('./routes/admin');
const pencaRouter = require('./routes/penca');

async function initializeDatabase() {
    try {
        // Verificar si existe el usuario administrador

        const adminUsername = process.env.DEFAULT_ADMIN_USERNAME;
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
        if (!adminUsername || !adminPassword) {
            console.error('DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD environment variables are required');
            process.exit(1);
        }

        // Asegurar que exista la competencia por defecto
        let competition = await Competition.findOne({ name: DEFAULT_COMPETITION });
        if (!competition) {
            competition = new Competition({ name: DEFAULT_COMPETITION });
            await competition.save();
            debugLog(`Competencia creada: ${DEFAULT_COMPETITION}`);
        }

        let admin = await User.findOne({ username: adminUsername });
        if (!admin) {
            debugLog('No existe usuario administrador, creándolo...');
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            admin = new User({
                username: adminUsername,
                password: hashedPassword,
                email: adminEmail,
                role: 'admin',
                valid: true
            });
            await admin.save();
            await Score.create({ userId: admin._id, competition: competition.name });
            debugLog('Usuario administrador creado.');
        }
        // Los partidos deben cargarse manualmente desde las herramientas de administración
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
    }
}

// Usar el middleware de control de caché
app.use(cacheControl);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
// Archivos estáticos generados por Vite
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});


app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    // Enviar la aplicación React compilada
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
    const { user } = req.session;
    if (user.role === 'admin') {
        return res.redirect('/admin/edit');
    }
    // Enviar la aplicación React para el dashboard
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Datos para el dashboard en React
app.get('/api/dashboard', isAuthenticated, async (req, res) => {
    const { user } = req.session;
    if (user.role === 'admin') {
        return res.status(403).json({ error: 'Admins must use /admin/edit' });
    }
    try {
        const pencas = await Penca.find({ participants: user._id }).select('name _id competition fixture');
        res.json({ user: { username: user.username, role: user.role }, pencas });
    } catch (err) {
        console.error('dashboard api error', err);
        res.status(500).json({ error: 'Error retrieving dashboard data' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    debugLog('Intento de inicio de sesión para el usuario:', username);
    try {
        const user = await User.findOne({ username });
        if (user) {
            debugLog('Usuario encontrado:', user.username);
        } else {
            debugLog('Usuario no encontrado');
        }
        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        debugLog('Coincidencia de contraseña:', passwordMatch);
        if (!passwordMatch) {
            debugLog('Contraseña incorrecta');
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        req.session.user = user;
        debugLog('Sesión establecida para el usuario:', user.username);
        const redirectUrl = user.role === 'admin' ? '/admin/edit' : '/dashboard';
        res.json({ success: true, redirectUrl });
    } catch (err) {
        console.error('Error en el inicio de sesión', err);
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
    const { username, password, name, surname, email, dob } = req.body;
    const avatar = req.file ? req.file.buffer : null;
    const avatarContentType = req.file ? req.file.mimetype : null;
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'El nombre de usuario o email ya existe' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            name,
            surname,
            email,
            dob,
            avatar,
            avatarContentType,
            valid: false
        });
        await user.save();
        // Crear registro de puntaje
        const score = new Score({
            userId: user._id,
            competition: DEFAULT_COMPETITION
        });
        await score.save();
        req.session.user = user;
        debugLog('Usuario registrado y sesión iniciada:', user.username);
        res.json({ success: true, redirectUrl: '/dashboard' });
    } catch (err) {
        console.error('Error en el registro', err);
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
app.use('/groups', isAuthenticated, require('./routes/groups').router);
app.use('/bracket', isAuthenticated, require('./routes/bracket'));
app.use('/pencas', isAuthenticated, pencaRouter);
app.use('/admin', adminRouter);

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

// Evento para cerrar la conexión de Mongoose al cerrar el servidor
process.on('SIGINT', async () => {
    debugLog('Cerrando la conexión de Mongoose...');
    await mongoose.connection.close();
    debugLog('Conexión de Mongoose cerrada.');
    process.exit(0);
});

app.listen(PORT, () => { 
    debugLog(`Servidor corriendo en el puerto ${PORT}`);
});
 