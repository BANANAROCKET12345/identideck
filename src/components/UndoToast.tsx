import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { useT } from '../i18n/translations';
import { UNDO_TTL_MS, useVaultStore } from '../store/useVaultStore';

export function UndoToast() {
  const { t } = useT();
  const undoStack = useVaultStore((s) => s.undoStack);
  const undoLastDelete = useVaultStore((s) => s.undoLastDelete);
  const dismissUndo = useVaultStore((s) => s.dismissUndo);

  const activeEntry = undoStack[0] ?? null;
  const [remainingMs, setRemainingMs] = useState(UNDO_TTL_MS);

  useEffect(() => {
    if (!activeEntry) return;
    const update = () => {
      setRemainingMs(Math.max(0, activeEntry.expiresAt - Date.now()));
    };
    update();
    const timer = window.setInterval(update, 80);
    return () => window.clearInterval(timer);
  }, [activeEntry]);

  if (!activeEntry) return null;

  const totalDuration = Math.max(
    1,
    activeEntry.expiresAt - activeEntry.createdAt,
  );
  const progressPct = Math.min(
    100,
    Math.max(0, (remainingMs / totalDuration) * 100),
  );
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  const message =
    activeEntry.kind === 'identity'
      ? t('undoDeletedIdentity', { label: activeEntry.label })
      : t('undoDeletedBinding', { label: activeEntry.label });

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="undo-toast"
      className="pointer-events-none fixed inset-x-0 bottom-[76px] sm:bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-full border border-white/12 bg-[#111114]/92 text-[#FAFAFA] shadow-[0_18px_42px_-12px_rgba(0,0,0,0.65)] backdrop-blur-2xl dark:border-white/14 dark:bg-[#18181D]/92"
      >
        <div className="flex items-center justify-between gap-3 py-2.5 pl-4 pr-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs sm:text-[13px] font-medium text-[#FAFAFA]">
              {message}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => undoLastDelete()}
              data-testid="undo-restore-btn"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FAFAFA] px-3 text-xs font-semibold text-[#09090B] transition-colors hover:bg-[#E4E4E7]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('undoButton')}</span>
              <span className="font-mono text-[10.5px] opacity-70">
                {secondsLeft}s
              </span>
            </button>

            <button
              type="button"
              onClick={() => dismissUndo(activeEntry.id)}
              aria-label={t('close')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Crisp 6s Countdown Rail */}
        <div className="h-0.5 w-full bg-white/10">
          <div
            className="h-full bg-emerald-400 transition-[width] duration-75 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </motion.div>
    </div>
  );
}
