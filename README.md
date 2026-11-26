# EliabeTech — Sistema de Login

Aplicação organizada como monorepo com frontend **React + Next.js**, API **NestJS usando o adaptador Express** e banco **MySQL**. O frontend AngularJS legado foi removido desta branch; os fluxos de autenticação foram migrados para componentes React.

## Requisitos e inicialização

- Node.js 20+ e npm
- MySQL 8+
- SMTP para confirmação de email e recuperação de senha

```bash
cp .env.example .env
# configure as variáveis e crie as tabelas com:
mysql -u <usuario> -p < database/schema.sql
npm install
npm run dev
```

Frontend: `http://localhost:3000`. API: `http://localhost:4000/api`.

## Funcionalidades migradas

- Cadastro com validação dos campos e confirmação por email.
- Login e sessão JWT em cookie HttpOnly, incluindo desafio TOTP quando 2FA está ativo.
- Área restrita com perfil do usuário e gerenciamento de 2FA (configurar QR, ativar e desativar).
- Logout e recuperação/redefinição de senha.

Configure segredos fortes, `APP_BASE_URL`, SMTP e MySQL antes de executar. A API NestJS usa Express, DTO validation, rate limiting e TypeORM; o schema é aplicado via SQL versionado (`synchronize: false`). Revise e teste todos os fluxos localmente antes de produção. Consulte `LICENSE` para GNU GPL v3.0.
