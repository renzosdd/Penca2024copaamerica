const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String },
    surname: { type: String },
    email: { type: String, unique: true, required: true },
    dob: { type: Date },
    avatar: { type: Buffer },
    avatarContentType: { type: String },
    role: { type: String, default: 'user' },
    valid: { type: Boolean, default: true }
});

module.exports = mongoose.model('User', userSchema);
