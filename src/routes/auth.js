const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const pool = require('../database');
const { sendVerificationEmail } = require('../mailer');
const { encryptSecret, decryptSecret } = require('../two-factor');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000
};
const challengeCookieOptions = { ...cookieOptions, maxAge: 5 * 60 * 1000 };
authenticator.options = { window: 1 };

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function createToken(userId, purpose = 'auth', expiresIn = '8h') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
  }
  return jwt.sign({ sub: String(userId), purpose }, process.env.JWT_SECRET, { expiresIn });
}

function authRequired(req, res, next) {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ message: 'Faça login para continuar.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== 'auth') throw new Error('Token não é uma sessão autenticada.');
    req.auth = payload;
    next();
  } catch {
    res.clearCookie('auth_token', cookieOptions);
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
}

router.post('/register', async (req, res, next) => {
  let connection;
  let transactionStarted = false;
  try {
    const { firstName, lastName, phone, password, confirmPassword } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    if (![firstName, lastName, phone].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ message: 'Preencha nome, sobrenome e telefone.' });
    }
    if (!emailPattern.test(email) || email.length > 254) {
      return res.status(400).json({ message: 'Informe um email válido.' });
    }
    if (phone.trim().length > 24) return res.status(400).json({ message: 'Informe um telefone válido.' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: 'A senha deve ter entre 8 e 72 caracteres.' });
    }
    if (password !== confirmPassword) return res.status(400).json({ message: 'As senhas não coincidem.' });

    connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) return res.status(409).json({ message: 'Este email já está cadastrado.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await connection.beginTransaction();
    transactionStarted = true;
    const [result] = await connection.execute(
      'INSERT INTO users (first_name, last_name, phone, email, password_hash, email_verified) VALUES (?, ?, ?, ?, ?, 0)',
      [firstName.trim(), lastName.trim(), phone.trim(), email, passwordHash]
    );
    await connection.execute(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))',
      [result.insertId, tokenHash]
    );

    try {
      await sendVerificationEmail({ email, firstName: firstName.trim(), token: rawToken });
    } catch (mailError) {
      await connection.rollback();
      transactionStarted = false;
      console.error('Falha ao enviar email de confirmação:', mailError.message);
      return res.status(503).json({ message: 'Não foi possível enviar o email de confirmação. Verifique a configuração de email e tente novamente.' });
    }

    await connection.commit();
    transactionStarted = false;
    res.status(201).json({ message: 'Cadastro iniciado. Clique no link enviado ao seu email para confirmar a conta.' });
  } catch (error) {
    if (transactionStarted && connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Este email já está cadastrado.' });
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

router.post('/verify-email', async (req, res, next) => {
  const token = req.body?.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ message: 'Link de confirmação inválido ou expirado.' });
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT user_id FROM email_verification_tokens WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() LIMIT 1',
      [tokenHash]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Link de confirmação inválido ou expirado. Faça o cadastro novamente.' });
    }
    await connection.execute('UPDATE users SET email_verified = 1 WHERE id = ?', [rows[0].user_id]);
    await connection.execute('DELETE FROM email_verification_tokens WHERE user_id = ?', [rows[0].user_id]);
    await connection.commit();
    res.json({ message: 'Email confirmado com sucesso. Você já pode entrar.' });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!emailPattern.test(email) || typeof password !== 'string') {
      return res.status(400).json({ message: 'Informe email e senha válidos.' });
    }
    const [rows] = await pool.execute(
      'SELECT id, first_name, last_name, email, password_hash, email_verified, two_factor_enabled FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const user = rows[0];
    const matches = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!matches) return res.status(401).json({ message: 'Email ou senha incorretos.' });
    if (!user.email_verified) return res.status(403).json({ message: 'Confirme seu email pelo link enviado antes de entrar.' });

    if (user.two_factor_enabled) {
      res.cookie('mfa_challenge', createToken(user.id, 'mfa', '5m'), challengeCookieOptions);
      return res.json({ requiresTwoFactor: true, message: 'Digite o código do seu aplicativo autenticador.' });
    }
    res.cookie('auth_token', createToken(user.id), cookieOptions);
    res.json({ message: 'Login realizado.', user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email } });
  } catch (error) {
    next(error);
  }
});

