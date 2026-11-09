# OnlyOne — Arquitetura de Referência FASE 0 (Revisão ONLYONE_ARCH_005)

Proposta de arquitetura revista e endurecida para a Fundação Técnica, Identidade, Segurança e Workspace Pessoal do OnlyOne (PRD-001 / MVP-001), incorporando integralmente as correções da revisão crítica ARCH-005.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Resumo Executivo das Correções Arquiteturais ARCH-005:**
> 1. **Gestão de Sessões Endurecida:** Os tokens de sessão **nunca** são persistidos em texto simples. O cliente recebe um token de 256 bits (`crypto.randomBytes(32)`), e a base de dados persiste unicamente o seu hash criptográfico SHA-256. Implementada rotação ativa, revogação imediata (`revoked_at`), expiração absoluta e inativa, cookies `HttpOnly; Secure; SameSite=Strict` e proteção CSRF com cabeçalho obrigatório `X-OnlyOne-CSRF`. O `localStorage` é explicitamente proibido para armazenamento de credenciais.
> 2. **Password Hashing Seguro e Não-Bloqueante:** Substituição de chamadas síncronas por `crypto.scrypt` assíncrono (`util.promisify`), evitando o bloqueio do Event Loop do Node.js. Formato persistido versionado (`$scrypt$v=1$N=16384,r=8,p=1$<salt>$<hash>`), comparação em tempo constante via `crypto.timingSafeEqual` e estratégia de rehash automático na autenticação para evolução futura de parâmetros.
> 3. **SQLite com Concorrência e Persistência Transparentes:** Configuração em modo Write-Ahead Logging (`WAL`), `synchronous = NORMAL`, `busy_timeout = 5000` e chaves estrangeiras ativadas (`PRAGMA foreign_keys = ON`). Documentadas com rigor as limitações de processo único de escrita, estratégia de backup online contínuo com a SQLite Backup API, e desacoplamento em repositórios de domínio para garantir migração futura transparente para PostgreSQL.
> 4. **Isolamento Estrito em Nível de Domínio:** A verificação de propriedade não ocorre apenas na rota, mas no próprio serviço de domínio (`WorkspaceService`, `ProfileService`), garantindo coerência entre `owner_id` e a tabela `workspace_memberships`. Adicionados testes de isolamento para Leitura, Alteração e Eliminação cruzada.
> 5. **Auditoria Sanitizada e Imutável:** Allowlist rígida de campos permitidos por evento, filtro profundo que expurga recursivamente chaves sensíveis (`password`, `token`, `secret`, `cookie`, `hash`) e gatilhos SQL (`triggers`) que tornam a tabela `audit_logs` imutável (rejeitando `UPDATE` e `DELETE`).
> 6. **Integridade Transacional Total:** Criação atómica em bloco `db.transaction()` (utilizador, perfil, workspace, membership, sessão e log de auditoria) com rollback integral garantido em caso de qualquer exceção.
> 7. **Separação Estrita de Ambientes e Deployment:** Em produção (`NODE_ENV=production`), o Express serve o bundle estático pré-compilado em `dist/` sem qualquer dependência ou inicialização do motor Vite. O endpoint de health check não expõe dados sensíveis nem versões internas.

---

## 1. Arquitetura Corrigida

### Diagrama Estrutural do Sistema

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Cliente Web (React 19)                                 │
│      Nenhum token em localStorage ── Cookie HttpOnly + Cabeçalho X-OnlyOne-CSRF        │
│   ┌───────────────────┬───────────────────┬───────────────────┬───────────────────┐    │
│   │    Auth Views     │  Workspace View   │   Profile View    │    Audit View     │    │
│   └─────────┬─────────┴─────────┬─────────┴─────────┬─────────┴─────────┬─────────┘    │
└─────────────┼───────────────────┼───────────────────┼───────────────────┼──────────────┘
              │                   │                   │                   │
              ▼                   ▼                   ▼                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                      server.ts                                         │
