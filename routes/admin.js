const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Servir la página de administración
router.get('/edit', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin', { user: req.session.user });
});

// Endpoint para actualizar el perfil del usuario
router.post('/update', isAuthenticated, isAdmin, upload.single('avatar'), async (req, res) => {
    try {
        const { username, name, surname, email, dob, role, valid } = req.body;
        const avatar = req.file;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (name) user.name = name;
        if (surname) user.surname = surname;
        if (email) user.email = email;
        if (dob) user.dob = new Date(dob);
        if (role) user.role = role;
        if (valid !== undefined) user.valid = valid;
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
