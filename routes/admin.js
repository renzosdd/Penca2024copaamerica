const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
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

// Servir la página de administración
router.get('/edit', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('username');
        res.render('admin', { user: req.session.user, users });
    } catch (error) {
        console.error('Error al cargar la página de administración:', error);
        res.status(500).send('Error al cargar la página de administración');
    }
});

// Endpoint para obtener los datos de un usuario específico
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

// Endpoint para actualizar el perfil del usuario
router.post('/update', isAuthenticated, isAdmin, upload.single('avatar'), async (req, res) => {
    try {
        const { username, name, surname, email, dob, role, valid } = req.body;
        const avatar = req.file;

        // Validar que el username no esté vacío
        if (!username) {
            return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Actualizar los datos del usuario
        if (name) user.name = name;
        if (surname) user.surname = surname;
        if (email) user.email = email;
        if (dob) user.dob = new Date(dob);
        if (role) user.role = role;
        if (valid !== undefined) user.valid = valid === 'true'; // Convertir el string 'true'/'false' a boolean
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

module.exports = router;
