import { getDatabase } from '../database/connection.ts';
import { AuditService } from '../audit/audit.service.ts';
import { NotFoundError, ValidationError } from '../core/errors.ts';

export interface UpdateProfileDTO {
  displayName?: string;
  locale?: string;
  timezone?: string;
  bio?: string;
}

export class ProfileService {
  public static getProfile(userId: string) {
    if (!userId) {
      throw new ValidationError('Identificador de utilizador obrigatório.');
    }

    const db = getDatabase();
    const row = db.prepare(`
      SELECT 
        u.id AS user_id,
        u.email,
        u.status,
        u.created_at AS member_since,
        p.id AS profile_id,
        p.display_name,
        p.locale,
        p.timezone,
        p.bio,
        p.avatar_url,
        p.updated_at
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = ? AND u.status = 'active'
    `).get(userId) as any;

    if (!row) {
      throw new NotFoundError('Perfil de utilizador não encontrado.');
    }

    return {
      userId: row.user_id,
      email: row.email,
      status: row.status,
      memberSince: row.member_since,
      profile: {
        id: row.profile_id,
        displayName: row.display_name || row.email,
        locale: row.locale || 'pt-PT',
        timezone: row.timezone || 'UTC',
        bio: row.bio || '',
        avatarUrl: row.avatar_url || null,
        updatedAt: row.updated_at,
      },
    };
  }

  public static updateProfile(userId: string, dto: UpdateProfileDTO, ipAddress?: string | null) {
    if (!userId) {
      throw new ValidationError('Identificador de utilizador obrigatório.');
    }

    const db = getDatabase();
    const existing = db.prepare('SELECT id, display_name, locale, timezone, bio FROM user_profiles WHERE user_id = ?').get(userId) as any;
    if (!existing) {
      throw new NotFoundError('Perfil não encontrado para o utilizador especificado.');
    }

    const newDisplayName = dto.displayName !== undefined ? dto.displayName.trim() : existing.display_name;
    const newLocale = dto.locale !== undefined ? dto.locale.trim() : existing.locale;
    const newTimezone = dto.timezone !== undefined ? dto.timezone.trim() : existing.timezone;
    const newBio = dto.bio !== undefined ? dto.bio.trim() : (existing.bio || '');

    if (newDisplayName.length < 2 || newDisplayName.length > 50) {
      throw new ValidationError('O nome de exibição deve ter entre 2 e 50 caracteres.');
    }

    if (newBio.length > 500) {
      throw new ValidationError('A biografia não pode exceder 500 caracteres.');
    }

    db.prepare(`
      UPDATE user_profiles
      SET display_name = ?, locale = ?, timezone = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(newDisplayName, newLocale, newTimezone, newBio, userId);

    AuditService.log({
      userId,
      action: 'PROFILE_UPDATE',
      resourceType: 'user_profile',
      resourceId: existing.id,
      status: 'success',
      ipAddress,
      details: {
        updatedFields: Object.keys(dto),
      },
    });

    return this.getProfile(userId);
  }
}
