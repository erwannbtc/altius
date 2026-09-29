import { db, TABLES, type TableName } from './db';
import { todayKey } from './format';

// Sauvegarde / restauration de toutes les données au format JSON.

export const BACKUP_FORMAT = 'altius-backup';
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  tables: Partial<Record<TableName, unknown[]>>;
}

export async function exportData(includeApiKey: boolean): Promise<Backup> {
  const tables: Backup['tables'] = {};
  for (const name of TABLES) {
    let rows = (await db.table(name).toArray()) as unknown[];
    if (name === 'settings' && !includeApiKey) {
      rows = rows.map((r) => {
        const row = r as { key: string; value: Record<string, unknown> };
        return row.key === 'coach' ? { ...row, value: { ...row.value, apiKey: '' } } : row;
      });
    }
    tables[name] = rows;
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

export async function downloadBackup(includeApiKey: boolean): Promise<void> {
  const data = await exportData(includeApiKey);
  const json = JSON.stringify(data);
  const filename = `altius-sauvegarde-${todayKey()}.json`;
  const file = new File([json], filename, { type: 'application/json' });
  // Sur iPhone, la feuille de partage permet d'enregistrer dans « Fichiers ».
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sauvegarde Altius' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function importData(text: string): Promise<{ counts: Record<string, number> }> {
  let data: Backup;
  try {
    data = JSON.parse(text) as Backup;
  } catch {
    throw new Error('Fichier illisible : ce n’est pas un JSON valide.');
  }
  if (data.format !== BACKUP_FORMAT || typeof data.tables !== 'object') {
    throw new Error('Ce fichier n’est pas une sauvegarde Altius.');
  }
  if (data.version > BACKUP_VERSION) {
    throw new Error('Sauvegarde créée par une version plus récente d’Altius. Mets l’app à jour.');
  }
  const counts: Record<string, number> = {};
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) {
      const rows = data.tables[name];
      if (!Array.isArray(rows)) continue;
      await db.table(name).clear();
      await db.table(name).bulkPut(rows);
      counts[name] = rows.length;
    }
  });
  return { counts };
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) await db.table(name).clear();
  });
}
