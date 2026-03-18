/**
 * driveSync.ts
 * Google Drive REST API v3 helpers.
 * Uses the `drive.file` scope — the app can only access files it creates.
 *
 * Storage layout in Drive:
 *   Folder: "Rendita Catastale"
 *   File:   "rcc_backup.json"  (single file with all projects)
 */

import { Project } from '../models/types';

const FOLDER_NAME = 'BuyHome';
const FILE_NAME = 'rcc_backup.json';

export interface DriveBackup {
  version: number;
  projects: Project[];
  savedAt: string;
}

// ── Folder ────────────────────────────────────────────────────────────────────

export async function findOrCreateFolder(token: string): Promise<string> {
  const q = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!search.ok) throw new Error(`Drive search failed: ${search.status}`);
  const data = await search.json();

  if (data.files?.length > 0) return data.files[0].id as string;

  // Create folder
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!create.ok) throw new Error(`Drive folder create failed: ${create.status}`);
  const folder = await create.json();
  return folder.id as string;
}

// ── Backup file ───────────────────────────────────────────────────────────────

export async function findBackupFile(token: string, folderId: string): Promise<string | null> {
  const q = `name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`;
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!search.ok) return null;
  const data = await search.json();
  return data.files?.length > 0 ? (data.files[0].id as string) : null;
}

export async function uploadBackup(
  token: string,
  folderId: string,
  existingFileId: string | null,
  backup: DriveBackup,
): Promise<string> {
  const content = JSON.stringify(backup);

  if (existingFileId) {
    // Update content only (no metadata change needed)
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: content,
      },
    );
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`);
    return existingFileId;
  }

  // Create new file using multipart upload
  const boundary = 'rcc_mp_boundary';
  const metadata = JSON.stringify({
    name: FILE_NAME,
    parents: [folderId],
    mimeType: 'application/json',
  });
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
  const data = await res.json();
  return data.id as string;
}

export async function downloadBackup(token: string, fileId: string): Promise<DriveBackup | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  return res.json() as Promise<DriveBackup>;
}
