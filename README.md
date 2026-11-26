# EliabeTech — Sistema de Login

Aplicação reorganizada como monorepo: interface React com Next.js e API NestJS usando o adaptador Express padrão, com MySQL. A implementação anterior em Express está mantida nos arquivos existentes enquanto a migração evolui; os comandos da raiz executam as novas aplicações em `apps/web` e `apps/api`.

## Requisitos

- Node.js 20 ou superior e npm
- MySQL 8+

## Executar localmente

1. Copie `.env.example` para `.env` e configure os valores. Use segredos fortes e exclusivos fora de desenvolvimento.
2. Crie o banco e as tabelas com `mysql -u <usuario> -p < database/schema.sql`.
3. Instale dependências e inicie os dois serviços:

```bash
npm install
npm run dev
```

A interface abre em `http://localhost:3000`; a API NestJS/Express em `http://localhost:4000/api`.

## Estrutura

- `apps/web`: Next.js/React e interface de autenticação.
- `apps/api`: NestJS com Express, validação de entrada, TypeORM e sessão JWT em cookie HttpOnly.
- `database/schema.sql`: schema MySQL usado pela nova API.
- `src/`, `server.js` e `public/`: implementação Express anterior, mantida temporariamente como referência durante a migração.

## API inicial

- `POST /api/auth/register` — cria usuário e hash bcrypt.
- `POST /api/auth/login` — autentica e define cookie de sessão.
- `GET /api/auth/me` — retorna o usuário da sessão.
- `POST /api/auth/logout` — encerra a sessão no navegador.

As rotas usam validação de DTO, limite de requisições e cookies `HttpOnly`, `SameSite=Strict`, `Secure` em produção. Configure CORS para a origem real do frontend antes de publicar.

## Próximas etapas da migração

A primeira etapa estabelece a arquitetura e o fluxo básico de cadastro/login. Confirmação de email, recuperação de senha e 2FA existentes no sistema anterior ainda precisam ser migradas e integradas à nova API antes de considerar a paridade funcional completa. Não habilite contas públicas em produção sem esses fluxos e testes de segurança.

Consulte `LICENSE` para os termos GNU GPL v3.0.