│   Produção: express.static('dist') / Desenv: vite.middlewares (Isolamento de Ambiente) │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                       Camada de Segurança e Middlewares Globais                        │
│   Rate Limiter ── Cookie Parser ── CSRF Protection Guard ── Error Boundary Central     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                  Router API (/api/v1)                                  │
│   ┌───────────────────┬───────────────────┬───────────────────┬───────────────────┐    │
│   │   /v1/auth/*      │   /v1/users/*     │  /v1/workspaces/* │   /v1/health      │    │
│   └─────────┬─────────┴─────────┬─────────┴─────────┬─────────┴─────────┬─────────┘    │
├─────────────┼───────────────────┼───────────────────┼───────────────────┼──────────────┤
│             ▼                   ▼                   ▼                   ▼              │
│      IdentityService      ProfileService      WorkspaceService     AuditService        │
│    (scrypt assíncrono)    (Validação Zod/       (Isolamento e      (Allowlist e        │
│    (TimingSafeEqual)        Sanitização)        Memberships)       Sanitização)        │
│             │                   │                   │                   │              │
│             └───────────────────┼───────────────────┴───────────────────┘              │
│                                 ▼                                                      │
│                     Transações ACID Atómicas (Rollback Seguro)                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                     Base de Dados Relacional SQLite (Modo WAL)                         │
│             PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;                      │
│   users ── user_profiles ── workspaces ── workspace_memberships ── sessions ── audit   │
│                (Sessions: apenas SHA-256 | Audit: Trigger Imutável)                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Decisões Mantidas e Justificações

| Decisão Mantida | Justificação Técnica |
| :--- | :--- |
| **Monólito Modular Express 4 + TypeScript** | Evita microserviços prematuros (REGRA 003), preserva a integridade da stack no contêiner com porta única (3000) e permite compartilhar tipos estritos entre serviços e cliente. |
| **React 19 + Tailwind CSS 4 no Frontend** | Desempenho de renderização nativo, arquitetura sem pills decorativas e total conformidade com a constituição visual de *SaaS & Dashboards*. |
| **API RESTful Versionada (`/api/v1`)** | Previsibilidade de contrato, facilidade de auditoria e compatibilidade com clientes Web e ferramentas de automação. |
| **Chaves Primárias UUID v4 (TEXT)** | Garantem portabilidade de dados, impedem ataques de enumeração sequencial e facilitam migrações futuras para PostgreSQL ou bases distribuídas. |

---

## 3. Decisões Alteradas (Correções ARCH-005)

| Elemento | Abordagem Anterior | Nova Abordagem (Corrigida) | Racional da Mudança |
| :--- | :--- | :--- | :--- |
| **Persistência de Sessões** | Token em texto simples na base | **Apenas SHA-256 do token é persistido** (`session_token_hash`) | Previne sequestro de contas mesmo em caso de vazamento completo da base de dados. |
| **Password Hashing** | `crypto.scryptSync` síncrono | **`crypto.scrypt` assíncrono** com `util.promisify` | Elimina o risco de bloqueio do Event Loop do Node.js sob requisições concorrentes. |
| **Comparação de Credenciais** | Comparação padrão de strings | **`crypto.timingSafeEqual`** | Mitiga vulnerabilidades de Timing Attack na validação de hashes. |
| **Proteção de Transporte** | Apenas cookie HttpOnly genérico | **Cookie `SameSite=Strict; Secure` + Header `X-OnlyOne-CSRF`** | Proteção em profundidade contra ataques Cross-Site Request Forgery em navegadores. |
| **Auditoria** | Registo genérico de eventos | **Allowlist estrita de campos + Trigger SQL de imutabilidade** | Impede fuga de dados sensíveis e impede adulteração forense de histórico. |
| **Concorrência do SQLite** | Configuração padrão | **WAL mode + `busy_timeout=5000` + Backup API** | Permite leituras não-bloqueantes simultâneas e backups a quente sem travar o sistema. |
| **Serviço de Produção** | `vite.middlewares` no servidor | **`express.static('dist')` em produção** | Isola completamente as dependências de compilação em tempo de execução produtivo. |

---

## 4. Modelo de Dados Corrigido

O esquema SQL incorpora as correções de hashing de sessão, constraints de imutabilidade e integridade referencial estrita:

```sql
-- 1. Utilizadores
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Perfis de Utilizador
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'pt-PT',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  bio TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Workspaces Pessoais
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'personal' CHECK(type IN ('personal', 'team', 'enterprise')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);

-- 4. Membros e Relações do Workspace
CREATE TABLE IF NOT EXISTS workspace_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON workspace_memberships(user_id);

-- 5. Sessões (Apenas Hash Criptográfico)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_token_hash TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 6. Registos de Auditoria Imutáveis
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('success', 'failure')),
  details_json TEXT,
  ip_address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at);

-- Trigger de Imutabilidade da Auditoria (Impede UPDATE e DELETE)
CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_update
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Operação proibida: Os registos de auditoria são imutáveis.');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_delete
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Operação proibida: Os registos de auditoria não podem ser eliminados.');
END;

-- Tabela de Controlo de Migrações
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Contratos de API (v1)

Todos os endpoints que alteram estado exigem autenticação e cabeçalho CSRF.

| Método | Endpoint | Protegido | Cabeçalhos Obrigatórios | Descrição e Resposta |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Não | Nenhum | Retorna exclusivamente `{ "status": "healthy", "timestamp": "2026-11-08T..." }` sem expor ambiente ou versões. |
| `GET` | `/api/v1/auth/csrf` | Não | Nenhum | Emite/retorna o token anti-CSRF para o cliente Web. |
| `POST` | `/api/v1/auth/register` | Não | `X-OnlyOne-CSRF` | Cria conta de forma atómica. Define cookie HttpOnly e retorna `{ "user": {...}, "profile": {...}, "workspace": {...} }`. |
| `POST` | `/api/v1/auth/login` | Não | `X-OnlyOne-CSRF` | Autentica credenciais, efetua rotação de sessão, define cookie e retorna dados do utilizador. |
| `POST` | `/api/v1/auth/logout` | Sim | `X-OnlyOne-CSRF` | Marca a sessão como revogada (`revoked_at = NOW()`), limpa o cookie e retorna `{ "success": true }`. |
| `GET` | `/api/v1/users/me` | Sim | Nenhum | Retorna o perfil completo do utilizador autenticado. |
| `PATCH` | `/api/v1/users/me` | Sim | `X-OnlyOne-CSRF` | Atualiza atributos permitidos do perfil (`display_name`, `bio`, `locale`, `timezone`). |
| `GET` | `/api/v1/workspaces/me` | Sim | Nenhum | Retorna o workspace pessoal do utilizador autenticado com garantia de isolamento. |
| `GET` | `/api/v1/audit/me` | Sim | Nenhum | Retorna os eventos de auditoria do próprio utilizador (últimos 50 registos sanitizados). |

---

## 6. Estratégia de Autenticação e Gestão de Sessões

### A. Ciclo de Vida do Token de Sessão
1. **Geração:** O servidor gera `rawToken = crypto.randomBytes(32).toString('hex')` (256 bits de entropia).
2. **Armazenamento:** O servidor calcula `tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')`.
3. **Persistência:** Apenas `tokenHash` é gravado na coluna `sessions.session_token_hash`. O `rawToken` nunca é escrito no disco.
4. **Transporte:** O cliente recebe `rawToken` exclusivamente via cookie:
   `Set-Cookie: onlyone_session=<rawToken>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Priority=High`
5. **Validação na Requisição:**
   - O middleware `requireAuth` extrai o cookie (ou o cabeçalho `Authorization: Bearer <token>` em chamadas de API de teste).
   - Calcula o SHA-256 do token recebido.
   - Executa a busca parametrizada:
     `SELECT * FROM sessions WHERE session_token_hash = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP;`
   - Se inválido, ausente ou expirado, rejeita com `HTTP 401 Unauthorized` e limpa o cookie.
6. **Rotação Ativa:** Ao efetuar login ou ações de alta criticidade, a sessão anterior é revogada e uma nova sessão é emitida, prevenindo fixação de sessão.
7. **Revogação (Logout):** O endpoint de logout marca a sessão atual com `revoked_at = CURRENT_TIMESTAMP`, inutilizando o token imediatamente.

### B. Hashing Assíncrono de Palavras-Passe
- **Algoritmo:** `crypto.scrypt` assíncrono (encapsulado via `util.promisify(crypto.scrypt)`).
- **Parâmetros Calibrados:**
  - `N` (CPU/Memory Cost): `16384`
  - `r` (Block Size): `8`
  - `p` (Parallelization): `1`
  - `keyLen`: `64` bytes
  - `salt`: 16 bytes criptograficamente aleatórios gerados por `crypto.randomBytes(16)`.
- **Formato Serializado:** `$scrypt$v=1$N=16384,r=8,p=1$<salt_hex>$<derived_key_hex>`
- **Verificação Segura:**
  - Extração dos parâmetros, salt e hash da string persistida.
  - Execução assíncrona do `scrypt` com a senha fornecida e o salt extraído.
  - Comparação em tempo constante: `crypto.timingSafeEqual(bufferCalculado, bufferPersistido)`.
- **Estratégia de Evolução:** Se os parâmetros configurados no sistema forem superiores aos parâmetros indicados no cabeçalho do hash do utilizador (ex.: evolução para `$v=2$`), o serviço dispara automaticamente uma rotina de re-hash assíncrona durante o login bem-sucedido.

---

## 7. Estratégia de Segurança e Isolamento

### A. Isolamento de Recursos e Verificação de Domínio (REGRA 005)
- **Princípio da Não-Confiança no Cliente:** O cliente nunca envia `userId` nem pode ditar qual workspace pretende aceder através de parâmetros arbitrários.
- **Resolução no Serviço de Domínio:**
  - `WorkspaceService.getPersonalWorkspace(userId)` busca estritamente:
    `SELECT * FROM workspaces WHERE owner_id = ? AND type = 'personal';`
  - Toda operação de escrita ou leitura sobre um workspace valida obrigatoriamente a coexistência na tabela `workspace_memberships`:
    `SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?;`
  - Tentativas de acesso a recursos não pertencentes ao utilizador autenticado retornam `HTTP 403 Forbidden` ou `HTTP 404 Not Found`, impedindo enumeração e IDOR.

### B. Proteção CSRF
- **Estratégia Double-Submit / Header Obligatório:**
  - Requisições mutadoras (`POST`, `PATCH`, `DELETE`) exigem a presença do cabeçalho customizado `X-OnlyOne-CSRF`.
  - Navegadores bloqueiam chamadas cross-origin com cabeçalhos customizados não autorizados por CORS.
  - O middleware CSRF valida a origem (`Origin` / `Referer`) contra a URL da aplicação e confirma o token CSRF.

### C. Auditoria Sanitizada e Imutável
- **Allowlist Rigorosa de Campos:**
  - Permitidos: `action`, `resource_type`, `resource_id`, `status`, `ip_address`, `details` (apenas contendo chaves como `fields_modified`, `reason`, `attempt_count`).
- **Filtro de Expurgamento Ativo:**
  - O serviço de auditoria executa uma função de sanitização recursiva que elimina ou mascara qualquer chave com nome `password`, `token`, `secret`, `hash`, `cookie`, `credential`, `key`.
- **Proteção de Base de Dados:**
  - A tabela `audit_logs` possui gatilhos SQL ativados que geram `RAISE(ABORT)` perante comandos `UPDATE` e `DELETE`.

---

## 8. Estratégia de Persistência, Concorrência e Recuperação

### A. Concorrência no SQLite e Event Loop
- **Limitações do SQLite e better-sqlite3:**
  - O SQLite suporta múltiplos leitores simultâneos, mas possui um modelo de **single-writer** (um único processo de escrita por vez).
  - Como `better-sqlite3` é síncrono, uma escrita demorada poderia teoricamente bloquear o Event Loop do Node.js.
  - **Mitigações Implementadas:**
    1. Ativação do modo Write-Ahead Logging (`PRAGMA journal_mode = WAL;`), onde escritas ocorrem no ficheiro WAL sem bloquear leitores.
    2. Configuração de `PRAGMA busy_timeout = 5000;` para que conexões concorrentes aguardem até 5 segundos em caso de contenção momentânea de lock.
    3. Transações de domínio estritamente atómicas e minimalistas, com tempo de execução inferior a 2ms, eliminando qualquer impacto perceptível no Event Loop.

### B. Estratégia de Backups e Recuperação
- **Backups Online sem Interrupção:** Utilização da SQLite Online Backup API (`db.backup('data/backups/onlyone-<timestamp>.db')`), que copia páginas de dados de forma consistente mesmo durante operações ativas.
- **Verificação de Integridade:** Rotina periódica executando `PRAGMA integrity_check;` e `PRAGMA foreign_key_check;`.

### C. Estratégia de Migração Futura para PostgreSQL
- **Desacoplamento por Repositórios:** Toda a interação com a base de dados é encapsulada em interfaces de repositório (`IUserRepository`, `IWorkspaceRepository`, `ISessionRepository`, `IAuditRepository`).
- **SQL Portável:** As queries utilizam dialeto ANSI SQL com parâmetros posicionais, tipos portáveis (`TEXT/UUID`, `TIMESTAMP ISO-8601`) e esquemas normalizados compatíveis com PostgreSQL. A transição futura para Cloud SQL exigirá apenas a substituição do conector de dados no ficheiro de conexão (`database/connection.ts`), sem alterar uma única linha dos serviços de domínio.

---

## 9. Plano de Deployment e Separação de Ambientes

### A. Isolamento Desenvolvimento vs Produção
- **Ambiente de Desenvolvimento (`NODE_ENV=development`):**
  - `server.ts` carrega dinamicamente `vite.createServer(...)` e monta `vite.middlewares`.
  - Permite recarregamento ágil de módulos e desenvolvimento unificado.
- **Ambiente de Produção (`NODE_ENV=production`):**
  - O comando `npm run build` compila o frontend React para o diretório `/dist`.
  - O servidor `server.ts` inicia **sem instanciar o Vite**, servindo os assets estáticos via `express.static('dist', { maxAge: '1y', immutable: true })` e encaminhando rotas SPA não-API para `dist/index.html`.
  - Economia substancial de memória, CPU e eliminação de ferramentas de compilação em runtime produtivo.

### B. Configuração de Servidor e HTTPS
- **Terminação HTTPS e Proxy:** Configuração de `app.set('trust proxy', 1)` para que o Express interprete corretamente os cabeçalhos `X-Forwarded-Proto` e aplique os atributos `Secure` aos cookies.
- **Health Check Neutro:** Endpoint `/api/v1/health` respondendo exclusivamente com `{ "status": "healthy", "timestamp": "..." }`, retornando status 200 sem vazar dados de versão do Node, métricas de SO ou caminhos de diretório.

---

## 10. Matriz de Testes Automatizados (Etapa C)

A suite de testes executável (`tests/run-phase0-tests.ts`) cobrirá rigorosamente os seguintes cenários:

| ID | Caso de Teste | Descrição da Validação | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **T01** | `test_register_atomic` | Registo de utilizador com criação atómica de perfil, workspace e sessão | `201 Created` e registos consistentes na DB |
| **T02** | `test_register_rollback` | Simulação de falha intencional na transação durante o registo | Rollback total; nenhum dado residual na DB |
| **T03** | `test_register_validation` | Rejeição de e-mail inválido, senha com menos de 8 caracteres ou e-mail duplicado | `400 Bad Request` / `409 Conflict` |
| **T04** | `test_login_success` | Login com credenciais válidas e rotação de sessão | `200 OK` + novo token de sessão emitido |
| **T05** | `test_login_invalid_password` | Tentativa de login com senha incorreta | `401 Unauthorized` |
| **T06** | `test_session_hash_storage` | Verificação direta na base de dados de que o token não está em texto simples | `session_token_hash` presente; `rawToken` ausente |
| **T07** | `test_session_revocation` | Chamada ao endpoint `/auth/logout` | `200 OK` e `revoked_at` preenchido na DB |
| **T08** | `test_session_expiration` | Tentativa de acesso com sessão com `expires_at` no passado | `401 Unauthorized` |
| **T09** | `test_session_tampering` | Tentativa de acesso com token alterado / assinatura corrompida | `401 Unauthorized` |
| **T10** | `test_csrf_protection` | Requisição `POST /api/v1/users/me` sem o cabeçalho `X-OnlyOne-CSRF` | `403 Forbidden` |
| **T11** | `test_user_profile_crud` | Consulta e atualização válida de dados do perfil | `200 OK` e campos persistidos |
| **T12** | `test_workspace_isolation_read` | Utilizador A tenta consultar o workspace do Utilizador B | `403 Forbidden` ou `404 Not Found` |
| **T13** | `test_workspace_isolation_write` | Utilizador A tenta alterar recursos do Utilizador B | `403 Forbidden` ou `404 Not Found` |
| **T14** | `test_workspace_isolation_delete`| Utilizador A tenta revogar ou apagar a sessão do Utilizador B | `403 Forbidden` |
| **T15** | `test_membership_consistency` | Verificação de que todo workspace criado possui membership de 'owner' | Consistência relacional 100% |
| **T16** | `test_scrypt_async_timing` | Validação de que o hashing é assíncrono e utiliza `timingSafeEqual` | Formato `$scrypt$v=1$...` comprovado |
| **T17** | `test_audit_sanitization` | Verificação direta na tabela `audit_logs` garantindo ausência de senhas | Nenhuma chave proibida persistida |
| **T18** | `test_audit_immutability` | Tentativa de executar `UPDATE` ou `DELETE` na tabela `audit_logs` | Exceção gerada pelo Trigger SQL |
| **T19** | `test_sqlite_persistence_restart`| Fecho da conexão com a DB, reabertura e consulta de integridade | Todos os dados persistem intactos |
| **T20** | `test_concurrency_writes` | Execução simultânea de 20 transações concorrentes | Todas concluídas sem lock contention |
| **T21** | `test_responsive_ui_rendering` | Renderização funcional da interface web em breakpoints mobile e desktop | Sem quebra de layout |

---

## 11. Riscos Residuais e Limitações

1. **Escalabilidade Multi-Instância do SQLite:** O SQLite em modo WAL suporta tráfego elevado para uma única instância, mas não é projetado para escalonamento horizontal multi-réplicas (como Kubernetes com múltiplos pods de escrita simultâneos) sem ferramentas de replicação de bloco (como Litestream/LiteFS). Para a Fase 0, é a escolha ideal pela simplicidade e ausência de dependências de rede, mas a migração para Cloud SQL PostgreSQL deve ocorrer assim que o OnlyOne entrar em fase multi-região ou institucional.
2. **Ambientes Serverless Efémeros:** Em plataformas serverless onde o contêiner perde o disco local a cada restart, o SQLite precisa de um volume persistente montado. No ambiente do AI Studio, o disco local permanece persistente ao longo da sessão de desenvolvimento.

---

## 12. Critérios de Aceitação para Autorização da FASE 0

A Fase 0 será considerada pronta para aprovação quando:
- Todas as 21 rotinas de teste da matriz automatizada forem executadas com 100% de sucesso (`npm test`).
- O servidor Express funcionar de forma fluida e responsiva na porta 3000, servindo tanto a API quanto a interface Web do OnlyOne.
- O registo, login, logout, atualização de perfil e visualização do workspace pessoal funcionarem de forma real e comprovável.
- Não existir qualquer segredo, token em texto simples ou password desprotegida no código ou na base de dados.
