import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  sanitizeVaultData,
  type SyncConfig,
  type VaultData,
} from '../types/vault';

const DB_NAME = 'identideck-vault-db';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

const KEYS = {
  vault: 'identideck_vault_v1',
  syncConfig: 'identideck_sync_config_v1',
  prePullSnapshot: 'identideck_pre_pull_snapshot_v1',
} as const;

interface IdentiDeckDB extends DBSchema {
  kv: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<IdentiDeckDB>> | null = null;

function isIndexedDbSupported(): boolean {
  try {
    return typeof globalThis !== 'undefined' && typeof globalThis.indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

async function getDb(): Promise<IDBPDatabase<IdentiDeckDB> | null> {
  if (!isIndexedDbSupported()) return null;
  try {
    if (!dbPromise) {
      dbPromise = openDB<IdentiDeckDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    }
    return await dbPromise;
  } catch {
    dbPromise = null;
    return null;
  }
}

function readLocalStorage<T>(key: string): T | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    const raw = globalThis.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: unknown): void {
  try {
    if (typeof globalThis.localStorage === 'undefined') return;
    globalThis.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or private mode; ignore gracefully
  }
}

function removeLocalStorage(key: string): void {
  try {
    if (typeof globalThis.localStorage === 'undefined') return;
    globalThis.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

async function kvGet<T>(key: string): Promise<T | null> {
  const db = await getDb();
  if (db) {
    try {
      const value = await db.get(STORE_NAME, key);
      if (value !== undefined && value !== null) {
        return value as T;
      }
    } catch {
      // Fallback to localStorage below
    }
  }
  return readLocalStorage<T>(key);
}

async function kvSet(key: string, value: unknown): Promise<void> {
  // Always mirror to localStorage as synchronous backup & fallback
  writeLocalStorage(key, value);
  const db = await getDb();
  if (db) {
    try {
      await db.put(STORE_NAME, value, key);
    } catch {
      // Already written to localStorage
    }
  }
}

async function kvDelete(key: string): Promise<void> {
  removeLocalStorage(key);
  const db = await getDb();
  if (db) {
    try {
      await db.delete(STORE_NAME, key);
    } catch {
      // Ignore
    }
  }
}

export async function loadVaultFromStorage(): Promise<VaultData | null> {
  const raw = await kvGet<VaultData>(KEYS.vault);
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.identities) || !Array.isArray(raw.bindings)) {
    return null;
  }
  return sanitizeVaultData(raw);
}

export async function saveVaultToStorage(vault: VaultData): Promise<void> {
  const clean = sanitizeVaultData(vault);
  await kvSet(KEYS.vault, clean);
}

export async function loadSyncConfigFromStorage(): Promise<SyncConfig | null> {
  const raw = await kvGet<SyncConfig>(KEYS.syncConfig);
  if (!raw || typeof raw !== 'object') return null;
  return {
    provider: raw.provider === 'gitee' ? 'gitee' : 'github',
    token: typeof raw.token === 'string' ? raw.token : '',
    gistId: typeof raw.gistId === 'string' ? raw.gistId : '',
    ...(typeof raw.lastSyncedAt === 'number' ? { lastSyncedAt: raw.lastSyncedAt } : {}),
    ...(typeof raw.lastRemoteUpdatedAt === 'number'
      ? { lastRemoteUpdatedAt: raw.lastRemoteUpdatedAt }
      : {}),
  };
}

export async function saveSyncConfigToStorage(config: SyncConfig): Promise<void> {
  await kvSet(KEYS.syncConfig, config);
}

export async function savePrePullSnapshot(vault: VaultData): Promise<void> {
  await kvSet(KEYS.prePullSnapshot, sanitizeVaultData(vault));
}

export async function loadPrePullSnapshot(): Promise<VaultData | null> {
  const raw = await kvGet<VaultData>(KEYS.prePullSnapshot);
  if (!raw) return null;
  return sanitizeVaultData(raw);
}

export async function clearAllVaultStorage(): Promise<void> {
  await Promise.all([
    kvDelete(KEYS.vault),
    kvDelete(KEYS.syncConfig),
    kvDelete(KEYS.prePullSnapshot),
  ]);
}
