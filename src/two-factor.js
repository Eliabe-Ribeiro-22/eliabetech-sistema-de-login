const crypto = require('crypto');

function encryptionKey() {
  const value = process.env.MFA_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('MFA_ENCRYPTION_KEY deve ser uma chave hexadecimal aleatória de 64 caracteres.');
  }
  return Buffer.from(value, 'hex');
}

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}

function decryptSecret(value) {
  const [ivHex, tagHex, ciphertextHex] = String(value).split(':');
  if (!ivHex || !tagHex || !ciphertextHex) throw new Error('Segredo 2FA armazenado inválido.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = { encryptSecret, decryptSecret };
