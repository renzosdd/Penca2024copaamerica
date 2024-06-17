const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: false },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    surname: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    dob: { type: Date, required: false },
    avatar: { type: Buffer, required: false },
    avatarContentType: { type: String, required: false },
    role: { type: String, default: 'user' },
    valid: { type: Boolean, default: true }
});

module.exports = mongoose.model('User', userSchema);
