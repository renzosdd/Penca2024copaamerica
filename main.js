const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const MongoStore = require('connect-mongo');
const { isAuthenticated, isAdmin } = require('./middleware/auth');
const cacheControl = require('./middleware/cacheControl');
const language = require('./middleware/language');
const { DEFAULT_COMPETITION } = require('./config');
const { getMessage } = require('./utils/messages');
const { ensureUserInPenca, ensureWorldCupPenca } = require('./utils/worldcupPenca');
const { notifyAdminApprovalRequest, notifyPasswordReset } = require('./utils/emailService');
const { hashResetToken, issuePasswordReset } = require('./utils/passwordReset');

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

if (process.env.VERCEL || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI environment variable not provided. Exiting...');
    process.exit(1);
}

// Evitar exponer credenciales en los logs
const maskedUri = uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1****:****@');
debugLog('Mongo URI:', maskedUri);

function parsePositiveInt(value, fallback) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}

const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: parsePositiveInt(process.env.MONGODB_CONNECT_TIMEOUT_MS, 60000),
    socketTimeoutMS: parsePositiveInt(process.env.MONGODB_SOCKET_TIMEOUT_MS, 60000),
    serverSelectionTimeoutMS: parsePositiveInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 30000),
    heartbeatFrequencyMS: parsePositiveInt(process.env.MONGODB_HEARTBEAT_FREQUENCY_MS, 10000),
    maxPoolSize: parsePositiveInt(process.env.MONGODB_MAX_POOL_SIZE, 10)
};

const minPoolSize = parsePositiveInt(process.env.MONGODB_MIN_POOL_SIZE, 0);
if (minPoolSize) {
    mongooseOptions.minPoolSize = minPoolSize;
}

mongoose.set('strictQuery', true);
if (process.env.MONGOOSE_DEBUG === 'true') {
    mongoose.set('debug', true);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(language);
const sessionTtlSeconds = parsePositiveInt(process.env.SESSION_TTL_SECONDS, 30 * 60);
const sessionTouchAfter = parsePositiveInt(process.env.SESSION_TOUCH_AFTER_SECONDS, 5 * 60);
const sessionAutoRemoveInterval = parsePositiveInt(process.env.SESSION_AUTO_REMOVE_INTERVAL, 10);

const sessionStoreOptions = {
    mongoUrl: process.env.SESSION_STORE_URI || uri,
    collectionName: process.env.SESSION_COLLECTION_NAME || 'sessions',
    ttl: sessionTtlSeconds,
    autoRemove: process.env.SESSION_AUTO_REMOVE || 'interval'
};

if (sessionTouchAfter) {
    sessionStoreOptions.touchAfter = sessionTouchAfter;
}

if (sessionStoreOptions.autoRemove === 'interval' && sessionAutoRemoveInterval) {
    sessionStoreOptions.autoRemoveInterval = sessionAutoRemoveInterval;
}

const sessionCookieMaxAge = sessionTtlSeconds * 1000;

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: process.env.SESSION_ROLLING === 'true',
    store: MongoStore.create(sessionStoreOptions),
    name: process.env.SESSION_COOKIE_NAME || 'penca.sid',
    cookie: {
        maxAge: sessionCookieMaxAge,
        sameSite: process.env.SESSION_COOKIE_SAMESITE || 'lax',
        secure: process.env.SESSION_COOKIE_SECURE === 'true'
    }
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
const Prediction = require('./models/Prediction');
const adminRouter = require('./routes/admin');
const matchesRouter = require('./routes/matches');
const profileRouter = require('./routes/profile');

function getPublicUser(user) {
    const legacyGoogleOnlyAccount = user.googleId && !user.googleLinkedAt && !user.passwordUpdatedAt;
    return {
        username: user.username,
        displayName: user.displayName,
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        phone: user.phone || '',
        dob: user.dob || null,
        avatarUrl: user.avatarUrl || '',
        hasGoogle: Boolean(user.googleId),
        hasPassword: user.passwordLoginEnabled !== false && !legacyGoogleOnlyAccount,
        role: user.role,
        valid: user.valid === true || user.role === 'admin',
        approvalStatus: user.valid
            ? 'approved'
            : ['rejected', 'disabled'].includes(user.approvalStatus)
                ? user.approvalStatus
                : 'pending'
    };
}

async function createScoreForUser(userId) {
    if (DEFAULT_COMPETITION) {
        await Score.create({
            userId,
            competition: DEFAULT_COMPETITION
        });
    }
}

async function notifyAdminOfPendingUser(user) {
    try {
        await notifyAdminApprovalRequest({ player: user });
    } catch (error) {
        console.error('Approval request email error:', error);
    }
}

function getGoogleRedirectUri(req) {
    if (process.env.GOOGLE_REDIRECT_URI) {
        return process.env.GOOGLE_REDIRECT_URI;
    }
    return `${req.protocol}://${req.get('host')}/auth/google/callback`;
}

function googleAuthConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function sanitizeUsername(value) {
    const cleaned = String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/^[._-]+|[._-]+$/g, '')
        .slice(0, 32);
    return cleaned || 'usuario';
}