router.post('/login/2fa', async (req, res, next) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Informe o código de 6 dígitos do autenticador.' });
  try {
    const challenge = req.cookies?.mfa_challenge;
    if (!challenge) return res.status(401).json({ message: 'Desafio 2FA expirado. Entre novamente com email e senha.' });
    const payload = jwt.verify(challenge, process.env.JWT_SECRET);
    if (payload.purpose !== 'mfa') return res.status(401).json({ message: 'Desafio 2FA inválido.' });
    const [rows] = await pool.execute(
      'SELECT id, first_name, last_name, email, two_factor_secret, two_factor_enabled FROM users WHERE id = ? AND email_verified = 1 LIMIT 1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
      return res.status(401).json({ message: 'A autenticação em duas etapas não está ativa para esta conta.' });
    }
    const valid = authenticator.check(code, decryptSecret(user.two_factor_secret));
    if (!valid) return res.status(401).json({ message: 'Código incorreto ou expirado.' });
    res.clearCookie('mfa_challenge', challengeCookieOptions);
    res.cookie('auth_token', createToken(user.id), cookieOptions);
    res.json({ message: 'Login realizado.', user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email } });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      res.clearCookie('mfa_challenge', challengeCookieOptions);
      return res.status(401).json({ message: 'Desafio 2FA expirado ou inválido. Entre novamente.' });
    }
    next(error);
  }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, first_name, last_name, phone, email, email_verified, two_factor_enabled FROM users WHERE id = ? LIMIT 1',
      [req.auth.sub]
    );
    if (!rows.length) return res.status(401).json({ message: 'Conta não encontrada.' });
    const user = rows[0];
    res.json({ user: { id: user.id, firstName: user.first_name, lastName: user.last_name, phone: user.phone, email: user.email, emailVerified: Boolean(user.email_verified), twoFactorEnabled: Boolean(user.two_factor_enabled) } });
  } catch (error) {
    next(error);
  }
});

router.post('/2fa/setup', authRequired, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT email, two_factor_enabled FROM users WHERE id = ? LIMIT 1', [req.auth.sub]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'Conta não encontrada.' });
    if (user.two_factor_enabled) return res.status(409).json({ message: 'A autenticação em duas etapas já está ativa.' });
    const secret = authenticator.generateSecret();
    const secretEncrypted = encryptSecret(secret);
    await pool.execute(
      'UPDATE users SET two_factor_secret = ?, two_factor_enabled = 0 WHERE id = ?',
      [secretEncrypted, req.auth.sub]
    );
    const otpauthUrl = authenticator.keyuri(user.email, 'EliabeTech', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, { errorCorrectionLevel: 'M', margin: 2, width: 240 });
    res.json({ qrCodeDataUrl, manualKey: secret, message: 'Escaneie o QR code no aplicativo autenticador e confirme com o código exibido.' });
  } catch (error) {
    next(error);
  }
});

router.post('/2fa/enable', authRequired, async (req, res, next) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Informe o código de 6 dígitos do autenticador.' });
  try {
    const [rows] = await pool.execute('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ? LIMIT 1', [req.auth.sub]);
    const user = rows[0];
    if (!user || !user.two_factor_secret) return res.status(400).json({ message: 'Inicie a configuração do autenticador primeiro.' });
    if (user.two_factor_enabled) return res.status(409).json({ message: 'A autenticação em duas etapas já está ativa.' });
    if (!authenticator.check(code, decryptSecret(user.two_factor_secret))) {
      return res.status(400).json({ message: 'Código incorreto ou expirado. Tente novamente.' });
    }
    await pool.execute('UPDATE users SET two_factor_enabled = 1 WHERE id = ?', [req.auth.sub]);
    res.json({ message: 'Autenticação em duas etapas ativada.' });
  } catch (error) {
    next(error);
  }
});

router.post('/2fa/disable', authRequired, async (req, res, next) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Informe o código de 6 dígitos do autenticador.' });
  try {
    const [rows] = await pool.execute('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ? LIMIT 1', [req.auth.sub]);
    const user = rows[0];
    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
      return res.status(400).json({ message: 'A autenticação em duas etapas não está ativa.' });
    }
    if (!authenticator.check(code, decryptSecret(user.two_factor_secret))) {
      return res.status(400).json({ message: 'Código incorreto ou expirado. Tente novamente.' });
    }
    await pool.execute('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?', [req.auth.sub]);
    res.json({ message: 'Autenticação em duas etapas desativada.' });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', cookieOptions);
  res.clearCookie('mfa_challenge', challengeCookieOptions);
  res.json({ message: 'Sessão encerrada.' });
});

module.exports = router;
