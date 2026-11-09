import crypto from 'crypto';
import { getDatabase } from '../database/connection.ts';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  status: 'success' | 'failure';
  details_json: string | null;
  ip_address: string | null;
  created_at: string;
}

const BANNED_KEYS_REGEX = /pass(word)?|token|secret|hash|cookie|credential|key|auth/i;

export class AuditService {
  /**
   * Sanitiza recursivamente objetos e valores para garantir que nenhuma credencial ou segredo seja persistido.
   */
  public static sanitizeDetails(details: unknown): unknown {
    if (!details || typeof details !== 'object') {
      return details;
    }

    if (Array.isArray(details)) {
      return details.map(item => this.sanitizeDetails(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
      if (BANNED_KEYS_REGEX.test(key)) {
        sanitized[key] = '[EXPURGADO_POR_SEGURANCA]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Grava um evento de auditoria com garantia de sanitização.
   */
  public static log(params: {
    userId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    status: 'success' | 'failure';
    details?: unknown;
    ipAddress?: string | null;
  }): AuditLogEntry {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const sanitizedDetails = params.details ? JSON.stringify(this.sanitizeDetails(params.details)) : null;

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, status, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.userId || null,
      params.action,
      params.resourceType,
      params.resourceId || null,
      params.status,
      sanitizedDetails,
      params.ipAddress || null
    );

    return {
      id,
      user_id: params.userId || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      status: params.status,
      details_json: sanitizedDetails,
      ip_address: params.ipAddress || null,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Consulta o histórico de auditoria sanitizado do próprio utilizador (máximo 50 registos).
   */
  public static getUserLogs(userId: string, limit: number = 50): AuditLogEntry[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, user_id, action, resource_type, resource_id, status, details_json, ip_address, created_at
      FROM audit_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(userId, limit) as AuditLogEntry[];
  }
}