async function generateUniqueUsername(email, fallbackName) {
    const emailBase = String(email || '').split('@')[0];
    const base = sanitizeUsername(emailBase || fallbackName);
    for (let attempt = 0; attempt < 50; attempt += 1) {
        const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
        const existing = await User.findOne({ username: candidate }).select('_id').lean();
        if (!existing) {
            return candidate;
        }
    }
    return `${base}${crypto.randomBytes(4).toString('hex')}`;
}

async function getGoogleProfile({ code, redirectUri }) {
    const tokenParams = new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    });
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams
    });
    if (!tokenRes.ok) {
        throw new Error(`Google token exchange failed: ${tokenRes.status}`);
    }
    const tokenData = await tokenRes.json();
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!profileRes.ok) {
        throw new Error(`Google profile fetch failed: ${profileRes.status}`);
    }
    return profileRes.json();
}

async function findOrCreateGoogleUser(profile) {
    const normalizedEmail = String(profile.email || '').trim().toLowerCase();
    if (!profile.sub || !normalizedEmail || profile.email_verified !== true) {
        throw new Error('Google profile is missing a verified email');
    }

    let user = await User.findOne({ googleId: profile.sub });
    if (!user) {
        user = await User.findOne({ email: normalizedEmail });
    }

    if (user) {
        let changed = false;
        if (!user.googleId) {
            user.googleId = profile.sub;
            user.googleLinkedAt = new Date();
            changed = true;
        }
        if (profile.picture && user.avatarUrl !== profile.picture) {
            user.avatarUrl = profile.picture;
            changed = true;
        }
        if (!user.name && profile.given_name) {
            user.name = profile.given_name;
            changed = true;
        }
        if (!user.surname && profile.family_name) {
            user.surname = profile.family_name;
            changed = true;
        }
        if (!user.displayName && profile.name) {
            user.displayName = profile.name;
            changed = true;
        }
        if (changed) {
            await user.save();
        }
        return user;
    }

    const username = await generateUniqueUsername(normalizedEmail, profile.name);
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    user = new User({
        username,
        password: hashedPassword,
        googleId: profile.sub,
        displayName: profile.name || username,
        name: profile.given_name || '',
        surname: profile.family_name || '',
        email: normalizedEmail,
        avatarUrl: profile.picture || null,
        passwordLoginEnabled: false,
        googleLinkedAt: new Date(),
        valid: false,
        approvalStatus: 'pending'
    });
    await user.save();
    await createScoreForUser(user._id);
    await notifyAdminOfPendingUser(user);
    return user;
}

