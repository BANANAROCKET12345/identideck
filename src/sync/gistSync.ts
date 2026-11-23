import {
  decryptVault,
  encryptVault,
  isEncryptedVaultEnvelope,
  VaultCryptoError,
} from '../crypto/vaultCrypto';
import type {
  EncryptedVaultEnvelope,
  SyncConfig,
  SyncProvider,
  VaultData,
} from '../types/vault';

export const GIST_FILENAME = 'identideck-vault.enc.json';
export const GIST_DESCRIPTION =
  'IdentiDeck (身份卡包) · AES-256-GCM End-to-End Encrypted Vault (Zero Passwords)';

export const SYNC_TOKEN_HELP_URLS: Record<SyncProvider, string> = {
  github:
    'https://github.com/settings/tokens/new?scopes=gist&description=IdentiDeck%20Encrypted%20Sync',
  gitee: 'https://gitee.com/profile/personal_access_tokens/new',
};

export type GistSyncErrorCode =
  | 'MISSING_TOKEN'
  | 'AUTH_FAILED'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'CONFLICT'
  | 'INVALID_REMOTE_DATA'
  | 'DECRYPTION_FAILED';

export class GistSyncError extends Error {
  public readonly code: GistSyncErrorCode;
  public readonly remoteUpdatedAt?: number;

  constructor(
    code: GistSyncErrorCode,
    message: string,
    remoteUpdatedAt?: number,
  ) {
    super(message);
    this.name = 'GistSyncError';
    this.code = code;
    this.remoteUpdatedAt = remoteUpdatedAt;
  }
}

export interface RemoteGistRecord {
  id: string;
  updatedAtMs: number;
  envelope: EncryptedVaultEnvelope;
}

export interface PushSyncResult {
  gistId: string;
  created: boolean;
  updatedAt: number;
  syncedAt: number;
}

export interface PullSyncResult {
  gistId: string;
  vault: VaultData;
  remoteUpdatedAt: number;
  syncedAt: number;
}

export interface TwoWaySyncResult {
  action: 'pushed' | 'pulled' | 'up_to_date' | 'conflict';
  gistId: string;
  vault?: VaultData;
  remoteUpdatedAt: number;
  syncedAt: number;
}

type FetchFn = typeof fetch;

interface ProviderAdapter {
  listUrl: (token: string) => string;
  getUrl: (gistId: string, token: string) => string;
  createUrl: (token: string) => string;
  updateUrl: (gistId: string, token: string) => string;
  headers: (token: string) => Record<string, string>;
}

const ADAPTERS: Record<SyncProvider, ProviderAdapter> = {
  github: {
    listUrl: () => 'https://api.github.com/gists?per_page=50',
    getUrl: (id) => `https://api.github.com/gists/${encodeURIComponent(id)}`,
    createUrl: () => 'https://api.github.com/gists',
    updateUrl: (id) => `https://api.github.com/gists/${encodeURIComponent(id)}`,
    headers: (token) => ({
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    }),
  },
  gitee: {
    listUrl: (token) =>
      `https://gitee.com/api/v5/gists?access_token=${encodeURIComponent(token)}&per_page=50`,
    getUrl: (id, token) =>
      `https://gitee.com/api/v5/gists/${encodeURIComponent(id)}?access_token=${encodeURIComponent(token)}`,
    createUrl: (token) =>
      `https://gitee.com/api/v5/gists?access_token=${encodeURIComponent(token)}`,
    updateUrl: (id, token) =>
      `https://gitee.com/api/v5/gists/${encodeURIComponent(id)}?access_token=${encodeURIComponent(token)}`,
    headers: () => ({
      'Content-Type': 'application/json',
    }),
  },
};

function assertToken(token: string): string {
  const clean = token.trim();
  if (!clean) {
    throw new GistSyncError(
      'MISSING_TOKEN',
      'Please enter your Personal Access Token (gist scope).',
    );
  }
  return clean;
}

async function safeFetch(
  url: string,
  init: RequestInit,
  fetcher: FetchFn,
): Promise<Response> {
  try {
    return await fetcher(url, init);
  } catch (err) {
    throw new GistSyncError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Network request failed.',
    );
  }
}

function handleHttpError(status: number, provider: SyncProvider): never {
  if (status === 401 || status === 403) {
    throw new GistSyncError(
      'AUTH_FAILED',
      `${provider === 'github' ? 'GitHub' : 'Gitee'} authentication failed (${status}). Check that your token has the "gist" permission.`,
    );
  }
  if (status === 404) {
    throw new GistSyncError(
      'NOT_FOUND',
      'Target Gist was not found. Clear the Gist ID to auto-locate or create a new private Gist.',
    );
  }
  throw new GistSyncError(
    'NETWORK_ERROR',
    `Remote Gist API returned HTTP ${status}.`,
  );
}

interface RawGistFile {
  content?: string;
  raw_url?: string;
  truncated?: boolean;
}

