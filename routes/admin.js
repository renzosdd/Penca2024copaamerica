const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Match = require('../models/Match');
const Penca = require('../models/Penca');
const Competition = require('../models/Competition');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

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

const jsonUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos JSON'));
        }
    }
});

// Página de administración
router.get('/edit', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('username');
        res.render('admin', { user: req.session.user, users });
    } catch (error) {
        console.error('Error al cargar la página de administración:', error);
        res.status(500).send('Error al cargar la página de administración');
    }
});

// Obtener datos de un usuario
router.get('/user/:username', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar perfil de usuario
router.post('/update', isAuthenticated, isAdmin, upload.single('avatar'), async (req, res) => {
    try {
        const { username, name, surname, email, dob, role, valid } = req.body;
        const avatar = req.file;

        if (!username) {
            return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name) user.name = name;
        if (surname) user.surname = surname;
        if (email) user.email = email;
        if (dob) user.dob = new Date(dob);
        if (role) user.role = role;
        if (valid !== undefined) user.valid = valid === 'true';
        if (avatar) {
            user.avatar = avatar.buffer;
            user.avatarContentType = avatar.mimetype;
        }

        await user.save();

        res.status(200).json({ message: 'User profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Crear nuevo owner
router.post('/owners', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { username, password, email, name, surname, dob } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ error: 'Username, password and email are required' });
        }

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const owner = new User({
            username,
            password: hashed,
            email,
            name,
            surname,
            dob,
            role: 'owner',
            valid: true
        });

        await owner.save();
        res.status(201).json({ ownerId: owner._id });
    } catch (error) {
        console.error('Error creating owner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Listar owners existentes
router.get('/owners', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const owners = await User.find({ role: 'owner' }).select('username email name surname _id');
        res.json(owners);
    } catch (error) {
        console.error('Error listing owners:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Actualizar datos de un owner
router.put('/owners/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, name, surname } = req.body;
        const owner = await User.findById(id);
        if (!owner || owner.role !== 'owner') {
            return res.status(404).json({ error: 'Owner not found' });
        }
        if (username) owner.username = username;
        if (email) owner.email = email;
        if (name !== undefined) owner.name = name;
        if (surname !== undefined) owner.surname = surname;
        await owner.save();
        res.status(200).json({ message: 'Owner updated' });
    } catch (error) {
        console.error('Error updating owner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Eliminar un owner
router.delete('/owners/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const owner = await User.findById(id);
        if (!owner || owner.role !== 'owner') {
            return res.status(404).json({ error: 'Owner not found' });
        }
        await User.deleteOne({ _id: id });
        res.status(200).json({ message: 'Owner deleted' });
    } catch (error) {
        console.error('Error deleting owner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Crear una penca con fixture opcional
router.post('/pencas', isAuthenticated, isAdmin, jsonUpload.single('fixture'), async (req, res) => {
    try {
        const { name, owner, participantLimit } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name required' });
        }

        const ownerUser = owner ? await User.findById(owner) : req.session.user;
        if (!ownerUser) {
            return res.status(404).json({ error: 'Owner not found' });
        }

        let fixtureIds = [];
        if (req.file) {
            const matchesData = JSON.parse(req.file.buffer.toString());
            const created = await Match.insertMany(matchesData);
            fixtureIds = created.map(m => m._id);
        }

        const penca = new Penca({
            name,
            code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            owner: ownerUser._id,
            participantLimit: participantLimit ? Number(participantLimit) : undefined,
            fixture: fixtureIds,
            participants: []
        });

        await penca.save();

        ownerUser.ownedPencas = ownerUser.ownedPencas || [];
        ownerUser.ownedPencas.push(penca._id);
        await ownerUser.save();

        res.status(201).json({ pencaId: penca._id, code: penca.code });
    } catch (error) {
        console.error('Error creating penca:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Listar competiciones
router.get('/competitions', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const competitions = await Competition.find().sort('name');
        res.status(200).json(competitions);
    } catch (error) {
        console.error('Error listing competitions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Crear competición con fixture opcional
router.post('/competitions', isAuthenticated, isAdmin, jsonUpload.single('fixture'), async (req, res) => {
    try {
        const { name, useApi } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name required' });
        }

        const competition = new Competition({ name });
        await competition.save();

        if (req.file) {
            const matchesData = JSON.parse(req.file.buffer.toString());
            matchesData.forEach(m => {
                if (!m.competition) m.competition = name;
            });
            await Match.insertMany(matchesData);
        } else if (String(useApi) === 'true') {
            // TODO: Integrate API-Football fixture loading
        }

        res.status(201).json({ competitionId: competition._id });
    } catch (error) {
        console.error('Error creating competition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
