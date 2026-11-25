USE eliabetech_login;

ALTER TABLE users
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash,
  ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER email_verified,
  ADD COLUMN two_factor_secret VARCHAR(255) NULL AFTER two_factor_enabled;

CREATE TABLE email_verification_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY verification_token_hash_unique (token_hash),
  UNIQUE KEY verification_user_unique (user_id),
  CONSTRAINT verification_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Confirme somente contas existentes cujos endereços já foram verificados por você.
UPDATE users SET email_verified = 1
WHERE email IN (
  'eliaberibeiro06@hotmail.com',
  'developer.eliabe@gmail.com',
  'escritor.eliabe@gmail.com',
  'eden.mota@gmail.com'
);
