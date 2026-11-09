import crypto from 'crypto';
import { getDatabase } from '../database/connection.ts';
import { config } from '../core/config.ts';

export interface SessionRecord {
  id: string;
  session_token_hash: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface UserSessionPayload {
  session: SessionRecord;
  user: {
    id: string;
    email: string;
    status: string;
  };
}

export class SessionService {
  /**
   * Calcula o hash SHA-256 do token em memória para persistência segura.
   */
  public static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Cria uma nova sessão, persistindo apenas o hash criptográfico.
   * Retorna o token bruto (rawToken) para envio via cookie HttpOnly.
   */
  public static createSession(userId: string, ipAddress?: string | null, userAgent?: string | null): { rawToken: string; session: SessionRecord } {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(Date.now() + config.session.ttlSeconds * 1000).toISOString();
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO sessions (id, session_token_hash, user_id, ip_address, user_agent, created_at, expires_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
    `);

    stmt.run(id, tokenHash, userId, ipAddress || null, userAgent || null, createdAt, expiresAt);

    const session: SessionRecord = {
      id,
      session_token_hash: tokenHash,
      user_id: userId,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      created_at: createdAt,
      expires_at: expiresAt,
      revoked_at: null,
    };

    return { rawToken, session };
  }

  /**
   * Valida um token bruto contra a base de dados (procura pelo hash SHA-256, não expirado e não revogado).
   */
  public static validateSession(rawToken: string): UserSessionPayload | null {
    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    const tokenHash = this.hashToken(rawToken);
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT 
        s.id AS session_id,
        s.session_token_hash,
        s.user_id,
        s.ip_address,
        s.user_agent,
        s.created_at AS session_created_at,
        s.expires_at,
        s.revoked_at,
        u.id AS user_id,
        u.email,
        u.status
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.session_token_hash = ?
        AND s.revoked_at IS NULL
        AND s.expires_at > CURRENT_TIMESTAMP
        AND u.status = 'active'
    `);

    const row = stmt.get(tokenHash) as any;
    if (!row) {
      return null;
    }

    return {
      session: {
        id: row.session_id,
        session_token_hash: row.session_token_hash,
        user_id: row.user_id,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        created_at: row.session_created_at,
        expires_at: row.expires_at,
        revoked_at: row.revoked_at,
      },
      user: {
        id: row.user_id,
        email: row.email,
        status: row.status,
      },
    };
  }

  /**
   * Revoga uma sessão ativa pelo seu token bruto.
   */
  public static revokeSession(rawToken: string): boolean {
    if (!rawToken) return false;
    const tokenHash = this.hashToken(rawToken);
    const db = getDatabase();

    const stmt = db.prepare(`
      UPDATE sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE session_token_hash = ? AND revoked_at IS NULL
    `);

    const result = stmt.run(tokenHash);
    return result.changes > 0;
  }

  /**
   * Revoga todas as sessões de um determinado utilizador.
   */
  public static revokeAllUserSessions(userId: string): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked_at IS NULL
    `);
    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Efetua rotação de sessão para impedir Session Fixation.
   */
  public static rotateSession(oldRawToken: string, userId: string, ipAddress?: string | null, userAgent?: string | null): { rawToken: string; session: SessionRecord } {
    if (oldRawToken) {
      this.revokeSession(oldRawToken);
    }
    return this.createSession(userId, ipAddress, userAgent);
  }
}
