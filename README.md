# EliabeTech — Sistema de Login

Migração para um monorepo com frontend **React + Next.js**, backend **NestJS usando Express** e banco **MySQL**. O Express é o adaptador HTTP do NestJS; não é necessário manter um segundo servidor Express. A implementação anterior permanece nos caminhos existentes como referência, mas os novos comandos usam `apps/web` e `apps/api`.

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

Frontend: `http://localhost:3000`. API: `http://localhost:4000/api`. Configure segredos fortes, `APP_BASE_URL` e SMTP antes de disponibilizar o serviço. Não use credenciais de exemplo em produção.

## Aplicações

- `apps/web`: interface React renderizada pelo Next.js.
- `apps/api`: API NestJS servida pelo adaptador Express, TypeORM e MySQL.
- `database/schema.sql`: tabelas para instalações novas; o schema existente continua preservado para instalações antigas.

## Fluxos da API

- Cadastro e confirmação de email por token de uso único.
- Login por email/senha; usuários com 2FA passam por desafio TOTP.
- Consulta de sessão, logout e configuração/ativação/desativação de 2FA.
- Solicitação e conclusão de redefinição de senha.

Sessões e desafios usam cookies HttpOnly, SameSite=Strict, Secure em produção. A API valida DTOs, aplica limite de requisições e não expõe hashes/segredos. O schema é gerenciado pelo SQL versionado (`synchronize: false`).

## Observação de migração

A branch `refatorar-2.0` contém a nova base e mantém os arquivos legados para comparação. Revise e teste a aplicação, configure SMTP e valide os fluxos em ambiente local antes de produção. O login anterior não deve ser tratado como removido até concluir a migração e a validação funcional.
