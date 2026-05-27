const DEFAULT_PORT = 587;

function getNumber(envValue, fallback) {
  const parsed = Number(envValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getSecureValue() {
  return String(process.env.SMTP_SECURE || process.env.SMTP_SECUURE || '').toLowerCase() === 'true';
}

module.exports = {
  host: process.env.SMTP_HOST || '',
  port: getNumber(process.env.SMTP_PORT, DEFAULT_PORT),
  secure: getSecureValue(),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.EMAIL_FROM || 'no-reply@penca.app'
};
