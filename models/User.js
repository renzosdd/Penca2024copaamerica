const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    surname: String,
    email: String,
    dob: Date,
    avatar: Buffer,
    avatarContentType: String,
    role: { type: String, default: 'user' }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
