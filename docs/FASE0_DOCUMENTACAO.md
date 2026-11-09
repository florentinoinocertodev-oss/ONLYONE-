# Documentação Técnica — OnlyOne FASE 0 (Fundação)

## 1. Visão Geral do Produto
O OnlyOne é uma plataforma universal de produtividade pessoal, projetada para unificar ferramentas de trabalho sem substituí-las.
A **FASE 0 — Fundação** estabelece a arquitetura de monólito modular, identidade segura, base de dados relacional persistente, gestão de sessões, perfis, workspaces pessoais com isolamento estrito e sistema de auditoria imutável.

---

## 2. Tecnologias e Arquitetura

### A. Stack Tecnológica
- **Runtime:** Node.js v22+
- **Backend:** Express 4.21.2 + TypeScript 7.0.2 executado via `tsx`
- **Frontend:** React 19.0.1 + Tailwind CSS 4.3.3 + Lucide React + Motion
- **Base de Dados:** SQLite (`better-sqlite3` 13.0.3) em modo Write-Ahead Logging (`WAL`), `synchronous = NORMAL`, `busy_timeout = 5000` e chaves estrangeiras (`PRAGMA foreign_keys = ON`).
- **Criptografia:** `crypto.scrypt` assíncrono (N=16384, r=8, p=1, keyLen=64, salt=16B) com comparação em tempo constante via `crypto.timingSafeEqual`.
- **Sessões:** Tokens aleatórios de 256 bits (`crypto.randomBytes(32)`), mantidos exclusivamente em hash SHA-256 no banco de dados e transportados por cookies `HttpOnly; SameSite=Strict; Secure`.

### B. Estrutura de Pastas Modular
```
backend/
├── core/                  # Configurações globais, tipagem de erros e middlewares
├── database/              # Conexão SQLite (WAL mode) e migrador transacional
├── identity/              # Algoritmo scrypt assíncrono e serviço de registo/login
├── security/              # Sessões com hash SHA-256, autenticação e proteção CSRF
├── profiles/              # Gestão e atualização de perfis de utilizador
├── workspaces/            # Workspaces pessoais e garantia de isolamento (anti-IDOR)
├── audit/                 # Auditoria forense imutável com sanitização preventiva
└── api/
    └── v1/                # Contrato RESTful versionado (/api/v1)
migrations/                # Ficheiros SQL versionados com checksum SHA-256
src/                       # Frontend React 19 (Componentes, Views e API Client)
tests/                     # Testes automatizados executáveis (run-phase0-tests.ts)
docs/                      # Documentação técnica e relatórios de conformidade
```

---

## 3. Variáveis de Ambiente e Configuração

Definidas em `.env` (exemplo em `.env.example`):
```bash
# Ambiente de execução (development | production)
NODE_ENV="development"

# Porta do servidor unificado (Obrigatório 3000 no AI Studio)
PORT=3000

# Caminho da base de dados SQLite persistente
DB_PATH="data/onlyone.db"
```

---

## 4. Esquema da Base de Dados e Migrações

As migrações residem em `/migrations` e são aplicadas atómica e sequencialmente através do comando `runMigrations()`, que calcula o checksum SHA-256 de cada script e valida a tabela `_migrations`.

### Principais Tabelas:
1. `users`: Identidade principal (`id`, `email`, `password_hash`, `status`, `created_at`, `updated_at`).
2. `user_profiles`: Dados do perfil (`id`, `user_id`, `display_name`, `locale`, `timezone`, `bio`, `updated_at`).
3. `workspaces`: Ambientes de trabalho (`id`, `name`, `slug`, `owner_id`, `type`, `created_at`, `updated_at`).
4. `workspace_memberships`: Relação relacional n:n (`id`, `workspace_id`, `user_id`, `role`, `joined_at`).
5. `sessions`: Sessões ativas (`id`, `session_token_hash`, `user_id`, `created_at`, `expires_at`, `revoked_at`). O token bruto NUNCA é persistido.
6. `audit_logs`: Histórico imutável de ações (`id`, `user_id`, `action`, `resource_type`, `resource_id`, `status`, `details_json`, `ip_address`, `created_at`). Possui triggers SQL que abortam comandos `UPDATE` e `DELETE`.

---

## 5. Contratos de API (v1)

| Endpoint | Método | Autenticação | Descrição |
| :--- | :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Não | Retorna exclusivamente `{ status: "healthy", timestamp: "..." }` |
| `/api/v1/auth/csrf` | `GET` | Não | Emite o token CSRF para requisições do navegador |
| `/api/v1/auth/register` | `POST` | Não (CSRF) | Cria utilizador, perfil, workspace e sessão em transação atómica |
| `/api/v1/auth/login` | `POST` | Não (CSRF) | Autentica credenciais com scrypt e emite nova sessão |
| `/api/v1/auth/logout` | `POST` | Sim (CSRF) | Revoga sessão ativa no servidor e limpa cookie |
| `/api/v1/users/me` | `GET` | Sim | Retorna perfil do utilizador autenticado |
| `/api/v1/users/me` | `PATCH` | Sim (CSRF) | Atualiza informações de exibição, bio, fuso horário e região |
| `/api/v1/workspaces/me` | `GET` | Sim | Retorna workspace pessoal com isolamento verificado no domínio |
| `/api/v1/workspaces/:id` | `GET` | Sim | Consulta workspace específico validando memberships |
| `/api/v1/workspaces/:id` | `PATCH` | Sim (CSRF) | Atualiza nome do workspace (apenas proprietário) |
| `/api/v1/audit/me` | `GET` | Sim | Retorna histórico sanitizado das últimas atividades |

---

## 6. Segurança e Mecanismos de Isolamento

1. **Anti-IDOR:** Nenhuma operação de leitura, alteração ou exclusão confia em parâmetros fornecidos pelo cliente. O serviço de domínio valida que o recurso pertence exclusivamente ao utilizador da sessão (`owner_id == req.user.id`).
2. **Proteção de Sessão:** Tokens aleatórios de 256 bits, persistidos unicamente sob a forma de hash SHA-256. Em caso de extração não autorizada do ficheiro `.db`, nenhum token ativo pode ser decodificado ou reutilizado.
3. **Proteção CSRF:** Requisições mutadoras exigem a presença do cabeçalho customizado `X-OnlyOne-CSRF`.
4. **Sanitização de Auditoria:** Filtro recursivo que expurga preventivamente senhas, tokens e segredos antes da gravação. Triggers SQL tornam os registos imutáveis.

---

## 7. Execução Local e Testes

### Instalação de Dependências
```bash
npm install
```

### Execução dos Testes Automatizados
```bash
npm test
# ou: tsx tests/run-phase0-tests.ts
```

### Inicialização em Modo de Desenvolvimento
```bash
npm run dev
```

### Inicialização em Modo de Produção
```bash
npm run build
NODE_ENV=production npm start
```
