const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000
};

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function createToken(userId) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
  }
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

function authRequired(req, res, next) {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ message: 'Faça login para continuar.' });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('auth_token', cookieOptions);
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, phone, password, confirmPassword } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    if (![firstName, lastName, phone].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ message: 'Preencha nome, sobrenome e telefone.' });
    }
    if (!emailPattern.test(email) || email.length > 254) {
      return res.status(400).json({ message: 'Informe um email válido.' });
    }
    if (typeof phone !== 'string' || phone.trim().length > 24) {
      return res.status(400).json({ message: 'Informe um telefone válido.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: 'A senha deve ter entre 8 e 72 caracteres.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'As senhas não coincidem.' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) return res.status(409).json({ message: 'Este email já está cadastrado.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (first_name, last_name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?)',
      [firstName.trim(), lastName.trim(), phone.trim(), email, passwordHash]
    );
    res.status(201).json({ message: 'Cadastro realizado. Você já pode entrar.', user: { id: result.insertId, firstName: firstName.trim(), lastName: lastName.trim(), email } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Este email já está cadastrado.' });
    next(error);
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
      'SELECT id, first_name, last_name, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const user = rows[0];
    const matches = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!matches) return res.status(401).json({ message: 'Email ou senha incorretos.' });

    res.cookie('auth_token', createToken(user.id), cookieOptions);
    res.json({ message: 'Login realizado.', user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email } });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE id = ? LIMIT 1',
      [req.auth.sub]
    );
    if (!rows.length) return res.status(401).json({ message: 'Conta não encontrada.' });
    const user = rows[0];
    res.json({ user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email } });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', cookieOptions);
  res.json({ message: 'Sessão encerrada.' });
});

module.exports = router;