async function linkGoogleProfileToUser(profile, userId) {
    const normalizedEmail = String(profile.email || '').trim().toLowerCase();
    if (!profile.sub || !normalizedEmail || profile.email_verified !== true) {
        throw new Error('Google profile is missing a verified email');
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    if (String(user.email || '').trim().toLowerCase() !== normalizedEmail) {
        throw new Error('Google email must match current account email');
    }
    const owner = await User.findOne({ googleId: profile.sub });
    if (owner && String(owner._id) !== String(user._id)) {
        throw new Error('Google account is already linked');
    }
    user.googleId = profile.sub;
    user.googleLinkedAt = new Date();
    if (profile.picture) user.avatarUrl = profile.picture;
    if (!user.name && profile.given_name) user.name = profile.given_name;
    if (!user.surname && profile.family_name) user.surname = profile.family_name;
    if (!user.displayName && profile.name) user.displayName = profile.name;
    await user.save();
    return user;
}

async function initializeDatabase() {
    try {
        // Verificar si existe el usuario administrador

        const adminEmailFromEnv = process.env.ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL;
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const adminEmail = (adminEmailFromEnv || `${adminUsername}@local.dev`).toLowerCase();
        if (!adminPassword) {
            console.error('DEFAULT_ADMIN_PASSWORD environment variable is required');
            process.exit(1);
        }

        // Crear usuario administrador si no existe
        let admin = await User.findOne({
            $or: [
                { email: adminEmail },
                { username: adminUsername }
            ]
        });
        if (!admin) {
            debugLog('No existe usuario administrador, creándolo...');
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            admin = new User({
                username: adminUsername,
                password: hashedPassword,
                passwordLoginEnabled: true,
                passwordUpdatedAt: new Date(),
                displayName: 'Administrador',
                email: adminEmail.toLowerCase(),
                role: 'admin',
                valid: true,
                approvalStatus: 'approved',
                approvedAt: new Date()
            });
            await admin.save();
            if (DEFAULT_COMPETITION) {
                await Score.create({ userId: admin._id, competition: DEFAULT_COMPETITION });
            }
            debugLog('Usuario administrador creado.');
        } else {
            let changed = false;
            if (!admin.email) {
                admin.email = adminEmail;
                changed = true;
            }
            if (admin.approvalStatus !== 'approved' || !admin.valid) {
                admin.valid = true;
                admin.approvalStatus = 'approved';
                admin.approvedAt = admin.approvedAt || new Date();
                changed = true;
            }
            if (changed) {
                await admin.save();
            }
        }
        await ensureWorldCupPenca(admin._id);

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
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/edit');
        }
        return res.redirect('/dashboard');
    }
    // Enviar la aplicación React compilada
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.get('/favicon.ico', (req, res) => {
    res.redirect(301, '/images/LogoSquare.png');
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
    const sessionUser = req.session.user;
    const user = await User.findById(sessionUser._id);
    if (!user) {
        return res.status(401).json({ error: getMessage('UNAUTHORIZED', req.lang) });
    }
    req.session.user = user;
    if (user.role === 'admin') {
        return res.status(403).json({ error: getMessage('ADMIN_ONLY', req.lang) });
    }
    try {
        const isApproved = user.valid === true || user.role === 'admin';
        if (!isApproved) {
            return res.json({
                user: getPublicUser(user),
                penca: null,
                approvalRequired: true
            });
        }

        const penca = await ensureUserInPenca(user._id);
        if (!penca) {
            return res.status(500).json({ error: getMessage('DASHBOARD_ERROR', req.lang) });
        }
        const formatted = {
            ...penca.toObject(),
            participantsCount: Array.isArray(penca.participants) ? penca.participants.length : 0
        };

        res.json({
            user: getPublicUser(user),
            penca: formatted
        });
    } catch (err) {
        console.error('dashboard api error', err);
        res.status(500).json({ error: getMessage('DASHBOARD_ERROR', req.lang) });
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    debugLog('Intento de inicio de sesión para el usuario:', email);
    try {
        const loginValue = (email || '').trim();
        const normalizedEmail = loginValue.toLowerCase();
        const user = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { username: loginValue }
            ]
        });
        if (user) {
            debugLog('Usuario encontrado:', user.username);
        } else {
            debugLog('Usuario no encontrado');
        }
        if (!user) {
            return res.status(401).json({ error: getMessage('USER_NOT_FOUND', req.lang) });
        }
        if (user.approvalStatus === 'disabled') {
            return res.status(403).json({ error: getMessage('ACCOUNT_DISABLED', req.lang) });
        }
        if (user.passwordLoginEnabled === false) {
            return res.status(401).json({ error: getMessage('INCORRECT_PASSWORD', req.lang) });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        debugLog('Coincidencia de contraseña:', passwordMatch);
        if (!passwordMatch) {
            debugLog('Contraseña incorrecta');
            return res.status(401).json({ error: getMessage('INCORRECT_PASSWORD', req.lang) });
        }
        req.session.user = user;
        debugLog('Sesión establecida para el usuario:', user.username);
        let redirectUrl = '/dashboard';
        if (user.role === 'admin') {
            redirectUrl = '/admin/edit';
        }
        res.json({ success: true, redirectUrl });
    } catch (err) {
        console.error('Error en el inicio de sesión', err);
        res.status(500).json({ error: getMessage('INTERNAL_ERROR', req.lang) });
    }
});

