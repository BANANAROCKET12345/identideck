import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Cloud,
  CloudAlert,
  Database,
  Eye,
  EyeOff,
  Globe,
  Moon,
  Network,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { useT } from '../i18n/translations';
import { useVaultStore } from '../store/useVaultStore';
import type { ThemeMode } from '../types/vault';

export interface TopBarProps {
  onOpenSearch: () => void;
  onOpenSync: () => void;
}

interface ViewTransitionLike {
  ready: Promise<void>;
}

type DocumentWithTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

const SPRING_TAB = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
};

export function TopBar({ onOpenSearch, onOpenSync }: TopBarProps) {
  const { t, language } = useT();

  const activeView = useVaultStore((s) => s.activeView);
  const setActiveView = useVaultStore((s) => s.setActiveView);
  const privacyMode = useVaultStore((s) => s.privacyMode);
  const togglePrivacyMode = useVaultStore((s) => s.togglePrivacyMode);
  const theme = useVaultStore((s) => s.theme);
  const setTheme = useVaultStore((s) => s.setTheme);
  const toggleLanguage = useVaultStore((s) => s.toggleLanguage);
  const setLanguage = useVaultStore((s) => s.setLanguage);
  const isDemoData = useVaultStore((s) => s.isDemoData);
  const clearDemoData = useVaultStore((s) => s.clearDemoData);
  const resetDemoData = useVaultStore((s) => s.resetDemoData);
  const syncStatus = useVaultStore((s) => s.syncStatus);
  const syncConfig = useVaultStore((s) => s.syncConfig);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handlePointerDown = (ev: globalThis.MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(ev.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setIsSettingsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen]);

  const applyThemeWithTransition = (
    nextTheme: ThemeMode,
    e: MouseEvent<HTMLButtonElement>,
  ) => {
    if (nextTheme === theme) return;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const doc = document as DocumentWithTransition;
    if (reducedMotion || typeof doc.startViewTransition !== 'function') {
      document.documentElement.classList.add('theme-fallback-transition');
      setTheme(nextTheme);
      window.setTimeout(() => {
        document.documentElement.classList.remove('theme-fallback-transition');
      }, 280);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX > 0 ? e.clientX : rect.left + rect.width / 2;
    const y = e.clientY > 0 ? e.clientY : rect.top + rect.height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 450,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      })
      .catch(() => {
        // Fallback already applied inside callback
      });
  };

  const handleThemeToggle = (e: MouseEvent<HTMLButtonElement>) => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    applyThemeWithTransition(nextTheme, e);
  };

  const hasCloudConfig = Boolean(syncConfig.token.trim());
  const syncMeta = (() => {
    if (syncStatus === 'syncing') {
      return {
        label: t('syncSyncing'),
        dotClass: 'bg-zinc-900 dark:bg-zinc-100 animate-pulse',
        icon: (
          <RefreshCw className="h-4 w-4 animate-spin text-[#111113] dark:text-[#FAFAFA]" />
        ),
      };
    }
    if (
      syncStatus === 'synced' ||
      (syncStatus === 'idle' && hasCloudConfig && syncConfig.lastSyncedAt)
    ) {
      return {
        label: t('syncSynced'),
        dotClass: 'bg-emerald-500',
        icon: (
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ),
      };
    }
    if (syncStatus === 'conflict' || syncStatus === 'error') {
      return {
        label: syncStatus === 'conflict' ? t('syncConflict') : t('syncError'),
        dotClass: 'bg-amber-500',
        icon: <CloudAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      };
    }
    return {
      label: hasCloudConfig ? t('syncCenter') : t('syncLocalOnly'),
      dotClass: 'bg-zinc-400 dark:bg-zinc-500',
      icon: <Cloud className="h-4 w-4 text-[#52525B] dark:text-[#A1A1AA]" />,
    };
  })();

  return (
    <>
      {/* Top Floating Liquid Glass Island (1 ultra-compact row on Mobile & Desktop) */}
      <header className="pointer-events-none sticky top-0 z-40 safe-pt">
        <div className="mx-auto max-w-5xl px-3.5 pt-2.5 sm:px-6 sm:pt-4">
          <div className="pointer-events-auto liquid-glass flex h-12 sm:h-[54px] items-center justify-between gap-2 rounded-full px-2.5 sm:px-3.5">
            {/* Left: Minimalist Brand Emblem + Wordmark */}
            <div className="flex min-w-0 items-center gap-2.5 pl-0.5">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111113] text-white shadow-xs ring-1 ring-inset ring-white/15 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:ring-black/10">
                <svg
                  viewBox="0 0 28 28"
                  fill="none"
                  className="h-4.5 w-4.5"
                  aria-hidden="true"
                >
                  <rect
                    x="6"
                    y="5.5"
                    width="16"
                    height="9.5"
                    rx="2.6"
                    fill="currentColor"
                    fillOpacity="0.28"
                  />
                  <path
                    d="M6.8 11.2H18.9L22.5 14.8V20.2C22.5 21.4 21.5 22.4 20.3 22.4H7.2C6 22.4 5 21.4 5 20.2V13C5 12 5.8 11.2 6.8 11.2Z"
                    fill="currentColor"
                  />
                  <rect
                    x="8.2"
                    y="14.9"
                    width="4.6"
                    height="3.6"
                    rx="0.9"
                    fill="#F59E0B"
                  />
                </svg>
              </div>
              <span className="truncate text-[15px] font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
                {t('appName')}
              </span>
            </div>

            {/* Center: Spring-Sliding Monochrome Segmented Control (Desktop >= sm) */}
            <nav
              aria-label="Primary View"
              className="hidden sm:inline-flex items-center rounded-full bg-black/[0.045] p-1 dark:bg-white/[0.06]"
            >
              {(
                [
                  { id: 'wallet', label: t('viewWallet'), Icon: WalletCards },
                  { id: 'graph', label: t('viewGraph'), Icon: Network },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = activeView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveView(id)}
                    aria-pressed={active}
                    className={`relative inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors duration-200 ${
                      active
                        ? 'text-[#111113] dark:text-[#FAFAFA]'
                        : 'text-[#52525B] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="topbar-tab-pill"
                        transition={SPRING_TAB}
                        className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.05] dark:bg-white/[0.13] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] dark:ring-white/[0.08]"
                      />
                    )}
                    <Icon className="relative z-10 h-3.5 w-3.5" />
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right: Compact Monochrome Circular Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Desktop Cmd+K Search Pill */}
              <button
                type="button"
                onClick={onOpenSearch}
                aria-label={t('searchShortcut')}
                className="hidden sm:inline-flex h-8.5 items-center gap-2 rounded-full bg-black/[0.045] px-2.5 md:px-3 text-xs font-medium text-[#52525B] transition-colors hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.11] dark:hover:text-[#FAFAFA]"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{t('searchShortcut')}</span>
                <kbd className="hidden md:inline-block rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#52525B] ring-1 ring-black/[0.06] dark:bg-white/[0.08] dark:text-[#A1A1AA] dark:ring-white/[0.08]">
                  ⌘K
                </kbd>
              </button>

              {/* Privacy Mask Toggle */}
              <button
                type="button"
                onClick={togglePrivacyMode}
                aria-pressed={privacyMode}
                aria-label={privacyMode ? t('privacyModeOn') : t('privacyModeOff')}
                title={privacyMode ? t('privacyModeOn') : t('privacyModeOff')}
                data-testid="privacy-toggle"
                className={`inline-flex h-8.5 w-8.5 items-center justify-center rounded-full transition-colors duration-200 ${
                  privacyMode
                    ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:bg-emerald-500/18 dark:text-emerald-300 dark:ring-emerald-400/30'
                    : 'bg-black/[0.045] text-[#52525B] hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.11] dark:hover:text-[#FAFAFA]'
                }`}
              >
                {privacyMode ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>

              {/* Circular-Expanding Dark/Light Switch */}
              <button
                type="button"
                onClick={handleThemeToggle}
                aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
                title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
                data-testid="theme-toggle"
                className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full bg-black/[0.045] text-[#52525B] transition-colors hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.11]"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              {/* Sync Cloud Button w/ Subtle Status Dot */}
              <button
                type="button"
                onClick={onOpenSync}
                aria-label={t('syncCenter')}
                title={syncMeta.label}
                data-testid="sync-trigger"
                className="relative inline-flex h-8.5 w-8.5 items-center justify-center rounded-full bg-black/[0.045] transition-colors hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.11]"
              >
                {syncMeta.icon}
                <span
                  className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${syncMeta.dotClass}`}
                />
              </button>

              {/* ZH / EN Compact Mono Pill (Desktop; on mobile accessible inside Settings) */}
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={language === 'zh' ? 'Switch to English' : '切换为简体中文'}
                data-testid="lang-toggle"
                className="hidden sm:inline-flex h-8.5 min-w-[36px] items-center justify-center rounded-full bg-black/[0.045] px-2.5 font-mono text-[11px] font-semibold tracking-tight text-[#111113] transition-colors hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-[#FAFAFA] dark:hover:bg-white/[0.11]"
              >
                {language === 'zh' ? 'EN' : '中'}
              </button>

              {/* Top-Right Settings Gear Icon + Liquid Glass Control Popover */}
              <div ref={settingsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={isSettingsOpen}
                  aria-label={language === 'zh' ? '设置' : 'Settings'}
                  title={language === 'zh' ? '设置' : 'Settings'}
                  data-testid="settings-trigger"
                  className={`inline-flex h-8.5 w-8.5 items-center justify-center rounded-full transition-all duration-200 ${
                    isSettingsOpen
                      ? 'bg-[#111113] text-white shadow-xs dark:bg-[#FAFAFA] dark:text-[#09090B]'
                      : 'bg-black/[0.045] text-[#52525B] hover:bg-black/[0.08] hover:text-[#111113] dark:bg-white/[0.06] dark:text-[#A1A1AA] dark:hover:bg-white/[0.11] dark:hover:text-[#FAFAFA]'
                  }`}
                >
                  <Settings
                    className={`h-4 w-4 transition-transform duration-300 ${
                      isSettingsOpen ? 'rotate-45' : 'hover:rotate-45'
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isSettingsOpen && (
                    <motion.div
                      role="menu"
                      aria-label={language === 'zh' ? '应用设置' : 'App Settings'}
                      data-testid="settings-popover"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="liquid-glass absolute right-0 top-11 z-50 w-[280px] origin-top-right overflow-hidden rounded-2xl !bg-white/95 p-3 shadow-[0_22px_54px_-12px_rgba(0,0,0,0.28)] dark:!bg-[#111116]/96 dark:shadow-[0_26px_64px_-12px_rgba(0,0,0,0.88)]"
                    >
                      {/* Popover Header */}
                      <div className="mb-2.5 flex items-center justify-between px-1">
                        <span className="text-xs font-semibold tracking-tight text-[#111113] dark:text-[#FAFAFA]">
                          {language === 'zh' ? '偏好与数据设置' : 'Preferences & Data'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSettingsOpen(false)}
                          aria-label={language === 'zh' ? '关闭设置' : 'Close settings'}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/[0.06] hover:text-[#111113] dark:hover:bg-white/[0.08] dark:hover:text-[#FAFAFA]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {/* Appearance Theme Switch */}
                        <div className="rounded-xl bg-black/[0.03] p-2 dark:bg-white/[0.04]">
                          <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                            {theme === 'dark' ? (
                              <Moon className="h-3 w-3" />
                            ) : (
                              <Sun className="h-3 w-3" />
                            )}
                            <span>{language === 'zh' ? '外观模式' : 'Appearance'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/[0.045] p-0.5 dark:bg-white/[0.05]">
                            {(
                              [
                                { id: 'light', label: language === 'zh' ? '浅色陶瓷' : 'Light', Icon: Sun },
                                { id: 'dark', label: language === 'zh' ? '黑曜深色' : 'Dark', Icon: Moon },
                              ] as const
                            ).map(({ id, label, Icon }) => {
                              const active = theme === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={(ev) => applyThemeWithTransition(id, ev)}
                                  className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md text-[11.5px] font-medium transition-all ${
                                    active
                                      ? 'bg-white text-[#111113] shadow-2xs dark:bg-[#FAFAFA] dark:text-[#09090B]'
                                      : 'text-[#52525B] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                                  }`}
                                >
                                  <Icon className="h-3 w-3" />
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Language Switch */}
                        <div className="rounded-xl bg-black/[0.03] p-2 dark:bg-white/[0.04]">
                          <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                            <Globe className="h-3 w-3" />
                            <span>{language === 'zh' ? '界面语言' : 'Language'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/[0.045] p-0.5 dark:bg-white/[0.05]">
                            {(
                              [
                                { id: 'zh', label: '简体中文' },
                                { id: 'en', label: 'English' },
                              ] as const
                            ).map(({ id, label }) => {
                              const active = language === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setLanguage(id)}
                                  className={`inline-flex h-7 items-center justify-center rounded-md text-[11.5px] font-medium transition-all ${
                                    active
                                      ? 'bg-white text-[#111113] shadow-2xs dark:bg-[#FAFAFA] dark:text-[#09090B]'
                                      : 'text-[#52525B] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:text-[#FAFAFA]'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Privacy Mode Quick Toggle */}
                        <button
                          type="button"
                          onClick={togglePrivacyMode}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#111113] transition-colors hover:bg-black/[0.04] dark:text-[#FAFAFA] dark:hover:bg-white/[0.06]"
                        >
                          <span className="inline-flex items-center gap-2">
                            {privacyMode ? (
                              <EyeOff className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                            )}
                            <span>{language === 'zh' ? '隐私打码模式' : 'Privacy Mask'}</span>
                          </span>
                          <span
                            className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                              privacyMode
                                ? 'bg-emerald-500 justify-end'
                                : 'bg-black/15 justify-start dark:bg-white/15'
                            }`}
                          >
                            <span className="h-4 w-4 rounded-full bg-white shadow-xs" />
                          </span>
                        </button>

                        {/* Encrypted Sync & JSON Backup */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsSettingsOpen(false);
                            onOpenSync();
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#111113] transition-colors hover:bg-black/[0.04] dark:text-[#FAFAFA] dark:hover:bg-white/[0.06]"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Database className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                            <span>
                              {language === 'zh' ? '加密同步与 JSON 备份' : 'Encrypted Sync & Backup'}
                            </span>
                          </span>
                          <span className={`h-2 w-2 rounded-full ${syncMeta.dotClass}`} />
                        </button>

                        {/* Demo Data Action */}
                        <div className="border-t border-black/[0.06] pt-2 dark:border-white/[0.07]">
                          {isDemoData ? (
                            <button
                              type="button"
                              onClick={() => {
                                clearDemoData();
                                setIsSettingsOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/12"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{language === 'zh' ? '清空示例数据，开始记录' : 'Clear demo data'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                resetDemoData();
                                setIsSettingsOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#52525B] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-[#A1A1AA] dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>{language === 'zh' ? '载入示例数据预览' : 'Load demo dataset'}</span>
                            </button>
                          )}
                        </div>

                        {/* Compact Keyboard Shortcuts Strip */}
                        <div className="flex items-center justify-between border-t border-black/[0.06] px-1 pt-2 text-[10.5px] text-zinc-500 dark:border-white/[0.07] dark:text-zinc-400">
                          <span>⌘K {language === 'zh' ? '搜索' : 'Search'}</span>
                          <span>←/→ {language === 'zh' ? '切卡' : 'Cards'}</span>
                          <span>P {language === 'zh' ? '隐私' : 'Mask'}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Delicate Centered Floating Demo Data Pill */}
          {isDemoData && (
            <div className="mt-2 flex justify-center">
              <div className="pointer-events-auto liquid-glass inline-flex items-center gap-2 rounded-full py-1 pl-3 pr-1.5 text-[11.5px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="whitespace-nowrap">
                  {language === 'zh' ? '演示数据' : 'Demo dataset'}
                </span>
                <span className="text-black/20 dark:text-white/20">·</span>
                <button
                  type="button"
                  onClick={clearDemoData}
                  data-testid="clear-demo-btn"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-[#111113] transition-colors hover:bg-black/[0.1] dark:bg-white/[0.08] dark:text-[#FAFAFA] dark:hover:bg-white/[0.15]"
                >
                  <span>{language === 'zh' ? '一键清空' : t('demoClearAction')}</span>
                  <X className="h-3 w-3 opacity-70" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* iOS 26 Soft Bottom Gradient Fade Scrim behind Floating Bottom Tab Bar (< sm) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-24 sm:hidden bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/75 to-transparent dark:from-[#050507] dark:via-[#050507]/75 dark:to-transparent"
      />

      {/* iPhone 17 Pro Max Thumb-First iOS 26 Floating Liquid Glass Bottom Dock (< sm) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        data-testid="mobile-bottom-dock"
        className="pointer-events-none fixed inset-x-4 bottom-3 z-40 sm:hidden pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="pointer-events-auto liquid-glass mx-auto grid max-w-[348px] grid-cols-3 items-center gap-1 rounded-full !bg-white/92 p-1.5 shadow-[0_14px_34px_-8px_rgba(0,0,0,0.22)] dark:!bg-[#101014]/94 dark:shadow-[0_18px_42px_-8px_rgba(0,0,0,0.85)]">
          {(
            [
              { id: 'wallet', label: t('viewWallet'), Icon: WalletCards },
              { id: 'graph', label: t('viewGraph'), Icon: Network },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveView(id)}
                aria-pressed={active}
                className={`relative inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? 'text-[#111113] dark:text-[#FAFAFA]'
                    : 'text-[#52525B] dark:text-[#A1A1AA]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-dock-pill"
                    transition={SPRING_TAB}
                    className="absolute inset-0 rounded-full bg-white shadow-xs ring-1 ring-black/[0.05] dark:bg-white/[0.14] dark:ring-white/[0.08]"
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label={t('searchShortcut')}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-xs font-semibold text-[#52525B] transition-colors active:bg-black/[0.06] dark:text-[#A1A1AA] dark:active:bg-white/[0.08]"
          >
            <Search className="h-4 w-4" />
            <span>{t('viewSearch')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
