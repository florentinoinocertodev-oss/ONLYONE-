import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase } from './connection.ts';
import { config } from '../core/config.ts';

export interface MigrationRecord {
  id: number;
  name: string;
  checksum: string;
  applied_at: string;
}

export function runMigrations(customDbPath?: string): string[] {
  const db = getDatabase(customDbPath);

  // Garantir a tabela de registo de migrações
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = config.migrationsDir;
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const appliedMigrations: string[] = [];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex');

    const existing = db.prepare('SELECT * FROM _migrations WHERE name = ?').get(file) as MigrationRecord | undefined;

    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(`Conflito de integridade na migração ${file}: checksum persistido (${existing.checksum}) difere do ficheiro actual (${checksum})`);
      }
      continue;
    }

    // Executar migração de forma transacional e atómica
    const executeMigration = db.transaction(() => {
      db.exec(sqlContent);
      db.prepare('INSERT INTO _migrations (name, checksum) VALUES (?, ?)').run(file, checksum);
    });

    executeMigration();
    appliedMigrations.push(file);
  }

  return appliedMigrations;
}
