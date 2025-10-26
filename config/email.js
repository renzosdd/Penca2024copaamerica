const DEFAULT_PORT = 587;

function getNumber(envValue, fallback) {
  const parsed = Number(envValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  host: process.env.SMTP_HOST || '',
  port: getNumber(process.env.SMTP_PORT, DEFAULT_PORT),
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.EMAIL_FROM || 'no-reply@penca.app'
};