interface RawGistResponse {
  id: string;
  updated_at?: string;
  files?: Record<string, RawGistFile>;
}

async function extractEnvelopeFromGist(
  raw: RawGistResponse,
  fetcher: FetchFn,
): Promise<RemoteGistRecord> {
  const file = raw.files?.[GIST_FILENAME];
  if (!file) {
    throw new GistSyncError(
      'INVALID_REMOTE_DATA',
      `Gist ${raw.id} does not contain ${GIST_FILENAME}.`,
    );
  }

  let content = file.content ?? '';
  if ((file.truncated || !content) && file.raw_url) {
    const rawResp = await safeFetch(file.raw_url, { method: 'GET' }, fetcher);
    if (rawResp.ok) {
      content = await rawResp.text();
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new GistSyncError(
      'INVALID_REMOTE_DATA',
      `Remote ${GIST_FILENAME} is not valid JSON.`,
    );
  }

  if (!isEncryptedVaultEnvelope(parsed)) {
    throw new GistSyncError(
      'INVALID_REMOTE_DATA',
      `Remote ${GIST_FILENAME} is not a valid IdentiDeck AES-256-GCM envelope.`,
    );
  }

  const gistUpdatedAt = raw.updated_at ? Date.parse(raw.updated_at) : 0;
  const updatedAtMs = Math.max(parsed.updatedAt || 0, Number.isFinite(gistUpdatedAt) ? gistUpdatedAt : 0);

  return {
    id: raw.id,
    updatedAtMs,
    envelope: parsed,
  };
}

export async function findIdentiDeckGist(
  provider: SyncProvider,
  token: string,
  fetcher: FetchFn = globalThis.fetch.bind(globalThis),
): Promise<string | null> {
  const cleanToken = assertToken(token);
  const adapter = ADAPTERS[provider];
  const resp = await safeFetch(
    adapter.listUrl(cleanToken),
    { method: 'GET', headers: adapter.headers(cleanToken) },
    fetcher,
  );
  if (!resp.ok) handleHttpError(resp.status, provider);

  const list = (await resp.json()) as RawGistResponse[];
  if (!Array.isArray(list)) return null;

  const match = list.find((g) => Boolean(g.files && g.files[GIST_FILENAME]));
  return match ? match.id : null;
}

export async function fetchRemoteGistRecord(
  provider: SyncProvider,
  token: string,
  gistId: string,
  fetcher: FetchFn = globalThis.fetch.bind(globalThis),
): Promise<RemoteGistRecord> {
  const cleanToken = assertToken(token);
  const adapter = ADAPTERS[provider];
  const resp = await safeFetch(
    adapter.getUrl(gistId, cleanToken),
    { method: 'GET', headers: adapter.headers(cleanToken) },
    fetcher,
  );
  if (!resp.ok) handleHttpError(resp.status, provider);
  const raw = (await resp.json()) as RawGistResponse;
  return extractEnvelopeFromGist(raw, fetcher);
}

export async function pushEncryptedVault(
  config: SyncConfig,
  vault: VaultData,
  passphrase: string,
  options?: { force?: boolean; fetcher?: FetchFn },
): Promise<PushSyncResult> {
  const fetcher = options?.fetcher ?? globalThis.fetch.bind(globalThis);
  const cleanToken = assertToken(config.token);
  const adapter = ADAPTERS[config.provider];

  let targetGistId = config.gistId.trim();
  if (!targetGistId) {
    targetGistId = (await findIdentiDeckGist(config.provider, cleanToken, fetcher)) ?? '';
  }

  // Conflict timestamp check if updating an existing gist without force
  if (targetGistId && !options?.force) {
    try {
      const remote = await fetchRemoteGistRecord(
        config.provider,
        cleanToken,
        targetGistId,
        fetcher,
      );
      const knownRemote = config.lastRemoteUpdatedAt ?? 0;
      if (remote.updatedAtMs > knownRemote && remote.updatedAtMs > vault.updatedAt) {
        throw new GistSyncError(
          'CONFLICT',
          'Remote cloud vault is newer than your local version. Pull first or choose Force Push.',
          remote.updatedAtMs,
        );
      }
    } catch (err) {
      if (err instanceof GistSyncError && err.code === 'NOT_FOUND') {
        targetGistId = '';
      } else {
        throw err;
      }
    }
  }

  const envelope = await encryptVault(vault, passphrase);
  const bodyPayload: Record<string, unknown> = {
    description: GIST_DESCRIPTION,
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(envelope, null, 2),
      },
    },
  };

  const isCreate = !targetGistId;
  const url = isCreate
    ? adapter.createUrl(cleanToken)
    : adapter.updateUrl(targetGistId, cleanToken);

  const resp = await safeFetch(
    url,
    {
      method: isCreate ? 'POST' : 'PATCH',
      headers: adapter.headers(cleanToken),
      body: JSON.stringify(bodyPayload),
    },
    fetcher,
  );
  if (!resp.ok) handleHttpError(resp.status, config.provider);

  const saved = (await resp.json()) as RawGistResponse;
  const now = Date.now();
  return {
    gistId: saved.id || targetGistId,
    created: isCreate,
    updatedAt: envelope.updatedAt,
    syncedAt: now,
  };
}

