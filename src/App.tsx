import { useCallback, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { CommandSearchModal } from './components/CommandSearchModal';
import { IdentityEditorModal } from './components/IdentityEditorModal';
import { MigrationDrawer } from './components/MigrationDrawer';
import { QuickPickModal } from './components/QuickPickModal';
import {
  RelationshipGraph,
  type GraphFocusTarget,
} from './components/RelationshipGraph';
import { SubscriptionOverviewModal } from './components/SubscriptionOverviewModal';
import { SyncBackupModal } from './components/SyncBackupModal';
import { TopBar } from './components/TopBar';
import { UndoToast } from './components/UndoToast';
import { WalletDeck } from './components/WalletDeck';
import { useT } from './i18n/translations';
import { useVaultStore } from './store/useVaultStore';
import type { AppBinding, IdentityCard, IdentityType } from './types/vault';

interface QuickPickModalState {
  isOpen: boolean;
  initialIdentityId: string | null;
  editingBinding: AppBinding | null;
  initialServiceId: string | null;
}

const INITIAL_QUICK_PICK_STATE: QuickPickModalState = {
  isOpen: false,
  initialIdentityId: null,
  editingBinding: null,
  initialServiceId: null,
};

export function App() {
  const { language } = useT();
  const hydrated = useVaultStore((s) => s.hydrated);
  const hydrate = useVaultStore((s) => s.hydrate);
  const activeView = useVaultStore((s) => s.activeView);
  const setActiveView = useVaultStore((s) => s.setActiveView);
  const setSelectedIdentityId = useVaultStore((s) => s.setSelectedIdentityId);
  const selectedIdentityId = useVaultStore((s) => s.selectedIdentityId);
  const identities = useVaultStore((s) => s.identities);
  const theme = useVaultStore((s) => s.theme);
  const togglePrivacyMode = useVaultStore((s) => s.togglePrivacyMode);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isSubOverviewOpen, setIsSubOverviewOpen] = useState(false);
  const [migrationIdentityId, setMigrationIdentityId] = useState<string | null>(null);
  const [identityEditorState, setIdentityEditorState] = useState<{
    isOpen: boolean;
    editingIdentity: IdentityCard | null;
    defaultType?: IdentityType;
  }>({ isOpen: false, editingIdentity: null });
  const [quickPickState, setQuickPickState] = useState<QuickPickModalState>(
    INITIAL_QUICK_PICK_STATE,
  );
  const [graphFocus, setGraphFocus] = useState<GraphFocusTarget>(null);
  const [highlightedBindingId, setHighlightedBindingId] = useState<string | null>(null);
  const [offlineReady, setOfflineReady] = useState<boolean>(() =>
    typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller),
  );
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  // Hydrate vault & sync config from IndexedDB on mount
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Keep <html lang> and iOS Safari theme-color synced with Apple Ceramic / OLED Obsidian
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  useEffect(() => {
    const color = theme === 'dark' ? '#050507' : '#F5F5F7';
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]:not([media])',
    );
    if (meta) {
      meta.content = color;
    } else {
      const created = document.createElement('meta');
      created.name = 'theme-color';
      created.content = color;
      document.head.appendChild(created);
    }
  }, [theme]);

  // Track PWA offline readiness & online/offline status
  useEffect(() => {
    const handleOfflineReady = () => setOfflineReady(true);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('identideck:offline-ready', handleOfflineReady);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready
        .then(() => setOfflineReady(true))
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener('identideck:offline-ready', handleOfflineReady);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global keyboard shortcuts: Cmd/Ctrl + K, P (Privacy toggle), and Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // Single-key 'P' toggles Privacy Mode when no text field is focused
      if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.repeat &&
        e.key.toLowerCase() === 'p'
      ) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const isTypingTarget =
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          Boolean(target?.isContentEditable);
        if (!isTypingTarget) {
          e.preventDefault();
          togglePrivacyMode();
          return;
        }
      }

      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isSubOverviewOpen) {
          setIsSubOverviewOpen(false);
        } else if (isSyncOpen) {
          setIsSyncOpen(false);
        } else if (migrationIdentityId) {
          setMigrationIdentityId(null);
        } else if (quickPickState.isOpen) {
          setQuickPickState(INITIAL_QUICK_PICK_STATE);
        } else if (identityEditorState.isOpen) {
          setIdentityEditorState({ isOpen: false, editingIdentity: null });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isSearchOpen,
    isSubOverviewOpen,
    isSyncOpen,
    migrationIdentityId,
    quickPickState.isOpen,
    identityEditorState.isOpen,
    togglePrivacyMode,
  ]);

  // Navigation & Modal Callbacks
  const handleAddIdentity = useCallback(() => {
    setIdentityEditorState({ isOpen: true, editingIdentity: null });
  }, []);

  const handleAddIdentityWithType = useCallback((type: IdentityType) => {
    setIdentityEditorState({
      isOpen: true,
      editingIdentity: null,
      defaultType: type,
    });
  }, []);

  const handleEditIdentity = useCallback((identity: IdentityCard) => {
    setIdentityEditorState({ isOpen: true, editingIdentity: identity });
  }, []);

  const handleOpenQuickPick = useCallback(
    (identityId?: string, preselectedServiceId?: string) => {
      setQuickPickState({
        isOpen: true,
        initialIdentityId: identityId ?? selectedIdentityId ?? identities[0]?.id ?? null,
        editingBinding: null,
        initialServiceId: preselectedServiceId ?? null,
      });
    },
    [selectedIdentityId, identities],
  );

  const handleEditBinding = useCallback((binding: AppBinding) => {
    setQuickPickState({
      isOpen: true,
      initialIdentityId: binding.identityId,
      editingBinding: binding,
      initialServiceId: null,
    });
  }, []);

  const handleJumpToWallet = useCallback(
    (identityId: string, bindingId?: string) => {
      setSelectedIdentityId(identityId);
      setActiveView('wallet');
      if (bindingId) {
        setHighlightedBindingId(bindingId);
        window.setTimeout(() => {
          setHighlightedBindingId((prev) => (prev === bindingId ? null : prev));
        }, 2600);
      } else {
        setHighlightedBindingId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [setSelectedIdentityId, setActiveView],
  );

  const handleIsolateIdentityInGraph = useCallback(
    (identityId: string) => {
      setSelectedIdentityId(identityId);
      setGraphFocus({ kind: 'identity', id: identityId });
      setActiveView('graph');
    },
    [setSelectedIdentityId, setActiveView],
  );

  const handleIsolateServiceInGraph = useCallback(
    (serviceId: string) => {
      setGraphFocus({ kind: 'service', serviceId });
      setActiveView('graph');
    },
    [setActiveView],
  );

  const handleQuickBindFromSearch = useCallback(
    (serviceId: string) => {
      if (identities.length === 0) {
        setIdentityEditorState({ isOpen: true, editingIdentity: null });
        return;
      }
      setQuickPickState({
        isOpen: true,
        initialIdentityId: selectedIdentityId ?? identities[0]?.id ?? null,
        editingBinding: null,
        initialServiceId: serviceId,
      });
    },
    [identities, selectedIdentityId],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F5F7] text-[#111113] transition-colors duration-200 dark:bg-[#050507] dark:text-[#FAFAFA]">
      <TopBar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSync={() => setIsSyncOpen(true)}
      />

      <main className="flex-1 pt-1 sm:pt-2">
        {!hydrated ? (
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-[26px] border border-black/[0.06] bg-white/70 dark:border-white/[0.06] dark:bg-[#121216]/70"
                />
              ))}
            </div>
          </div>
        ) : activeView === 'wallet' ? (
          <WalletDeck
            onAddIdentity={handleAddIdentity}
            onAddIdentityWithType={handleAddIdentityWithType}
            onEditIdentity={handleEditIdentity}
            onOpenQuickPick={handleOpenQuickPick}
            onEditBinding={handleEditBinding}
            onOpenMigration={(id) => setMigrationIdentityId(id)}
            onOpenSubOverview={() => setIsSubOverviewOpen(true)}
            highlightedBindingId={highlightedBindingId}
          />
        ) : (
          <RelationshipGraph
            externalFocus={graphFocus}
            onClearExternalFocus={() => setGraphFocus(null)}
            onJumpToWallet={handleJumpToWallet}
            onOpenMigration={(id) => setMigrationIdentityId(id)}
            onEditBinding={handleEditBinding}
            onOpenQuickPick={(id) => handleOpenQuickPick(id)}
          />
        )}
      </main>

      {/* Ultra-Quiet Minimalist Footer (cleared above mobile floating bottom dock) */}
      <footer
        className="mt-auto"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2.5 px-4 pb-20 pt-5 text-[11px] text-zinc-400 sm:px-6 sm:pb-5 dark:text-zinc-500">
          {isOffline ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
              <WifiOff className="h-3 w-3" />
              {language === 'zh' ? '离线运行中' : 'Offline Mode'}
            </span>
          ) : (
            <span
              className={`h-1.5 w-1.5 rounded-full bg-[#10B981] ${
                offlineReady ? 'opacity-100' : 'opacity-50'
              }`}
              title={language === 'zh' ? 'PWA 离线可用' : 'PWA Offline Ready'}
            />
          )}
          <span className="font-mono tracking-tight">
            IdentiDeck · Local-First · Zero Passwords · AES-256-GCM
          </span>
        </div>
      </footer>

      {/* Modals & Slide-Over Drawers */}
      <IdentityEditorModal
        isOpen={identityEditorState.isOpen}
        editingIdentity={identityEditorState.editingIdentity}
        defaultType={identityEditorState.defaultType}
        onClose={() =>
          setIdentityEditorState({ isOpen: false, editingIdentity: null })
        }
      />

      <SubscriptionOverviewModal
        isOpen={isSubOverviewOpen}
        onClose={() => setIsSubOverviewOpen(false)}
        onJumpToIdentity={(identityId) => {
          setIsSubOverviewOpen(false);
          handleJumpToWallet(identityId);
        }}
        onJumpToBinding={(identityId, bindingId) => {
          setIsSubOverviewOpen(false);
          handleJumpToWallet(identityId, bindingId);
        }}
      />

      <QuickPickModal
        isOpen={quickPickState.isOpen}
        initialIdentityId={quickPickState.initialIdentityId}
        editingBinding={quickPickState.editingBinding}
        initialServiceId={quickPickState.initialServiceId}
        onClose={() => setQuickPickState(INITIAL_QUICK_PICK_STATE)}
      />

      <MigrationDrawer
        identityId={migrationIdentityId}
        onClose={() => setMigrationIdentityId(null)}
      />

      <SyncBackupModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
      />

      <CommandSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectBindingWallet={(identityId, bindingId) =>
          handleJumpToWallet(identityId, bindingId)
        }
        onSelectBindingGraph={handleIsolateServiceInGraph}
        onSelectIdentityWallet={(identityId) => handleJumpToWallet(identityId)}
        onSelectIdentityGraph={handleIsolateIdentityInGraph}
        onQuickBindService={handleQuickBindFromSearch}
      />

      <UndoToast />
    </div>
  );
}
export default App;
