# EliabeTech - Sistema de Login

Aplicação de autenticação com AngularJS, Express.js, Node.js, MySQL e Bootstrap. Interface em português, com azul principal `#01AFF1`, preto `#000000` e texto branco `#FFFFFF`.

> Descrição do projeto: É um sistema de login completo, open-source, grátis, na qual o usuário cria logins para acessar a área restrita do sistema. Ele conta com validação de email, recuperação de senha, opção de 2FA (Verificação de 2 Fatores), uso de links, envio automático de email e uso de QR Code

## Requisitos

- Node.js 18 ou superior e npm
- MySQL 8 ou compatível
- Serviço SMTP para envio de email
- Aplicativo autenticador TOTP para quem ativar 2FA

## Configuração

1. Para uma instalação nova, execute `database/schema.sql` no MySQL. Para o banco existente, execute uma única vez `database/migrations/001_email_verification_and_2fa.sql`.
2. Copie `.env.example` para `.env`. Configure MySQL, um `JWT_SECRET` forte, credenciais SMTP e a URL pública `APP_BASE_URL` (HTTPS em produção).
3. Gere `MFA_ENCRYPTION_KEY` com `openssl rand -hex 32`. Guarde a chave em um cofre de segredos e mantenha backup seguro; perder ou trocar essa chave impede a validação dos autenticadores já configurados.
4. Instale e execute:

```bash
npm install
npm start
```

A aplicação estará em `http://localhost:3000`. Para desenvolvimento, use `npm run dev`.

## Confirmação de email

O cadastro envia um link de uso único, válido por 30 minutos. O link confirma o endereço e libera o login. O token aleatório é armazenado somente como hash SHA-256. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` e `APP_BASE_URL`.

## Área do usuário e 2FA

Após entrar, a área do usuário exibe nome, sobrenome, telefone e email. O 2FA é opcional e usa códigos TOTP de seis dígitos compatíveis com aplicativos autenticadores. A ativação exige escanear o QR code (ou inserir a chave manual) e confirmar um código; desativar também exige o código atual. Segredos TOTP são criptografados com AES-256-GCM no banco. Configure `MFA_ENCRYPTION_KEY` antes de usar esses recursos.

## Contas iniciais

O script opcional cria os quatro perfis informados usando senhas vindas de variáveis de ambiente e hashes bcrypt; essas contas iniciais são marcadas como verificadas. Defina `SEED_USER_1_PASSWORD` até `SEED_USER_4_PASSWORD` temporariamente e execute `npm run seed`. Nunca faça commit de senhas ou do `.env`; altere credenciais que tenham sido compartilhadas antes de usar em produção.

## Segurança

- Senhas armazenadas com bcrypt.
- Sessões em cookie JWT `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- Consultas MySQL parametrizadas e limitação de requisições.
- Tokens de confirmação com validade e uso único.
- Use HTTPS e mantenha segredos fora do Git.

Consulte `LICENSE` para os termos GNU GPL v3.0.
