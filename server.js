const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pool = require('./src/database');
const authRoutes = require('./src/routes/auth');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://ajax.googleapis.com'],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/verify-email', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/login/2fa', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/2fa', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', authRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Ocorreu um erro interno.' });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    app.listen(port, () => console.log(`EliabeTech disponível em http://localhost:${port}`));
  } catch (error) {
    console.error('Não foi possível conectar ao MySQL. Verifique o .env e execute a migração do banco.', error.message);
    process.exit(1);
  }
}

start();
