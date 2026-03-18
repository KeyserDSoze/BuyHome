/**
 * projectsStore.ts
 * Manages multiple projects in localStorage.
 * Each project is stored under its own key to avoid hitting size limits.
 *
 * Keys:
 *   rcc_project_ids_v1  – JSON array of project IDs (ordered, most recent first)
 *   rcc_proj_{id}       – full Project JSON for each ID
 *   rendita_catastale_v1 – legacy single-project key (migrated on first load)
 */

import { Project } from '../models/types';

const IDS_KEY = 'rcc_project_ids_v1';
const PREFIX = 'rcc_proj_';
const LEGACY_KEY = 'rendita_catastale_v1';

// ── Internal helpers ──────────────────────────────────────────────────────────

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  localStorage.setItem(IDS_KEY, JSON.stringify(ids));
}

// ── Public API ────────────────────────────────────────────────────────────────

/** One-time migration from the old single-project storage key. */
export function migrateLegacy(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const project = JSON.parse(raw) as Project;
    const ids = readIds();
    if (!ids.includes(project.id)) {
      saveProject(project);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore malformed data
  }
}

export function loadProject(id: string): Project | null {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? (JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}

export function saveProject(project: Project): void {
  localStorage.setItem(PREFIX + project.id, JSON.stringify(project));
  const ids = readIds();
  if (!ids.includes(project.id)) {
    // Prepend: most recent first
    writeIds([project.id, ...ids]);
  }
}

export function deleteProject(id: string): void {
  localStorage.removeItem(PREFIX + id);
  writeIds(readIds().filter(i => i !== id));
}

export function getAllProjects(): Project[] {
  return readIds()
    .map(id => loadProject(id))
    .filter((p): p is Project => p !== null);
}

/**
 * Merge remote projects into local storage.
 * Remote wins if its `updatedAt` is newer than the local copy.
 */
export function mergeProjects(remote: Project[]): void {
  for (const rp of remote) {
    const local = loadProject(rp.id);
    if (!local || new Date(rp.updatedAt) > new Date(local.updatedAt)) {
      saveProject(rp);
    }
  }
}
