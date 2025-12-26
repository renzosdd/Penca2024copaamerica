const emailConfig = require('../config/email');

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (err) {
  nodemailer = null;
}

const isConfigured = Boolean(emailConfig.host && emailConfig.user && emailConfig.pass && nodemailer);
let transporter;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass
    }
  });
}

async function sendEmail({ to, subject, text, html }) {
  if (!isConfigured) {
    console.info('[emailService] Email not sent (transporter not configured)', { to, subject });
    return false;
  }

  await transporter.sendMail({
    from: emailConfig.from,
    to,
    subject,
    text,
    html
  });
  return true;
}

function buildApprovalMessage({ playerName, pencaName }) {
  const subject = `Tu acceso a ${pencaName} fue aprobado`;
  const body = [
    `Hola ${playerName},`,
    '',
    `Ya podés cargar tus predicciones en la penca "${pencaName}".`,
    'Ingresá para empezar a jugar.',
    '',
    'Equipo de Penca'
  ].join('\n');
  return { subject, text: body, html: body.replace(/\n/g, '<br/>') };
}

async function notifyPlayerApproval({ player, penca }) {
  if (!player?.email || !penca) return false;
  const message = buildApprovalMessage({
    playerName: player.name || player.username,
    pencaName: penca.name
  });
  return sendEmail({ to: player.email, ...message });
}

module.exports = {
  sendEmail,
  notifyPlayerApproval,
  isConfigured
};
