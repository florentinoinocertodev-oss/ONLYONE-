import crypto from 'crypto';
import { getDatabase } from '../database/connection.ts';
import { PasswordHasher } from './hasher.ts';
import { SessionService } from '../security/session.service.ts';
import { AuditService } from '../audit/audit.service.ts';
import { ValidationError, ConflictError, UnauthorizedError } from '../core/errors.ts';

export interface RegisterDTO {
  email: string;
  password: string;
  displayName: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface LoginDTO {
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class IdentityService {
  public static validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && re.test(email.trim().toLowerCase());
  }

  public static async register(dto: RegisterDTO) {
    const email = dto.email?.trim().toLowerCase();
    const displayName = dto.displayName?.trim();
    const password = dto.password;

    if (!email || !this.validateEmail(email)) {
      throw new ValidationError('Endereço de e-mail inválido.');
    }

    if (!displayName || displayName.length < 2 || displayName.length > 50) {
      throw new ValidationError('O nome de exibição deve ter entre 2 e 50 caracteres.');
    }

    if (!password || password.length < 8) {
      throw new ValidationError('A palavra-passe deve possuir no mínimo 8 caracteres.');
    }

    const db = getDatabase();

    // Verificar unicidade do e-mail
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new ConflictError('Já existe uma conta associada a este endereço de e-mail.');
    }

    const passwordHash = await PasswordHasher.hash(password);
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    const baseSlug = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 20);
    const slug = `${baseSlug || 'workspace'}-${crypto.randomBytes(3).toString('hex')}`;

    // TRANSAÇÃO ATÓMICA DE CRIAÇÃO
    const transaction = db.transaction(() => {
      // 1. Inserir Utilizador
      db.prepare(`
        INSERT INTO users (id, email, password_hash, status, created_at, updated_at)
        VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(userId, email, passwordHash);

      // 2. Inserir Perfil
      db.prepare(`
        INSERT INTO user_profiles (id, user_id, display_name, locale, timezone, bio, avatar_url, updated_at)
        VALUES (?, ?, ?, 'pt-PT', 'UTC', NULL, NULL, CURRENT_TIMESTAMP)
      `).run(profileId, userId, displayName);

      // 3. Inserir Workspace Pessoal
      db.prepare(`
        INSERT INTO workspaces (id, name, slug, owner_id, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'personal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(workspaceId, `Workspace de ${displayName}`, slug, userId);

      // 4. Inserir Membership como 'owner'
      db.prepare(`
        INSERT INTO workspace_memberships (id, workspace_id, user_id, role, joined_at)
        VALUES (?, ?, ?, 'owner', CURRENT_TIMESTAMP)
      `).run(membershipId, workspaceId, userId);
    });

    try {
      transaction();
    } catch (err) {
      AuditService.log({
        action: 'AUTH_REGISTER_FAILED',
        resourceType: 'user',
        status: 'failure',
        ipAddress: dto.ipAddress,
        details: { email, reason: (err as Error).message },
      });
      throw err;
    }

    // Criar sessão de autenticação após transação confirmada
    const { rawToken, session } = SessionService.createSession(userId, dto.ipAddress, dto.userAgent);

    AuditService.log({
      userId,
      action: 'AUTH_REGISTER',
      resourceType: 'user',
      resourceId: userId,
      status: 'success',
      ipAddress: dto.ipAddress,
      details: { email, workspaceId },
    });

    return {
      user: { id: userId, email, status: 'active' },
      profile: { id: profileId, userId, displayName, locale: 'pt-PT', timezone: 'UTC', bio: null, avatarUrl: null },
      workspace: { id: workspaceId, name: `Workspace de ${displayName}`, slug, ownerId: userId, type: 'personal' },
      session,
      rawToken,
    };
  }

  public static async login(dto: LoginDTO) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) {
      throw new ValidationError('E-mail e palavra-passe são obrigatórios.');
    }

    const db = getDatabase();
    const user = db.prepare('SELECT id, email, password_hash, status FROM users WHERE email = ?').get(email) as any;

    if (!user || user.status !== 'active') {
      AuditService.log({
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'user',
        status: 'failure',
        ipAddress: dto.ipAddress,
        details: { reason: 'Credenciais inválidas' },
      });
      throw new UnauthorizedError('Credenciais inválidas. Verifique o seu e-mail e palavra-passe.');
    }

    const isValid = await PasswordHasher.verify(password, user.password_hash);
    if (!isValid) {
      AuditService.log({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'user',
        resourceId: user.id,
        status: 'failure',
        ipAddress: dto.ipAddress,
        details: { reason: 'Credenciais incorretas' },
      });
      throw new UnauthorizedError('Credenciais inválidas. Verifique o seu e-mail e palavra-passe.');
    }

    // Verificar necessidade de rehash assíncrono para evolução contínua de parâmetros
    if (PasswordHasher.needsRehash(user.password_hash)) {
      PasswordHasher.hash(password).then(newHash => {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
      }).catch(() => {});
    }

    const profile = db.prepare('SELECT id, user_id, display_name, locale, timezone, bio, avatar_url FROM user_profiles WHERE user_id = ?').get(user.id) as any;
    const workspace = db.prepare("SELECT id, name, slug, owner_id, type FROM workspaces WHERE owner_id = ? AND type = 'personal'").get(user.id) as any;

    const { rawToken, session } = SessionService.createSession(user.id, dto.ipAddress, dto.userAgent);

    AuditService.log({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'user',
      resourceId: user.id,
      status: 'success',
      ipAddress: dto.ipAddress,
    });

    return {
      user: { id: user.id, email: user.email, status: user.status },
      profile: {
        id: profile?.id,
        userId: user.id,
        displayName: profile?.display_name || user.email,
        locale: profile?.locale || 'pt-PT',
        timezone: profile?.timezone || 'UTC',
        bio: profile?.bio || null,
        avatarUrl: profile?.avatar_url || null,
      },
      workspace: workspace ? {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        ownerId: workspace.owner_id,
        type: workspace.type,
      } : null,
      session,
      rawToken,
    };
  }

  public static logout(rawToken: string, userId?: string, ipAddress?: string | null) {
    if (rawToken) {
      SessionService.revokeSession(rawToken);
    }
    AuditService.log({
      userId: userId || null,
      action: 'AUTH_LOGOUT',
      resourceType: 'session',
      status: 'success',
      ipAddress,
    });
    return true;
  }
}
