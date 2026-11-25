const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

async function sendVerificationEmail({ email, firstName, token }) {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'APP_BASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Configuração de email ausente: ${missing.join(', ')}`);

  const port = Number(process.env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const baseUrl = process.env.APP_BASE_URL.replace(/\/$/, '');
  const verificationUrl = `${baseUrl}/verify.html?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(firstName);

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Confirme seu email — EliabeTech',
    text: `Olá, ${firstName}! Confirme seu email acessando: ${verificationUrl}\nEste link expira em 30 minutos. Se você não criou a conta, ignore esta mensagem.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111"><h2>Confirme seu email</h2><p>Olá, ${safeName}!</p><p>Clique no botão abaixo para confirmar que este endereço de email é seu.</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#01AFF1;color:#000;text-decoration:none;border-radius:6px;font-weight:bold">Confirmar email</a></p><p>O link expira em 30 minutos. Se você não criou esta conta, ignore esta mensagem.</p></div>`
  });
}

module.exports = { sendVerificationEmail };
