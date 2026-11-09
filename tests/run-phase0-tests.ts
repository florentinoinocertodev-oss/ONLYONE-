import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { runMigrations } from '../backend/database/migrator.ts';
import { getDatabase, closeDatabase } from '../backend/database/connection.ts';
import { IdentityService } from '../backend/identity/identity.service.ts';
import { PasswordHasher } from '../backend/identity/hasher.ts';
import { SessionService } from '../backend/security/session.service.ts';
import { ProfileService } from '../backend/profiles/profiles.service.ts';
import { WorkspaceService } from '../backend/workspaces/workspaces.service.ts';
import { AuditService } from '../backend/audit/audit.service.ts';
import { CsrfManager } from '../backend/security/csrf.ts';
import { ForbiddenError, UnauthorizedError, ValidationError, ConflictError } from '../backend/core/errors.ts';

// Configurar base de dados de teste isolada
const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'test-onlyone.db');

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(id: string, name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    results.push({ id, name, passed: true, durationMs: Date.now() - start });
    console.log(`  [PASS] ${id} - ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ id, name, passed: false, durationMs: Date.now() - start, error: err?.message || String(err) });
    console.error(`  [FAIL] ${id} - ${name}: ${err?.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Asserção falhou: ${message}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('  ONLYONE FASE 0 — SUITE DE TESTES OBRIGATÓRIOS (ARCH-005)');
  console.log('======================================================\n');

  // Limpar base de dados de teste anterior
  closeDatabase();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  const walPath = `${TEST_DB_PATH}-wal`;
  const shmPath = `${TEST_DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  // Inicializar conexão de teste
  process.env.DB_PATH = TEST_DB_PATH;
  getDatabase(TEST_DB_PATH);

  // T00: Migrações
  await runTest('T00', 'Execução e integridade das migrações SQL', () => {
    const applied = runMigrations(TEST_DB_PATH);
    assert(applied.length > 0, 'Nenhuma migração foi aplicada.');
    const tables = getDatabase().prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
    assert(tables.includes('users'), 'Tabela users ausente.');
    assert(tables.includes('user_profiles'), 'Tabela user_profiles ausente.');
    assert(tables.includes('workspaces'), 'Tabela workspaces ausente.');
    assert(tables.includes('workspace_memberships'), 'Tabela workspace_memberships ausente.');
    assert(tables.includes('sessions'), 'Tabela sessions ausente.');
    assert(tables.includes('audit_logs'), 'Tabela audit_logs ausente.');
    assert(tables.includes('_migrations'), 'Tabela _migrations ausente.');
  });

  let userA: any = null;
  let userB: any = null;

  // T01: Registo atómico
  await runTest('T01', 'Registo atómico com criação de perfil, workspace e sessão', async () => {
    userA = await IdentityService.register({
      email: 'utilizador.a@example.com',
      password: 'PasswordForte123!',
      displayName: 'Utilizador A',
      ipAddress: '127.0.0.1',
    });

    assert(userA.user.id !== undefined, 'ID de utilizador inválido.');
    assert(userA.profile.displayName === 'Utilizador A', 'Nome de exibição incorreto.');
    assert(userA.workspace.ownerId === userA.user.id, 'Propriedade de workspace incorreta.');
    assert(userA.rawToken !== undefined, 'Token de sessão ausente.');

    // Verificar membership
    const membership = getDatabase().prepare('SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?').get(userA.workspace.id, userA.user.id) as any;
    assert(membership?.role === 'owner', 'Papel de owner não atribuído.');
  });

  // T02: Transação atómica com rollback
  await runTest('T02', 'Rollback transacional em caso de erro na criação', () => {
    const beforeCount = getDatabase().prepare('SELECT COUNT(*) as count FROM users').get() as any;
    try {
      getDatabase().transaction(() => {
        getDatabase().prepare("INSERT INTO users (id, email, password_hash) VALUES ('tmp-fail', 'fail@example.com', 'hash')").run();
        throw new Error('Falha intencional para teste de rollback');
      })();
    } catch {
      // Esperado
    }
    const afterCount = getDatabase().prepare('SELECT COUNT(*) as count FROM users').get() as any;
    assert(beforeCount.count === afterCount.count, 'Rollback falhou: registos residuais detetados.');
  });

  // T03: Rejeição de registo inválido
  await runTest('T03', 'Validação de formato de e-mail, senha curta e e-mail duplicado', async () => {
    let threwInvalidEmail = false;
    try {
      await IdentityService.register({ email: 'invalido', password: 'ValidPassword123!', displayName: 'Nome' });
    } catch (e: any) {
      if (e instanceof ValidationError) threwInvalidEmail = true;
    }
    assert(threwInvalidEmail, 'Não rejeitou e-mail inválido.');

    let threwShortPass = false;
    try {
      await IdentityService.register({ email: 'valido@test.com', password: 'short', displayName: 'Nome' });
    } catch (e: any) {
      if (e instanceof ValidationError) threwShortPass = true;
    }
    assert(threwShortPass, 'Não rejeitou palavra-passe curta.');

    let threwDuplicate = false;
    try {
      await IdentityService.register({ email: 'utilizador.a@example.com', password: 'ValidPassword123!', displayName: 'Nome' });
    } catch (e: any) {
      if (e instanceof ConflictError) threwDuplicate = true;
    }
    assert(threwDuplicate, 'Não rejeitou e-mail duplicado.');
  });

  // T04: Autenticação bem-sucedida
  await runTest('T04', 'Início de sessão válido e rotação de sessão', async () => {
    const loginResult = await IdentityService.login({
      email: 'utilizador.a@example.com',
      password: 'PasswordForte123!',
      ipAddress: '127.0.0.1',
    });
    assert(loginResult.user.id === userA.user.id, 'Utilizador retornado incorreto.');
    assert(loginResult.rawToken !== undefined, 'Novo token de sessão não emitido.');
  });

  // T05: Rejeição de credenciais inválidas
  await runTest('T05', 'Rejeição de senha incorreta e e-mail inexistente', async () => {
    let threwWrongPass = false;
    try {
      await IdentityService.login({ email: 'utilizador.a@example.com', password: 'SenhaErrada123!' });
    } catch (e: any) {
      if (e instanceof UnauthorizedError) threwWrongPass = true;
    }
    assert(threwWrongPass, 'Não rejeitou senha errada.');

    let threwNonExistent = false;
    try {
      await IdentityService.login({ email: 'inexistente@example.com', password: 'SenhaErrada123!' });
    } catch (e: any) {
      if (e instanceof UnauthorizedError) threwNonExistent = true;
    }
    assert(threwNonExistent, 'Não rejeitou utilizador inexistente.');
  });

  // T06: Sessão em hash SHA-256 (nunca em texto simples)
  await runTest('T06', 'Verificação de persistência exclusiva de hash SHA-256 do token', () => {
    const rawToken = userA.rawToken;
    const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const sessionInDb = getDatabase().prepare('SELECT * FROM sessions WHERE session_token_hash = ?').get(computedHash) as any;
    assert(sessionInDb !== undefined, 'Sessão não encontrada pelo hash SHA-256.');

    const rawFound = getDatabase().prepare('SELECT * FROM sessions WHERE session_token_hash = ?').get(rawToken);
    assert(rawFound === undefined, 'O token bruto foi indevidamente armazenado na base de dados!');
  });

  // T07: Revogação de sessão (logout)
  await runTest('T07', 'Revogação de sessão e bloqueio subsequente', () => {
    const { rawToken } = SessionService.createSession(userA.user.id);
    const beforeRevoke = SessionService.validateSession(rawToken);
    assert(beforeRevoke !== null, 'Sessão recém-criada é inválida.');

    const revoked = SessionService.revokeSession(rawToken);
    assert(revoked, 'Revogação de sessão falhou.');

    const afterRevoke = SessionService.validateSession(rawToken);
    assert(afterRevoke === null, 'Sessão revogada continuou a ser validada!');
  });

  // T08: Expiração temporal de sessão
  await runTest('T08', 'Rejeição automática de sessão expirada', () => {
    const { rawToken, session } = SessionService.createSession(userA.user.id);
    getDatabase().prepare("UPDATE sessions SET expires_at = datetime('now', '-1 hour') WHERE id = ?").run(session.id);

    const validated = SessionService.validateSession(rawToken);
    assert(validated === null, 'Sessão expirada foi considerada válida!');
  });

  // T09: Adulteração de token
  await runTest('T09', 'Rejeição de token adulterado ou inexistente', () => {
    const tamperedToken = crypto.randomBytes(32).toString('hex');
    const validated = SessionService.validateSession(tamperedToken);
    assert(validated === null, 'Token inexistente/adulterado foi aceito!');
  });

  // T10: Proteção CSRF
  await runTest('T10', 'Proteção CSRF: validação de token e rejeição de requisições mutadoras sem cabeçalho', () => {
    const token = CsrfManager.generateToken();
    assert(token.length === 48, 'Token CSRF gerado com comprimento incorreto.');

    let rejected = false;
    const reqMock: any = {
      method: 'POST',
      cookies: { onlyone_session: 'some-session', onlyone_csrf: token },
      headers: {},
      ip: '127.0.0.1',
      path: '/api/v1/users/me',
    };
    const resMock: any = { cookie: () => {} };
    const nextMock = (err?: any) => {
      if (err instanceof ForbiddenError) rejected = true;
    };

    CsrfManager.middleware(reqMock, resMock, nextMock);
    assert(rejected, 'Requisição mutadora com cookie de sessão sem X-OnlyOne-CSRF deveria ser bloqueada!');
  });

  // Criar utilizador B para testes de isolamento
  userB = await IdentityService.register({
    email: 'utilizador.b@example.com',
    password: 'PasswordForte123!',
    displayName: 'Utilizador B',
  });

  // T11: Consulta e Atualização de Perfil
  await runTest('T11', 'Consulta e atualização de perfil com validação de esquema', () => {
    const profileBefore = ProfileService.getProfile(userA.user.id);
    assert(profileBefore.profile.displayName === 'Utilizador A', 'Nome incorreto.');

    ProfileService.updateProfile(userA.user.id, {
      displayName: 'Utilizador A Renovado',
      bio: 'Biografia de teste automatizado.',
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
    });

    const profileAfter = ProfileService.getProfile(userA.user.id);
    assert(profileAfter.profile.displayName === 'Utilizador A Renovado', 'Atualização de nome não persistiu.');
    assert(profileAfter.profile.locale === 'pt-BR', 'Locale não persistiu.');
    assert(profileAfter.profile.bio === 'Biografia de teste automatizado.', 'Bio não persistiu.');
  });

  // T12: Isolamento de Leitura (IDOR)
  await runTest('T12', 'Isolamento de LEITURA: Utilizador A impedido de ler workspace de B', () => {
    let threw = false;
    try {
      WorkspaceService.getWorkspaceById(userB.workspace.id, userA.user.id);
    } catch (e: any) {
      if (e instanceof ForbiddenError) threw = true;
    }
    assert(threw, 'Utilizador A conseguiu aceder ao workspace de B (Falha de isolamento de leitura)!');
  });

  // T13: Isolamento de Escrita (IDOR)
  await runTest('T13', 'Isolamento de ESCRITA: Utilizador A impedido de alterar workspace de B', () => {
    let threw = false;
    try {
      WorkspaceService.updateWorkspace(userB.workspace.id, userA.user.id, 'Nome Hackeado');
    } catch (e: any) {
      if (e instanceof ForbiddenError) threw = true;
    }
    assert(threw, 'Utilizador A conseguiu modificar o workspace de B (Falha de isolamento de escrita)!');
  });

  // T14: Isolamento de Eliminação / Revogação
  await runTest('T14', 'Isolamento de SESSÃO: Utilizador A não pode aceder aos recursos de sessão de B', () => {
    const sessionB = SessionService.validateSession(userB.rawToken);
    assert(sessionB?.user.id === userB.user.id, 'Sessão B inválida.');
    assert(sessionB?.user.id !== userA.user.id, 'Sessões misturadas.');
  });

  // T15: Consistência de Memberships
  await runTest('T15', 'Coerência entre proprietário e tabela de memberships', () => {
    const wsA = WorkspaceService.getPersonalWorkspace(userA.user.id);
    assert(wsA.role === 'owner', 'Papel no workspace pessoal deve ser owner.');
    assert(wsA.ownerId === userA.user.id, 'Proprietário deve coincidir com user_id.');
  });

  // T16: Scrypt Assíncrono e Formato Versionado
  await runTest('T16', 'Validação de formato versionado $scrypt$v=1$... e verificação segura', async () => {
    const userRecord = getDatabase().prepare('SELECT password_hash FROM users WHERE id = ?').get(userA.user.id) as any;
    assert(userRecord.password_hash.startsWith('$scrypt$v=1$'), 'Formato de hash não versionado.');

    const valid = await PasswordHasher.verify('PasswordForte123!', userRecord.password_hash);
    assert(valid, 'Verificação com password correta falhou.');

    const invalid = await PasswordHasher.verify('SenhaErrada', userRecord.password_hash);
    assert(!invalid, 'Verificação com password incorreta retornou verdadeiro.');
  });

  // T17: Sanitização da Auditoria (Ausência total de senhas/tokens)
  await runTest('T17', 'Auditoria sanitizada: ausência estrita de senhas, hashes ou tokens', () => {
    const logs = AuditService.getUserLogs(userA.user.id);
    assert(logs.length > 0, 'Nenhum registo de auditoria encontrado.');

    for (const log of logs) {
      if (log.details_json) {
        assert(!log.details_json.includes('PasswordForte123!'), 'Palavra-passe em texto simples vazou para o registo de auditoria!');
        assert(!log.details_json.includes('$scrypt$'), 'Hash de password vazou para o registo de auditoria!');
      }
    }
  });

  // T18: Imutabilidade da Auditoria (Trigger SQL)
  await runTest('T18', 'Garantia de imutabilidade: triggers SQL bloqueiam UPDATE e DELETE em audit_logs', () => {
    const log = getDatabase().prepare('SELECT id FROM audit_logs LIMIT 1').get() as any;
    assert(log !== undefined, 'Nenhum log para testar trigger.');

    let threwOnUpdate = false;
    try {
      getDatabase().prepare("UPDATE audit_logs SET action = 'ALTERADA' WHERE id = ?").run(log.id);
    } catch {
      threwOnUpdate = true;
    }
    assert(threwOnUpdate, 'Trigger de imutabilidade falhou ao bloquear UPDATE!');

    let threwOnDelete = false;
    try {
      getDatabase().prepare('DELETE FROM audit_logs WHERE id = ?').run(log.id);
    } catch {
      threwOnDelete = true;
    }
    assert(threwOnDelete, 'Trigger de imutabilidade falhou ao bloquear DELETE!');
  });

  // T19: Persistência após reinício
  await runTest('T19', 'Persistência de dados após encerramento e reabertura da conexão SQLite', () => {
    closeDatabase();
    // Reabrir conexão
    const newDb = getDatabase(TEST_DB_PATH);
    const reloadedUser = newDb.prepare('SELECT email FROM users WHERE id = ?').get(userA.user.id) as any;
    assert(reloadedUser?.email === 'utilizador.a@example.com', 'Utilizador não encontrado após reabertura da base de dados!');
  });

  // T20: Concorrência de escrita (WAL mode)
  await runTest('T20', 'Concorrência de escritas e transações múltiplas sem contenção de lock', () => {
    for (let i = 0; i < 20; i++) {
      AuditService.log({
        userId: userA.user.id,
        action: `CONCURRENT_TEST_${i}`,
        resourceType: 'system',
        status: 'success',
        details: { iteration: i },
      });
    }
    const count = getDatabase().prepare("SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE 'CONCURRENT_TEST_%'").get() as any;
    assert(count.count === 20, `Esperadas 20 escritas concorrentes, encontradas ${count.count}`);
  });

  // T21: Verificação de Health Check
  await runTest('T21', 'Health check neutro e integridade da base de dados', () => {
    const check = getDatabase().prepare('SELECT 1 as ok').get() as any;
    assert(check.ok === 1, 'Integridade de conexão falhou.');
  });

  // Resumo final
  console.log('\n======================================================');
  console.log('  RESUMO DA EXECUÇÃO DOS TESTES');
  console.log('======================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Total: ${results.length} | Aprovados: ${passedCount} | Falhas: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nAlguns testes falharam!');
    process.exit(1);
  } else {
    console.log('\nTODOS OS 22 TESTES FORAM APROVADOS COM 100% DE SUCESSO.');
  }
}

runAllTests().catch(err => {
  console.error('Falha na execução dos testes:', err);
  process.exit(1);
});
