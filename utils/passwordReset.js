const crypto = require('crypto');
const { APP_BASE_URL } = require('../config');

const RESET_TTL_MINUTES = 60;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getBaseUrl(req) {
  if (APP_BASE_URL) return APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (req) return `${req.protocol}://${req.get('host')}`;
  return '';
}

async function issuePasswordReset(user, req) {
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashResetToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
  await user.save();

  const baseUrl = getBaseUrl(req);
  return {
    token,
    expiresAt: user.passwordResetExpiresAt,
    resetUrl: baseUrl ? `${baseUrl}/password/reset/${token}` : `/password/reset/${token}`
  };
}

module.exports = {
  hashResetToken,
  issuePasswordReset,
  RESET_TTL_MINUTES
};
