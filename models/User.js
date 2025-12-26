const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: false },
    surname: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    dob: { type: Date, required: false },
    avatar: { type: Buffer, required: false },
    avatarContentType: { type: String, required: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    valid: { type: Boolean, default: false },
    pencas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Penca' }]
});

userSchema.index({ role: 1, valid: 1 });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
