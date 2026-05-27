const emailConfig = require('../config/email');
const { APP_BASE_URL } = require('../config');

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

function smtpErrorDetails(error) {
  if (!error) return {};
  return {
    code: error.code,
    command: error.command,
    responseCode: error.responseCode,
    response: error.response,
    message: error.message
  };
}

async function sendEmail({ to, subject, text, html }) {
  if (!isConfigured) {
    console.info('[emailService] Email not sent (transporter not configured)', { to, subject });
    return false;
  }

  try {
    await transporter.sendMail({
      from: emailConfig.from,
      to,
      subject,
      text,
      html
    });
    return true;
  } catch (error) {
    console.error('[emailService] SMTP send failed', {
      to,
      subject,
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      from: emailConfig.from,
      error: smtpErrorDetails(error)
    });
    throw error;
  }
}

function buildApprovalMessage({ playerName, pencaName }) {
  const subject = `Tu acceso a ${pencaName} fue aprobado`;
  const baseUrl = APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const dashboardUrl = baseUrl ? `${baseUrl}/dashboard` : '/dashboard';
  const logoUrl = baseUrl ? `${baseUrl}/images/Logo.png` : '';
  const body = [
    `Hola ${playerName},`,
    '',
    `Ya podés cargar tus predicciones en la penca "${pencaName}".`,
    `Ingresá para empezar a jugar: ${dashboardUrl}`,
    '',
    'Equipo de Penca'
  ].join('\n');
  const html = `
    <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:24px;text-align:center;border-bottom:1px solid #e2e8f0;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Penca Mundial 2026" style="max-height:64px;max-width:220px;" />` : '<h1 style="margin:0;font-size:24px;">Penca Mundial 2026</h1>'}
        </div>
        <div style="padding:28px;">
          <h2 style="margin:0 0 12px;font-size:22px;">Tu acceso fue aprobado</h2>
          <p style="margin:0 0 16px;line-height:1.5;">Hola ${playerName}, ya podés cargar tus predicciones en <strong>${pencaName}</strong>.</p>
          <a href="${dashboardUrl}" style="display:inline-block;background:#1f6feb;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:bold;">Entrar a la penca</a>
          <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.5;">Recordá completar tus pronósticos hasta 30 minutos antes de cada partido.</p>
        </div>
      </div>
    </div>
  `;
  return { subject, text: body, html };
}

function buildApprovalRequestMessage({ player }) {
  const playerName = player.displayName || player.name || player.username;
  const subject = `Nueva solicitud de aprobación: ${playerName}`;
  const baseUrl = APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const adminUrl = baseUrl ? `${baseUrl}/admin/edit` : '/admin/edit';
  const body = [
    'Hay una nueva solicitud pendiente en la penca.',
    '',
    `Jugador: ${playerName}`,
    `Email: ${player.email || 'sin email'}`,
    `Usuario: ${player.username}`,
    '',
    `Revisar solicitudes: ${adminUrl}`
  ].join('\n');
  const html = `
    <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:28px;">
          <h2 style="margin:0 0 12px;font-size:22px;">Nueva solicitud pendiente</h2>
          <p style="margin:0 0 8px;line-height:1.5;"><strong>${playerName}</strong> pidió acceso a la penca.</p>
          <p style="margin:0 0 18px;color:#64748b;line-height:1.5;">${player.email || 'Sin email'} · ${player.username}</p>
          <a href="${adminUrl}" style="display:inline-block;background:#1f6feb;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:bold;">Revisar solicitudes</a>
        </div>
      </div>
    </div>
  `;
  return { subject, text: body, html };
}

function buildPasswordResetMessage({ playerName, resetUrl, requestedByAdmin }) {
  const subject = 'Cambio de contraseña en Pencasa';
  const body = [
    `Hola ${playerName},`,
    '',
    requestedByAdmin
      ? 'Un administrador generó un enlace para que puedas cambiar tu contraseña.'
      : 'Recibimos una solicitud para cambiar tu contraseña.',
    `Usá este enlace para elegir una nueva contraseña: ${resetUrl}`,
    '',
    'El enlace vence en 60 minutos. Si no solicitaste este cambio, podés ignorar este email.',
    '',
    'Equipo de Penca'
  ].join('\n');
  const html = `
    <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:28px;">
          <h2 style="margin:0 0 12px;font-size:22px;">Cambiar contraseña</h2>
          <p style="margin:0 0 16px;line-height:1.5;">Hola ${playerName}, ${requestedByAdmin ? 'un administrador generó este enlace para vos.' : 'recibimos una solicitud para cambiar tu contraseña.'}</p>
          <a href="${resetUrl}" style="display:inline-block;background:#1f6feb;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:bold;">Elegir nueva contraseña</a>
          <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.5;">El enlace vence en 60 minutos. Si no solicitaste este cambio, podés ignorar este email.</p>
        </div>
      </div>
    </div>
  `;
  return { subject, text: body, html };
}

function buildMissingPredictionsMessage({ playerName, missingCount, nextMatch, dashboardUrl }) {
  const subject = 'Tenés pronósticos pendientes en la penca';
  const nextMatchLine = nextMatch
    ? `Próximo pendiente: ${nextMatch.team1 || 'Equipo 1'} vs ${nextMatch.team2 || 'Equipo 2'}`
    : 'Entrá a la penca para revisar los partidos abiertos.';
  const body = [
    `Hola ${playerName},`,
    '',
    `Tenés ${missingCount} pronóstico${missingCount === 1 ? '' : 's'} pendiente${missingCount === 1 ? '' : 's'} para cargar.`,
    nextMatchLine,
    `Entrá acá: ${dashboardUrl}`,
    '',
    'Recordá que los pronósticos cierran 30 minutos antes de cada partido.',
    '',
    'Equipo de Penca'
  ].join('\n');
  const html = `
    <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:28px;">
          <h2 style="margin:0 0 12px;font-size:22px;">Pronósticos pendientes</h2>
          <p style="margin:0 0 12px;line-height:1.5;">Hola ${playerName}, tenés <strong>${missingCount}</strong> pronóstico${missingCount === 1 ? '' : 's'} pendiente${missingCount === 1 ? '' : 's'} para cargar.</p>
          <p style="margin:0 0 18px;color:#64748b;line-height:1.5;">${nextMatchLine}</p>
          <a href="${dashboardUrl}" style="display:inline-block;background:#1f6feb;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:bold;">Cargar pronósticos</a>
          <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.5;">Los pronósticos cierran 30 minutos antes de cada partido.</p>
        </div>
      </div>
    </div>
  `;
  return { subject, text: body, html };
}

async function notifyAdminApprovalRequest({ player }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL;
  if (!adminEmail || !player) return false;
  const message = buildApprovalRequestMessage({ player });
  return sendEmail({ to: adminEmail, ...message });
}

async function notifyPlayerApproval({ player, penca }) {
  if (!player?.email || !penca) return false;
  const message = buildApprovalMessage({
    playerName: player.displayName || player.name || player.username,
    pencaName: penca.name
  });
  return sendEmail({ to: player.email, ...message });
}

async function notifyPasswordReset({ player, resetUrl, requestedByAdmin = false }) {
  if (!player?.email || !resetUrl) return false;
  const message = buildPasswordResetMessage({
    playerName: player.displayName || player.name || player.username,
    resetUrl,
    requestedByAdmin
  });
  return sendEmail({ to: player.email, ...message });
}

async function notifyMissingPredictions({ player, missingCount, nextMatch, dashboardUrl }) {
  if (!player?.email || !missingCount || !dashboardUrl) return false;
  const message = buildMissingPredictionsMessage({
    playerName: player.displayName || player.name || player.username,
    missingCount,
    nextMatch,
    dashboardUrl
  });
  return sendEmail({ to: player.email, ...message });
}

module.exports = {
  sendEmail,
  notifyAdminApprovalRequest,
  notifyMissingPredictions,
  notifyPlayerApproval,
  notifyPasswordReset,
  isConfigured
};
