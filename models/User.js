const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    surname: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    dob: { type: Date, required: false },
    avatar: { type: Buffer },
    avatarContentType: { type: String },
    role: { type: String, default: 'user' }
});

module.exports = mongoose.model('User', userSchema);
