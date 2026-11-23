import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  DownloadCloud,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson,
  HardDrive,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  evaluatePassphraseStrength,
  isEncryptedVaultEnvelope,
} from '../crypto/vaultCrypto';
import { useT } from '../i18n/translations';
import { useVaultStore } from '../store/useVaultStore';
import { SYNC_TOKEN_HELP_URLS } from '../sync/gistSync';
import type { SyncProvider } from '../types/vault';

export interface SyncBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = 'cloud' | 'local';

const SPRING_MODAL = { type: 'spring', stiffness: 420, damping: 32 } as const;

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getDateStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function SyncBackupModal({ isOpen, onClose }: SyncBackupModalProps) {
  const { t, language } = useT();
  const prefersReducedMotion = useReducedMotion();
  const syncConfig = useVaultStore((s) => s.syncConfig);
  const syncStatus = useVaultStore((s) => s.syncStatus);
  const syncMessage = useVaultStore((s) => s.syncMessage);
  const updateSyncConfig = useVaultStore((s) => s.updateSyncConfig);
  const clearSyncFeedback = useVaultStore((s) => s.clearSyncFeedback);
  const pushSync = useVaultStore((s) => s.pushSync);
  const pullSync = useVaultStore((s) => s.pullSync);
  const runTwoWaySync = useVaultStore((s) => s.runTwoWaySync);
  const exportPlainJson = useVaultStore((s) => s.exportPlainJson);
  const exportEncryptedJson = useVaultStore((s) => s.exportEncryptedJson);
  const importJsonPayload = useVaultStore((s) => s.importJsonPayload);
  const resetDemoData = useVaultStore((s) => s.resetDemoData);
  const clearAllData = useVaultStore((s) => s.clearAllData);

  const [activeTab, setActiveTab] = useState<ModalTab>('cloud');

  // Cloud tab local state (passphrase never persisted)
  const [cloudPassphrase, setCloudPassphrase] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showCloudPass, setShowCloudPass] = useState(false);
  const [cloudNotice, setCloudNotice] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedGistId, setCopiedGistId] = useState(false);

  // Local JSON tab state
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [showExportPass, setShowExportPass] = useState(false);
  const [pendingEncryptedRaw, setPendingEncryptedRaw] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [showImportPass, setShowImportPass] = useState(false);
  const [localNotice, setLocalNotice] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmClearStep, setConfirmClearStep] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCloudNotice(null);
    setLocalNotice(null);
    setConfirmClearStep(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const cloudStrength = useMemo(
    () => evaluatePassphraseStrength(cloudPassphrase),
    [cloudPassphrase],
  );
  const exportStrength = useMemo(
    () => evaluatePassphraseStrength(exportPassphrase),
    [exportPassphrase],
  );

  const isBusy = syncStatus === 'syncing';
  const tokenHelpUrl = SYNC_TOKEN_HELP_URLS[syncConfig.provider];

  const getStrengthMeta = (strength: ReturnType<typeof evaluatePassphraseStrength>) => {
    const labelMap = {
      weak: t('syncStrengthWeak'),
      fair: t('syncStrengthFair'),
      good: t('syncStrengthGood'),
      strong: t('syncStrengthStrong'),
    } as const;
    const colorMap = {
      weak: 'bg-rose-500 text-rose-600 dark:text-rose-400',
      fair: 'bg-amber-500 text-amber-700 dark:text-amber-400',
      good: 'bg-zinc-700 dark:bg-zinc-300 text-zinc-700 dark:text-zinc-300',
      strong: 'bg-[#10B981] text-[#059669] dark:text-[#34D399]',
    } as const;
    const tokens = colorMap[strength.label].split(' ');
    return {
      label: labelMap[strength.label],
      barColor: strength.label === 'good' ? 'bg-zinc-700 dark:bg-zinc-300' : tokens[0],
      textColor:
        strength.label === 'good'
          ? 'text-zinc-700 dark:text-zinc-300'
          : tokens.slice(1).join(' '),
    };
  };

  const handleSelectProvider = (provider: SyncProvider) => {
    clearSyncFeedback();
    setCloudNotice(null);
    updateSyncConfig({ provider });
  };

  const validateCloudInputs = (): boolean => {
    if (!syncConfig.token.trim()) {
      setCloudNotice({
        kind: 'error',
        text:
          language === 'zh'
            ? '请先填写 Personal Access Token（仅需 gist 权限）。'
            : 'Please enter your Personal Access Token (gist scope).',
      });
      return false;
    }
    if (!cloudPassphrase.trim()) {
      setCloudNotice({
        kind: 'error',
        text:
          language === 'zh'
            ? '请输入端到端加密口令（AES-256-GCM 本地加解密必需）。'
            : 'Please enter your local AES-256-GCM encryption passphrase.',
      });
      return false;
    }
    return true;
  };

  const handleTwoWaySync = async (resolution?: 'use_local' | 'use_remote') => {
    if (!validateCloudInputs()) return;
    setCloudNotice(null);
    try {
      const res = await runTwoWaySync(cloudPassphrase, resolution);
      if (res.action === 'conflict') {
        setCloudNotice({
          kind: 'error',
          text:
            language === 'zh'
              ? '检测到本地与云端均有新改动，请选择「强制覆盖云端」或「采用云端版本」。'
              : 'Both local and cloud vaults changed. Choose Force Push Local or Use Cloud Version.',
        });
      } else if (res.action === 'pushed') {
        setCloudNotice({
          kind: 'success',
          text:
            language === 'zh'
              ? `已完成 AES-256-GCM 加密上传（Gist: ${res.gistId.slice(0, 10)}…）`
              : `Encrypted & pushed to private Gist (${res.gistId.slice(0, 10)}…)`,
        });
      } else if (res.action === 'pulled') {
        setCloudNotice({
          kind: 'success',
          text:
            language === 'zh'
              ? '已从私有 Gist 拉取并解密最新身份卡包！'
              : 'Pulled & decrypted latest vault from your private Gist!',
        });
      } else {
        setCloudNotice({
          kind: 'success',
          text:
            language === 'zh'
              ? '本地与云端私有 Gist 已完全一致，无需改动。'
              : 'Already up to date with your encrypted private Gist.',
        });
      }
    } catch (err) {
      setCloudNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Sync failed.',
      });
    }
  };

  const handlePush = async (force = false) => {
    if (!validateCloudInputs()) return;
    setCloudNotice(null);
    try {
      const res = await pushSync(cloudPassphrase, { force });
      setCloudNotice({
        kind: 'success',
        text:
          language === 'zh'
            ? `${res.created ? '已创建私有 Gist 并加密上传' : '已加密同步更新至云端'}（ID: ${res.gistId.slice(0, 10)}…）`
            : `${res.created ? 'Created private Gist & pushed' : 'Encrypted push succeeded'} (${res.gistId.slice(0, 10)}…)`,
      });
    } catch (err) {
      setCloudNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Push failed.',
      });
    }
  };

  const handlePull = async () => {
    if (!validateCloudInputs()) return;
    setCloudNotice(null);
    try {
      const res = await pullSync(cloudPassphrase);
      setCloudNotice({
        kind: 'success',
        text:
          language === 'zh'
            ? `解密恢复成功：${res.vault.identities.length} 张身份卡，${res.vault.bindings.length} 个绑定！`
            : `Decrypted & restored ${res.vault.identities.length} identities and ${res.vault.bindings.length} bindings.`,
      });
    } catch (err) {
      setCloudNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Pull failed.',
      });
    }
  };

  const handleCopyGistId = async () => {
    if (!syncConfig.gistId) return;
    try {
      await navigator.clipboard.writeText(syncConfig.gistId);
      setCopiedGistId(true);
      window.setTimeout(() => setCopiedGistId(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleExportPlain = () => {
    try {
      const json = exportPlainJson();
      downloadTextFile(`identideck-plain-${getDateStamp()}.json`, json);
      setLocalNotice({
        kind: 'success',
        text:
          language === 'zh'
            ? '已导出明文 JSON 备份（不含任何密码字段）。'
            : 'Exported plain JSON backup (zero password fields).',
      });
    } catch (err) {
      setLocalNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Export failed.',
      });
    }
  };

  const handleExportEncrypted = async () => {
    const pass = exportPassphrase.trim();
    if (!pass) {
      setLocalNotice({
        kind: 'error',
        text:
          language === 'zh'
            ? '请先输入用于本地 AES-256-GCM 加密导出的口令。'
            : 'Enter a passphrase to encrypt your exported backup file.',
      });
      return;
    }
    try {
      const encryptedJson = await exportEncryptedJson(pass);
      downloadTextFile(`identideck-${getDateStamp()}.identideck.json`, encryptedJson);
      setLocalNotice({
        kind: 'success',
        text:
          language === 'zh'
            ? '已导出 AES-256-GCM 端到端加密备份（.identideck.json）。'
            : 'Exported AES-256-GCM encrypted backup (.identideck.json).',
      });
    } catch (err) {
      setLocalNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Encrypted export failed.',
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setLocalNotice(null);
    setPendingEncryptedRaw(null);
    setImportPassphrase('');

    try {
      const rawText = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        setLocalNotice({
          kind: 'error',
          text:
            language === 'zh'
              ? '所选文件不是有效的 JSON 格式。'
              : 'Selected file is not valid JSON.',
        });
        return;
      }

      if (isEncryptedVaultEnvelope(parsed)) {
        setPendingEncryptedRaw(rawText);
        setPendingFileName(file.name);
        return;
      }

      const result = await importJsonPayload(rawText);
      setLocalNotice({
        kind: 'success',
        text:
          language === 'zh'
            ? `导入成功：${result.importedIdentities} 张身份卡、${result.importedBindings} 个 App 绑定。`
            : `Imported ${result.importedIdentities} identities and ${result.importedBindings} bindings.`,
      });
    } catch (err) {
      setLocalNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Import failed.',
      });
    }
  };

  const handleDecryptAndImport = async () => {
    if (!pendingEncryptedRaw) return;
    if (!importPassphrase.trim()) {
      setLocalNotice({
        kind: 'error',
        text:
          language === 'zh' ? '请输入解密口令。' : 'Please enter your decryption passphrase.',
      });
      return;
    }
    try {
      const result = await importJsonPayload(pendingEncryptedRaw, importPassphrase);
      setPendingEncryptedRaw(null);
      setPendingFileName('');
      setImportPassphrase('');
      setLocalNotice({
        kind: 'success',
        text:
          language === 'zh'
            ? `AES-256-GCM 解密并导入成功：${result.importedIdentities} 张身份卡、${result.importedBindings} 个绑定！`
            : `Decrypted & imported ${result.importedIdentities} identities and ${result.importedBindings} bindings.`,
      });
    } catch (err) {
      setLocalNotice({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : language === 'zh'
              ? '解密失败：口令错误或文件已损坏。'
              : 'Decryption failed: wrong passphrase or tampered file.',
      });
    }
  };

  const lastSyncedFormatted = syncConfig.lastSyncedAt
    ? new Date(syncConfig.lastSyncedAt).toLocaleString(
        language === 'zh' ? 'zh-CN' : 'en-US',
        {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      )
    : null;

  const cloudStrengthMeta = getStrengthMeta(cloudStrength);
  const exportStrengthMeta = getStrengthMeta(exportStrength);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
        >
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-md"
          />

          {/* Liquid Glass Modal Surface */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={prefersReducedMotion ? { duration: 0 } : SPRING_MODAL}
            className="liquid-glass relative z-10 flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/94 shadow-[0_28px_80px_-20px_rgba(0,0,0,0.32)] dark:border-white/[0.09] dark:bg-[#121216]/94 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_32px_90px_-16px_rgba(0,0,0,0.9)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4 dark:border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/[0.05] text-[#111113] dark:bg-white/[0.07] dark:text-[#FAFAFA]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="sync-modal-title"
                    className="text-base font-bold tracking-tight text-[#111113] dark:text-[#FAFAFA]"
                  >
                    {t('syncModalTitle')}
                  </h2>
                  <p className="font-mono text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400">
                    PBKDF2-SHA256 · AES-256-GCM · {t('zeroPasswordBadge')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/[0.045] text-zinc-600 transition-colors hover:bg-black/[0.085] hover:text-[#111113] dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.12] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Spring-Sliding Monochrome Tab Switcher */}
            <div className="border-b border-black/[0.05] bg-black/[0.02] px-5 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="grid grid-cols-2 gap-1 rounded-full border border-black/[0.06] bg-black/[0.04] p-1 dark:border-white/[0.07] dark:bg-white/[0.04]">
                {(
                  [
                    { id: 'cloud' as const, label: t('syncTabCloud'), icon: Cloud },
                    { id: 'local' as const, label: t('syncTabLocal'), icon: HardDrive },
                  ]
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-full py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                        active
                          ? 'text-white dark:text-[#09090B]'
                          : 'text-zinc-600 hover:text-[#111113] dark:text-zinc-400 dark:hover:text-[#FAFAFA]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="sync-tab-pill"
                          transition={prefersReducedMotion ? { duration: 0 } : SPRING_MODAL}
                          className="absolute inset-0 rounded-full bg-[#111113] shadow-xs dark:bg-[#FAFAFA]"
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === 'cloud' ? (
                <div className="space-y-4">
                  {/* Provider Selector */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('syncProviderLabel')}
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(['github', 'gitee'] as const).map((provider) => {
                        const selected = syncConfig.provider === provider;
                        return (
                          <button
                            key={provider}
                            type="button"
                            onClick={() => handleSelectProvider(provider)}
                            className={`flex cursor-pointer flex-col rounded-2xl border p-3 text-left transition-all ${
                              selected
                                ? 'border-[#111113] bg-black/[0.035] ring-1 ring-black/10 dark:border-white/35 dark:bg-white/[0.07] dark:ring-white/10'
                                : 'border-black/[0.07] bg-white/70 hover:border-black/18 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/18'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#111113] dark:text-[#FAFAFA]">
                                {provider === 'github'
                                  ? 'GitHub Private Gist'
                                  : 'Gitee Private Gist'}
                              </span>
                              {selected && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#111113] text-white dark:bg-[#FAFAFA] dark:text-[#09090B]">
                                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <span className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                              {provider === 'github'
                                ? language === 'zh'
                                  ? '马来西亚 / 全球直连推荐'
                                  : 'Malaysia / Global direct'
                                : language === 'zh'
                                  ? '中国大陆直连备选'
                                  : 'Mainland China direct'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Token Input + Direct Deep Link */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="sync-token-input"
                        className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                      >
                        {t('syncTokenLabel')}
                      </label>
                      <a
                        href={tokenHelpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#111113] underline-offset-4 hover:underline dark:text-[#FAFAFA]"
                      >
                        {t('syncTokenHelp')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        id="sync-token-input"
                        type={showToken ? 'text' : 'password'}
                        value={syncConfig.token}
                        onChange={(e) => updateSyncConfig({ token: e.target.value })}
                        placeholder={t('syncTokenPlaceholder')}
                        autoComplete="off"
                        className="w-full rounded-2xl border border-black/[0.08] bg-black/[0.03] py-2.5 pl-3.5 pr-10 font-mono text-xs text-[#111113] placeholder:text-zinc-400 focus:border-black/30 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-white/30 dark:focus:bg-white/[0.06]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((v) => !v)}
                        aria-label={showToken ? 'Hide token' : 'Show token'}
                        className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:text-[#111113] dark:hover:text-[#FAFAFA]"
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* E2EE Passphrase Input + Strength Meter */}
                  <div>
                    <label
                      htmlFor="sync-passphrase-input"
                      className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      {t('syncPassphraseLabel')}
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        id="sync-passphrase-input"
                        type={showCloudPass ? 'text' : 'password'}
                        value={cloudPassphrase}
                        onChange={(e) => setCloudPassphrase(e.target.value)}
                        placeholder={t('syncPassphrasePlaceholder')}
                        autoComplete="new-password"
                        className="w-full rounded-2xl border border-black/[0.08] bg-black/[0.03] py-2.5 pl-10 pr-10 text-xs text-[#111113] placeholder:text-zinc-400 focus:border-black/30 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-white/30 dark:focus:bg-white/[0.06]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCloudPass((v) => !v)}
                        aria-label={showCloudPass ? 'Hide passphrase' : 'Show passphrase'}
                        className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:text-[#111113] dark:hover:text-[#FAFAFA]"
                      >
                        {showCloudPass ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {cloudPassphrase.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="grid flex-1 grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((step) => (
                            <span
                              key={step}
                              className={`h-1.5 rounded-full transition-colors ${
                                cloudStrength.score >= step
                                  ? cloudStrengthMeta.barColor
                                  : 'bg-black/[0.08] dark:bg-white/[0.09]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-[11px] font-semibold ${cloudStrengthMeta.textColor}`}>
                          {cloudStrengthMeta.label}
                        </span>
                      </div>
                    )}

                    <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {t('syncPassphraseHint')}
                    </p>
                  </div>

                  {/* Gist ID */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="sync-gist-id-input"
                        className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                      >
                        {t('syncGistIdLabel')}
                      </label>
                      {lastSyncedFormatted && (
                        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                          {t('syncLastSynced', { time: lastSyncedFormatted })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="sync-gist-id-input"
                        type="text"
                        value={syncConfig.gistId}
                        onChange={(e) => updateSyncConfig({ gistId: e.target.value })}
                        placeholder={t('syncGistIdPlaceholder')}
                        className="min-w-0 flex-1 rounded-2xl border border-black/[0.08] bg-black/[0.03] px-3.5 py-2 font-mono text-xs text-[#111113] placeholder:text-zinc-400 focus:border-black/30 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-white/30 dark:focus:bg-white/[0.06]"
                      />
                      {syncConfig.gistId && (
                        <button
                          type="button"
                          onClick={handleCopyGistId}
                          aria-label="Copy Gist ID"
                          className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-black/[0.045] px-3 text-xs font-medium text-[#111113] hover:bg-black/[0.085] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
                        >
                          {copiedGistId ? (
                            <Check className="h-3.5 w-3.5 text-[#10B981]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conflict Resolution */}
                  {syncStatus === 'conflict' && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 dark:border-amber-400/25 dark:bg-amber-400/12">
                      <div className="flex items-start gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>{syncMessage || t('syncConflict')}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleTwoWaySync('use_local')}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          {t('syncBtnForcePush')}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleTwoWaySync('use_remote')}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-amber-600/30 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50 dark:bg-zinc-900 dark:text-amber-200"
                        >
                          <DownloadCloud className="h-3.5 w-3.5" />
                          {t('syncBtnUseRemote')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {(cloudNotice || (syncStatus === 'error' && syncMessage)) && (
                    <div
                      className={`flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-medium ${
                        cloudNotice?.kind === 'success'
                          ? 'border-[#10B981]/25 bg-[#10B981]/10 text-[#047857] dark:border-[#10B981]/25 dark:bg-[#10B981]/12 dark:text-[#34D399]'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/12 dark:text-rose-300'
                      }`}
                    >
                      {cloudNotice?.kind === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span className="leading-relaxed">{cloudNotice?.text || syncMessage}</span>
                    </div>
                  )}

                  {/* Monochrome Luxury Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleTwoWaySync()}
                      className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#111113] px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200"
                    >
                      <RefreshCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
                      {isBusy ? t('syncSyncing') : t('syncBtnTwoWay')}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handlePush(false)}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-black/[0.045] px-3 text-xs font-semibold text-[#111113] transition-colors hover:bg-black/[0.085] disabled:opacity-50 dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        {t('syncBtnPush')}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={handlePull}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-black/[0.045] px-3 text-xs font-semibold text-[#111113] transition-colors hover:bg-black/[0.085] disabled:opacity-50 dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
                      >
                        <DownloadCloud className="h-3.5 w-3.5" />
                        {t('syncBtnPull')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* TAB 2: LOCAL JSON BACKUP & DATA MANAGEMENT */
                <div className="space-y-4">
                  {localNotice && (
                    <div
                      className={`flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-medium ${
                        localNotice.kind === 'success'
                          ? 'border-[#10B981]/25 bg-[#10B981]/10 text-[#047857] dark:border-[#10B981]/25 dark:bg-[#10B981]/12 dark:text-[#34D399]'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/12 dark:text-rose-300'
                      }`}
                    >
                      {localNotice.kind === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span className="leading-relaxed">{localNotice.text}</span>
                    </div>
                  )}

                  {/* Export Section */}
                  <div className="rounded-3xl border border-black/[0.07] bg-black/[0.02] p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#111113] dark:text-[#FAFAFA]">
                      <Download className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                      <span>{language === 'zh' ? '导出本地备份' : 'Export Local Backup'}</span>
                    </div>

                    <div className="mb-3">
                      <div className="relative">
                        <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                        <input
                          type={showExportPass ? 'text' : 'password'}
                          value={exportPassphrase}
                          onChange={(e) => setExportPassphrase(e.target.value)}
                          placeholder={
                            language === 'zh'
                              ? '输入加密口令以导出 .identideck.json 加密备份'
                              : 'Passphrase for AES-256-GCM .identideck.json export'
                          }
                          autoComplete="new-password"
                          className="w-full rounded-2xl border border-black/[0.08] bg-white py-2 pl-9 pr-9 text-xs text-[#111113] placeholder:text-zinc-400 focus:border-black/30 focus:outline-none dark:border-white/[0.08] dark:bg-[#16161B] dark:text-[#FAFAFA] dark:placeholder:text-zinc-500 dark:focus:border-white/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowExportPass((v) => !v)}
                          aria-label={showExportPass ? 'Hide' : 'Show'}
                          className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:text-[#111113] dark:hover:text-[#FAFAFA]"
                        >
                          {showExportPass ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {exportPassphrase.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="grid flex-1 grid-cols-4 gap-1">
                            {[1, 2, 3, 4].map((step) => (
                              <span
                                key={step}
                                className={`h-1 rounded-full ${
                                  exportStrength.score >= step
                                    ? exportStrengthMeta.barColor
                                    : 'bg-black/[0.08] dark:bg-white/[0.1]'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-[10px] font-semibold ${exportStrengthMeta.textColor}`}>
                            {exportStrengthMeta.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={handleExportEncrypted}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#111113] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200"
                      >
                        <Lock className="h-3.5 w-3.5 text-[#10B981]" />
                        {t('localExportEncrypted')}
                      </button>
                      <button
                        type="button"
                        onClick={handleExportPlain}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-black/[0.05] px-3.5 text-xs font-semibold text-[#111113] transition-colors hover:bg-black/[0.09] dark:bg-white/[0.07] dark:text-[#FAFAFA] dark:hover:bg-white/[0.13]"
                      >
                        <FileJson className="h-3.5 w-3.5" />
                        {t('localExportPlain')}
                      </button>
                    </div>
                  </div>

                  {/* Import Section */}
                  <div className="rounded-3xl border border-black/[0.07] bg-black/[0.02] p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#111113] dark:text-[#FAFAFA]">
                      <Upload className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                      <span>{t('localImportFile')}</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/15 bg-white/80 px-4 py-5 text-center transition-colors hover:border-black/35 hover:bg-white dark:border-white/15 dark:bg-[#16161B]/80 dark:hover:border-white/35 dark:hover:bg-[#1A1A21]"
                    >
                      <Upload className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                      <span className="text-xs font-semibold text-[#111113] dark:text-[#FAFAFA]">
                        {language === 'zh'
                          ? '选择 .json 或 .identideck.json 备份文件'
                          : 'Choose .json or .identideck.json backup file'}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {language === 'zh'
                          ? '自动识别明文与 AES-256-GCM 加密文件'
                          : 'Auto-detects both plain and AES-256-GCM encrypted backups'}
                      </span>
                    </button>

                    {pendingEncryptedRaw && (
                      <div className="mt-3 rounded-2xl border border-black/[0.09] bg-white p-3.5 dark:border-white/[0.12] dark:bg-[#16161B]">
                        <p className="text-xs font-semibold text-[#111113] dark:text-[#FAFAFA]">
                          {t('localImportPassPrompt')}
                        </p>
                        {pendingFileName && (
                          <p className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                            {pendingFileName}
                          </p>
                        )}
                        <div className="mt-2.5 flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showImportPass ? 'text' : 'password'}
                              value={importPassphrase}
                              onChange={(e) => setImportPassphrase(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleDecryptAndImport();
                              }}
                              placeholder={t('syncPassphrasePlaceholder')}
                              className="w-full rounded-full border border-black/[0.08] bg-black/[0.03] py-2 pl-3.5 pr-9 text-xs text-[#111113] focus:border-black/30 focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-[#FAFAFA] dark:focus:border-white/30"
                            />
                            <button
                              type="button"
                              onClick={() => setShowImportPass((v) => !v)}
                              aria-label={showImportPass ? 'Hide' : 'Show'}
                              className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center text-zinc-400"
                            >
                              {showImportPass ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleDecryptAndImport}
                            className="cursor-pointer rounded-full bg-[#111113] px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200"
                          >
                            {t('localImportConfirm')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vault Data Management */}
                  <div className="rounded-3xl border border-black/[0.07] bg-white/80 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <h3 className="mb-3 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {t('localDataManagement')}
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          resetDemoData();
                          setConfirmClearStep(false);
                          setLocalNotice({
                            kind: 'success',
                            text:
                              language === 'zh'
                                ? '已恢复完整示例身份卡包数据。'
                                : 'Demo dataset restored.',
                          });
                        }}
                        className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-black/[0.045] px-3.5 text-xs font-semibold text-[#111113] transition-colors hover:bg-black/[0.085] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.12]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('localResetDemo')}
                      </button>

                      {!confirmClearStep ? (
                        <button
                          type="button"
                          onClick={() => setConfirmClearStep(true)}
                          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/[0.08] px-3.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-500/15 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('localClearAll')}
                        </button>
                      ) : (
                        <div className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 dark:border-rose-400/25 dark:bg-rose-400/12">
                          <p className="text-xs font-medium text-rose-900 dark:text-rose-200">
                            {t('localConfirmClear')}
                          </p>
                          <div className="mt-2.5 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmClearStep(false)}
                              className="cursor-pointer rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#111113] hover:bg-zinc-100 dark:bg-zinc-800 dark:text-[#FAFAFA]"
                            >
                              {t('editorCancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                clearAllData();
                                setConfirmClearStep(false);
                                setLocalNotice({
                                  kind: 'success',
                                  text:
                                    language === 'zh'
                                      ? '已清空全部本地数据。'
                                      : 'All local vault data cleared.',
                                });
                              }}
                              className="cursor-pointer rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              {t('localClearAll')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