export async function pullEncryptedVault(
  config: SyncConfig,
  passphrase: string,
  options?: { fetcher?: FetchFn },
): Promise<PullSyncResult> {
  const fetcher = options?.fetcher ?? globalThis.fetch.bind(globalThis);
  const cleanToken = assertToken(config.token);

  let targetGistId = config.gistId.trim();
  if (!targetGistId) {
    targetGistId = (await findIdentiDeckGist(config.provider, cleanToken, fetcher)) ?? '';
  }

  if (!targetGistId) {
    throw new GistSyncError(
      'NOT_FOUND',
      'No existing IdentiDeck encrypted Gist found on this account. Push once to initialize cloud sync.',
    );
  }

  const remote = await fetchRemoteGistRecord(
    config.provider,
    cleanToken,
    targetGistId,
    fetcher,
  );

  try {
    const vault = await decryptVault(remote.envelope, passphrase);
    return {
      gistId: remote.id,
      vault,
      remoteUpdatedAt: remote.updatedAtMs,
      syncedAt: Date.now(),
    };
  } catch (err) {
    if (err instanceof VaultCryptoError) {
      throw new GistSyncError('DECRYPTION_FAILED', err.message);
    }
    throw err;
  }
}

export async function twoWaySyncVault(
  config: SyncConfig,
  localVault: VaultData,
  passphrase: string,
  options?: { resolution?: 'use_local' | 'use_remote'; fetcher?: FetchFn },
): Promise<TwoWaySyncResult> {
  const fetcher = options?.fetcher ?? globalThis.fetch.bind(globalThis);
  const cleanToken = assertToken(config.token);

  let targetGistId = config.gistId.trim();
  if (!targetGistId) {
    targetGistId = (await findIdentiDeckGist(config.provider, cleanToken, fetcher)) ?? '';
  }

  if (!targetGistId) {
    const pushed = await pushEncryptedVault(config, localVault, passphrase, {
      force: true,
      fetcher,
    });
    return {
      action: 'pushed',
      gistId: pushed.gistId,
      vault: localVault,
      remoteUpdatedAt: pushed.updatedAt,
      syncedAt: pushed.syncedAt,
    };
  }

  if (options?.resolution === 'use_local') {
    const pushed = await pushEncryptedVault(
      { ...config, gistId: targetGistId },
      localVault,
      passphrase,
      { force: true, fetcher },
    );
    return {
      action: 'pushed',
      gistId: pushed.gistId,
      vault: localVault,
      remoteUpdatedAt: pushed.updatedAt,
      syncedAt: pushed.syncedAt,
    };
  }

  if (options?.resolution === 'use_remote') {
    const pulled = await pullEncryptedVault(
      { ...config, gistId: targetGistId },
      passphrase,
      { fetcher },
    );
    return {
      action: 'pulled',
      gistId: pulled.gistId,
      vault: pulled.vault,
      remoteUpdatedAt: pulled.remoteUpdatedAt,
      syncedAt: pulled.syncedAt,
    };
  }

  const remote = await fetchRemoteGistRecord(
    config.provider,
    cleanToken,
    targetGistId,
    fetcher,
  );

  const remoteChanged = remote.updatedAtMs > (config.lastRemoteUpdatedAt ?? 0);
  const localChanged = localVault.updatedAt > (config.lastSyncedAt ?? 0);

  if (remote.updatedAtMs === localVault.updatedAt) {
    return {
      action: 'up_to_date',
      gistId: remote.id,
      vault: localVault,
      remoteUpdatedAt: remote.updatedAtMs,
      syncedAt: Date.now(),
    };
  }

  if (remoteChanged && localChanged && config.lastSyncedAt) {
    return {
      action: 'conflict',
      gistId: remote.id,
      remoteUpdatedAt: remote.updatedAtMs,
      syncedAt: Date.now(),
    };
  }

  if (remote.updatedAtMs > localVault.updatedAt) {
    try {
      const vault = await decryptVault(remote.envelope, passphrase);
      return {
        action: 'pulled',
        gistId: remote.id,
        vault,
        remoteUpdatedAt: remote.updatedAtMs,
        syncedAt: Date.now(),
      };
    } catch (err) {
      if (err instanceof VaultCryptoError) {
        throw new GistSyncError('DECRYPTION_FAILED', err.message);
      }
      throw err;
    }
  }

  const pushed = await pushEncryptedVault(
    { ...config, gistId: remote.id },
    localVault,
    passphrase,
    { force: true, fetcher },
  );
  return {
    action: 'pushed',
    gistId: pushed.gistId,
    vault: localVault,
    remoteUpdatedAt: pushed.updatedAt,
    syncedAt: pushed.syncedAt,
  };
}
