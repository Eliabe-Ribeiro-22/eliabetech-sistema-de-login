# EliabeTech - Sistema de Login

Aplicação de autenticação com AngularJS, Express.js, Node.js, MySQL e Bootstrap. Interface em português, com azul principal `#01AFF1`, preto `#000000` e texto branco `#FFFFFF`.

> Descrição do projeto: a definir.

## Requisitos

- Node.js 18 ou superior e npm
- MySQL 8 ou compatível

## Configuração

1. Crie o banco e as tabelas executando `database/schema.sql` no MySQL.
2. Copie `.env.example` para `.env` e preencha as credenciais do banco e um segredo JWT forte e aleatório.
3. Instale e execute:

```bash
npm install
npm start
```

A aplicação estará em `http://localhost:3000`. Para desenvolvimento, use `npm run dev`.

## Contas iniciais

Há um script opcional para criar os quatro perfis fornecidos. Ele lê as senhas de variáveis de ambiente, gera hashes bcrypt e **não armazena senhas em texto puro no repositório**. Defina `SEED_USER_1_PASSWORD` até `SEED_USER_4_PASSWORD` temporariamente no ambiente e execute `npm run seed`. Não compartilhe nem faça commit do arquivo `.env`; remova as variáveis do ambiente depois da execução. O script não altera contas que já existam.

## Segurança

- Senhas armazenadas com bcrypt.
- Autenticação por cookie JWT `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- Consultas MySQL parametrizadas e limitação de tentativas de autenticação.
- Restrinja o cadastro público ou adicione verificação de email antes de expor a aplicação à internet.
- Use HTTPS em produção e mantenha segredos fora do Git.

A descrição completa do projeto pode ser adicionada quando for definida. Consulte `LICENSE` para os termos GNU GPL v3.0.