app.post('/password/forgot', async (req, res) => {
    const loginValue = String(req.body?.email || '').trim();
    try {
        if (loginValue) {
            const normalizedEmail = loginValue.toLowerCase();
            const user = await User.findOne({
                $or: [
                    { email: normalizedEmail },
                    { username: loginValue }
                ]
            });
            if (user?.email) {
                const reset = await issuePasswordReset(user, req);
                await notifyPasswordReset({ player: user, resetUrl: reset.resetUrl });
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error requesting password reset', err);
        res.status(500).json({ error: getMessage('INTERNAL_ERROR', req.lang) });
    }
});

app.post('/password/reset', async (req, res) => {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!token || password.length < 6) {
        return res.status(400).json({ error: 'Invalid reset request' });
    }
    try {
        const tokenHash = hashResetToken(token);
        const user = await User.findOne({
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        }
        user.password = await bcrypt.hash(password, 10);
        user.passwordLoginEnabled = true;
        user.passwordUpdatedAt = new Date();
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpiresAt = undefined;
        await user.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Error resetting password', err);
        res.status(500).json({ error: getMessage('INTERNAL_ERROR', req.lang) });
    }
});

app.get('/auth/google', (req, res) => {
    if (!googleAuthConfigured()) {
        return res.redirect('/?authError=google_not_configured');
    }
    const state = crypto.randomBytes(24).toString('hex');
    req.session.googleOAuth = { state, mode: 'login' };
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: getGoogleRedirectUri(req),
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account'
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/auth/google/link', isAuthenticated, (req, res) => {
    if (!googleAuthConfigured()) {
        return res.redirect('/dashboard?profileError=google_not_configured');
    }
    const state = crypto.randomBytes(24).toString('hex');
    req.session.googleOAuth = { state, mode: 'link', userId: String(req.session.user._id) };
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: getGoogleRedirectUri(req),
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account'
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) {
        return res.redirect('/?authError=google_cancelled');
    }
    if (!googleAuthConfigured()) {
        return res.redirect('/?authError=google_not_configured');
    }
    const oauthSession = req.session.googleOAuth;
    if (!code || !state || !oauthSession || state !== oauthSession.state) {
        return res.redirect('/?authError=google_invalid_state');
    }
    delete req.session.googleOAuth;
    try {
        const profile = await getGoogleProfile({
            code: String(code),
            redirectUri: getGoogleRedirectUri(req)
        });
        if (oauthSession.mode === 'link') {
            const user = await linkGoogleProfileToUser(profile, oauthSession.userId);
            req.session.user = user;
            return res.redirect('/dashboard?profileNotice=google_linked');
        }
        const user = await findOrCreateGoogleUser(profile);
        if (user.approvalStatus === 'disabled') {
            return res.redirect('/?authError=account_disabled');
        }
        req.session.user = user;
        if (user.role === 'admin') {
            return res.redirect('/admin/edit');
        }
        return res.redirect('/dashboard');
    } catch (err) {
        console.error('Error en login con Google', err);
        if (oauthSession.mode === 'link') {
            return res.redirect('/dashboard?profileError=google_link_failed');
        }
        return res.redirect('/?authError=google_failed');
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
    const { username, password, displayName, name, surname, email, phone, dob, avatarUrl } = req.body;
    const avatar = req.file ? req.file.buffer : null;
    const avatarContentType = req.file ? req.file.mimetype : null;
    try {
        const normalizedEmail = (email || '').trim().toLowerCase();
        const normalizedUsername = (username || '').trim();
        const derivedDisplayName = (displayName || name || normalizedUsername).trim();
        if (!normalizedUsername || !password || !normalizedEmail) {
            return res.status(400).json({ error: 'username, password and email are required' });
        }
        if (!derivedDisplayName) {
            return res.status(400).json({ error: 'displayName is required' });
        }
        const existingUser = await User.findOne({ $or: [{ username: normalizedUsername }, { email: normalizedEmail }] });
        if (existingUser) {
            return res.status(400).json({ error: getMessage('USER_EXISTS', req.lang) });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username: normalizedUsername,
            password: hashedPassword,
            passwordLoginEnabled: true,
            passwordUpdatedAt: new Date(),
            displayName: derivedDisplayName,
            name,
            surname,
            email: normalizedEmail,
            phone: phone || '',
            dob,
            avatarUrl: avatarUrl || null,
            avatar,
            avatarContentType,
            valid: false,
            approvalStatus: 'pending'
        });
        await user.save();
        // Crear registro de puntaje
        await createScoreForUser(user._id);
        await notifyAdminOfPendingUser(user);
        req.session.user = user;
        debugLog('Usuario registrado y sesión iniciada:', user.username);
        res.json({ success: true, redirectUrl: '/dashboard' });
    } catch (err) {
        console.error('Error en el registro', err);
        res.status(500).json({ error: getMessage('INTERNAL_ERROR', req.lang) });
    }
});
 
app.get('/avatar/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user || !user.avatar) {
            return res.status(404).send(getMessage('AVATAR_NOT_FOUND', req.lang));
        }
        res.set('Content-Type', user.avatarContentType);
        res.send(user.avatar);
    } catch (err) {
        res.status(500).send(getMessage('AVATAR_ERROR', req.lang));
    }
});

app.use('/predictions', isAuthenticated, require('./routes/predictions'));
app.use('/ranking', isAuthenticated, require('./routes/ranking'));
app.use('/groups', isAuthenticated, require('./routes/groups').router);
app.use('/bracket', isAuthenticated, require('./routes/bracket'));
app.use('/admin', adminRouter);
app.use('/matches', matchesRouter);
app.use(profileRouter);

app.post('/logout', (req, res) => {
    if (!req.session) {
        return res.json({ success: true, redirectUrl: '/' });
    }
    req.session.destroy(err => {
        if (err) {
            console.error('Error on logout:', err);
            return res.status(500).json({ error: getMessage('LOGOUT_ERROR', req.lang) });
        }
        res.json({ success: true, redirectUrl: '/' });
    });
});

app.get(['/register', '/password/reset/:token'], (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.use((req, res) => {
    res.status(404).send(getMessage('PAGE_NOT_FOUND', req.lang));
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
 
