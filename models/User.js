const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    googleId: { type: String, required: false, unique: true, sparse: true },
    displayName: { type: String, required: true, trim: true },
    name: { type: String, required: false },
    surname: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    dob: { type: Date, required: false },
    avatarUrl: { type: String, required: false },
    avatar: { type: Buffer, required: false },
    avatarContentType: { type: String, required: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    valid: { type: Boolean, default: false },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedAt: { type: Date, required: false },
    pencas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Penca' }]
}, { timestamps: true });

userSchema.index({ role: 1, valid: 1, approvalStatus: 1 });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
