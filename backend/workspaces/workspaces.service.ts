import { getDatabase } from '../database/connection.ts';
import { AuditService } from '../audit/audit.service.ts';
import { NotFoundError, ForbiddenError, ValidationError } from '../core/errors.ts';

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  type: 'personal' | 'team' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  role?: string;
}

export class WorkspaceService {
  /**
   * Consulta o workspace pessoal do utilizador autenticado garantindo isolamento estrito de domínio.
   */
  public static getPersonalWorkspace(userId: string): WorkspaceRecord {
    if (!userId) {
      throw new ValidationError('Identificador de utilizador obrigatório.');
    }

    const db = getDatabase();

    const row = db.prepare(`
      SELECT 
        w.id,
        w.name,
        w.slug,
        w.owner_id AS ownerId,
        w.type,
        w.created_at AS createdAt,
        w.updated_at AS updatedAt,
        m.role
      FROM workspaces w
      JOIN workspace_memberships m ON m.workspace_id = w.id AND m.user_id = ?
      WHERE w.owner_id = ? AND w.type = 'personal'
    `).get(userId, userId) as any;

    if (!row) {
      throw new NotFoundError('Workspace pessoal não encontrado ou utilizador sem permissão.');
    }

    // Coerência estrita entre owner_id e membership de 'owner'
    if (row.role !== 'owner' || row.ownerId !== userId) {
      throw new ForbiddenError('Inconsistência de propriedade no workspace pessoal.');
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerId: row.ownerId,
      type: row.type,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: row.role,
    };
  }

  /**
   * Consulta um workspace por ID garantindo que o requisitante tem membership ativa (prevenção de IDOR).
   */
  public static getWorkspaceById(workspaceId: string, requestingUserId: string): WorkspaceRecord {
    if (!workspaceId || !requestingUserId) {
      throw new ValidationError('Identificadores obrigatórios.');
    }

    const db = getDatabase();
    const row = db.prepare(`
      SELECT 
        w.id,
        w.name,
        w.slug,
        w.owner_id AS ownerId,
        w.type,
        w.created_at AS createdAt,
        w.updated_at AS updatedAt,
        m.role
      FROM workspaces w
      LEFT JOIN workspace_memberships m ON m.workspace_id = w.id AND m.user_id = ?
      WHERE w.id = ?
    `).get(requestingUserId, workspaceId) as any;

    if (!row) {
      throw new NotFoundError('Workspace não encontrado.');
    }

    if (!row.role) {
      AuditService.log({
        userId: requestingUserId,
        action: 'UNAUTHORIZED_WORKSPACE_ACCESS_ATTEMPT',
        resourceType: 'workspace',
        resourceId: workspaceId,
        status: 'failure',
        details: { reason: 'Tentativa de IDOR bloqueada no domínio' },
      });
      throw new ForbiddenError('Acesso não autorizado: O utilizador não é membro deste workspace.');
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerId: row.ownerId,
      type: row.type,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      role: row.role,
    };
  }

  /**
   * Atualiza dados do workspace exigindo que o requisitante seja o 'owner'.
   */
  public static updateWorkspace(workspaceId: string, requestingUserId: string, name: string) {
    const trimmedName = name?.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
      throw new ValidationError('O nome do workspace deve ter entre 2 e 50 caracteres.');
    }

    const workspace = this.getWorkspaceById(workspaceId, requestingUserId);
    if (workspace.ownerId !== requestingUserId) {
      throw new ForbiddenError('Apenas o proprietário pode alterar o nome do workspace.');
    }

    const db = getDatabase();
    db.prepare('UPDATE workspaces SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(trimmedName, workspaceId);

    AuditService.log({
      userId: requestingUserId,
      action: 'WORKSPACE_UPDATE',
      resourceType: 'workspace',
      resourceId: workspaceId,
      status: 'success',
      details: { newName: trimmedName },
    });

    return this.getWorkspaceById(workspaceId, requestingUserId);
  }
}
