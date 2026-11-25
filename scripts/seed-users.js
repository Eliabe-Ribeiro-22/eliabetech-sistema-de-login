const bcrypt = require('bcryptjs');
const pool = require('../src/database');

const users = [
  { firstName: 'Pedro', lastName: 'Silva', phone: '49 9 9999-9999', email: 'eliaberibeiro06@hotmail.com' },
  { firstName: 'José', lastName: 'Santos', phone: '48 9 8888-8888', email: 'developer.eliabe@gmail.com' },
  { firstName: 'Paulo', lastName: 'Pereira', phone: '47 9 7777-7777', email: 'escritor.eliabe@gmail.com' },
  { firstName: 'João', lastName: 'Silveira', phone: '46 9 6666-6666', email: 'eden.mota@gmail.com' }
];

async function seed() {
  const passwords = users.map((_, index) => process.env[`SEED_USER_${index + 1}_PASSWORD`]);
  if (passwords.some(password => !password || password.length < 8 || password.length > 72)) {
    throw new Error('Defina SEED_USER_1_PASSWORD até SEED_USER_4_PASSWORD (8 a 72 caracteres) no ambiente.');
  }
  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [user.email]);
    if (existing.length) {
      console.log(`Já existe: ${user.email} (nenhuma alteração feita).`);
      continue;
    }
    const passwordHash = await bcrypt.hash(passwords[i], 12);
    await pool.execute(
      'INSERT INTO users (first_name, last_name, phone, email, password_hash, email_verified) VALUES (?, ?, ?, ?, ?, 1)',
      [user.firstName, user.lastName, user.phone, user.email, passwordHash]
    );
    console.log(`Criado e marcado como confirmado: ${user.email}`);
  }
}

seed()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
