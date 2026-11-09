import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../core/config.ts';

let dbInstance: Database.Database | null = null;
let currentDbPath: string | null = null;

export function getDatabase(customPath?: string): Database.Database {
  const targetPath = customPath || process.env.DB_PATH || config.dbPath;

  if (dbInstance) {
    if (!customPath || currentDbPath === targetPath) {
      return dbInstance;
    }
    // Se o caminho mudou (ex: início de suite de testes), fecha a instância anterior
    dbInstance.close();
    dbInstance = null;
  }

  const dbDir = path.dirname(targetPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(targetPath);

  // Configurações de alta fiabilidade e concorrência (WAL mode, timeouts e integridade referencial)
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');

  dbInstance = db;
  currentDbPath = targetPath;

  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignora erro se já estiver fechada
    }
    dbInstance = null;
    currentDbPath = null;
  }
}

export async function backupDatabase(targetBackupPath?: string): Promise<string> {
  const db = getDatabase();
  const backupDir = config.backupsDir;
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = targetBackupPath || path.join(backupDir, `onlyone-backup-${timestamp}.db`);

  await db.backup(destination);
  return destination;
}
