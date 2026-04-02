const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes.'));
  }
});

router.post('/profile/update', isAuthenticated, upload.single('avatar'), async (req, res) => {
  try {
    const { displayName, name, surname, email, dob, avatarUrl } = req.body;
    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (displayName !== undefined) {
      const normalizedDisplayName = String(displayName).trim();
      if (!normalizedDisplayName) {
        return res.status(400).json({ error: 'Display name required' });
      }
      user.displayName = normalizedDisplayName;
    }
    if (name !== undefined) user.name = name;
    if (surname !== undefined) user.surname = surname;
    if (email !== undefined) user.email = email;
    if (dob) {
      const d = new Date(dob);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Invalid date' });
      }
      user.dob = d;
    }
    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl || null;
    }
    if (req.file) {
      user.avatar = req.file.buffer;
      user.avatarContentType = req.file.mimetype;
    }

    await user.save();
    req.session.user = user;
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('update profile error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
