"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AchievementIcon } from "@/components/achievements/achievement-icon";
import { LeagueBadge } from "@/components/visual/league-badge";

export type FeedbackTone = "success" | "error" | "warning" | "info" | "achievement";

export type FeedbackAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

export type FeedbackInput = {
  id?: string;
  tone: FeedbackTone;
  title: string;
  message?: string;
  duration?: number;
  action?: FeedbackAction;
};

export type AchievementFeedback = {
  id?: string;
  title: string;
  message: string;
  xp?: number;
  badge?: string;
  kind?: "achievement" | "league";
  league?: string;
  icon?: string | null;
  iconKey?: string | null;
  iconDescription?: string | null;
  rarity?: string | null;
  category?: string | null;
  color?: string | null;
  actionLabel?: string;
  onContinue?: () => void | Promise<void>;
};

type ConfirmInput = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type PromptInput = ConfirmInput & {
  placeholder?: string;
  initialValue?: string;
  required?: boolean;
};

type QueuedToast = FeedbackInput & {
  id: string;
};

type QueuedAchievement = AchievementFeedback & {
  id: string;
};

type DialogState =
  | {
      kind: "confirm";
      input: ConfirmInput;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "prompt";
      input: PromptInput;
      resolve: (value: string | null) => void;
    };

type FeedbackContextValue = {
  notify: (input: FeedbackInput) => string;
  dismiss: (id: string) => void;
  celebrate: (input: AchievementFeedback) => string;
  confirm: (input: ConfirmInput) => Promise<boolean>;
  requestText: (input: PromptInput) => Promise<string | null>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneStyles: Record<
  FeedbackTone,
  { border: string; icon: string; accent: string; label: string }
> = {
  success: {
    border: "border-emerald-200",
    icon: "bg-emerald-500 text-white",
    accent: "bg-emerald-500",
    label: "Sucesso",
  },
  error: {
    border: "border-rose-200",
    icon: "bg-rose-500 text-white",
    accent: "bg-rose-500",
    label: "Erro",
  },
  warning: {
    border: "border-amber-200",
    icon: "bg-amber-400 text-amber-950",
    accent: "bg-amber-400",
    label: "Atenção",
  },
  info: {
    border: "border-blue-200",
    icon: "bg-blue-600 text-white",
    accent: "bg-blue-600",
    label: "Informação",
  },
  achievement: {
    border: "border-violet-200",
    icon: "bg-violet-600 text-white",
    accent: "bg-gradient-to-r from-violet-600 to-orange-400",
    label: "Conquista",
  },
};

function feedbackId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const [achievements, setAchievements] = useState<QueuedAchievement[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const notify = useCallback((input: FeedbackInput) => {
    const id = input.id ?? feedbackId("feedback");
    setToasts((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== id);
      return [...withoutDuplicate, { ...input, id }].slice(-12);
    });
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const celebrate = useCallback((input: AchievementFeedback) => {
    const id = input.id ?? feedbackId("achievement");
    setAchievements((current) => {
      if (current.some((item) => item.id === id)) return current;
      return [...current, { ...input, id }];
    });
    return id;
  }, []);

  const confirm = useCallback(
    (input: ConfirmInput) =>
      new Promise<boolean>((resolve) => {
        setDialog((current) => {
          if (current?.kind === "confirm") current.resolve(false);
          if (current?.kind === "prompt") current.resolve(null);
          return { kind: "confirm", input, resolve };
        });
      }),
    [],
  );

  const requestText = useCallback(
    (input: PromptInput) =>
      new Promise<string | null>((resolve) => {
        setDialog((current) => {
          if (current?.kind === "confirm") current.resolve(false);
          if (current?.kind === "prompt") current.resolve(null);
          return { kind: "prompt", input, resolve };
        });
      }),
    [],
  );

  const value = useMemo(
    () => ({ notify, dismiss, celebrate, confirm, requestText }),
    [celebrate, confirm, dismiss, notify, requestText],
  );

  const activeAchievement = achievements[0] ?? null;

  async function closeAchievement(runAction: boolean) {
    if (!activeAchievement) return;
    if (runAction) await activeAchievement.onContinue?.();
    setAchievements((current) => current.slice(1));
  }

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[12000] flex flex-col-reverse gap-2 sm:inset-x-auto sm:left-5 sm:w-[390px] lg:left-[304px] lg:bottom-5"
        aria-live="polite"
        aria-label="Notificações"
      >
        <AnimatePresence initial={false}>
          {toasts.slice(0, 3).map((toast) => (
            <FeedbackToast key={toast.id} toast={toast} dismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>

      <AchievementModal
        achievement={activeAchievement}
        onClose={() => void closeAchievement(false)}
        onContinue={() => void closeAchievement(true)}
      />
      <FeedbackDialog
        key={dialog ? `${dialog.kind}-${dialog.input.title}` : "closed"}
        dialog={dialog}
        setDialog={setDialog}
      />
    </FeedbackContext.Provider>
  );
}

function FeedbackToast({
  toast,
  dismiss,
}: {
  toast: QueuedToast;
  dismiss: (id: string) => void;
}) {
  const [actionBusy, setActionBusy] = useState(false);
  const style = toneStyles[toast.tone];

  useEffect(() => {
    const timeout = window.setTimeout(() => dismiss(toast.id), toast.duration ?? 5600);
    return () => window.clearTimeout(timeout);
  }, [dismiss, toast.duration, toast.id]);

  async function runAction() {
    if (!toast.action || actionBusy) return;
    setActionBusy(true);
    try {
      await toast.action.onClick();
      dismiss(toast.id);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <motion.section
      layout
      initial={{ opacity: 0, x: -24, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -18, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className={`pointer-events-auto relative overflow-hidden rounded-[22px] border ${style.border} bg-white/96 p-3.5 shadow-[0_22px_55px_-26px_rgba(15,23,42,0.42)] backdrop-blur-xl`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />
      <div className="flex items-start gap-3 pl-1">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${style.icon}`}
        >
          <ToneIcon tone={toast.tone} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {style.label}
          </p>
          <h3 className="mt-0.5 text-sm font-black text-slate-950">{toast.title}</h3>
          {toast.message && (
            <p className="mt-1 text-xs font-medium leading-5 text-slate-600">{toast.message}</p>
          )}
          {toast.action && (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void runAction()}
              className="mt-2.5 inline-flex min-h-9 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {actionBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          aria-label="Fechar notificação"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.section>
  );
}

function ToneIcon({ tone }: { tone: FeedbackTone }) {
  if (tone === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (tone === "error") return <XCircle className="h-5 w-5" />;
  if (tone === "warning") return <AlertTriangle className="h-5 w-5" />;
  if (tone === "achievement") return <Award className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}

function AchievementModal({
  achievement,
  onClose,
  onContinue,
}: {
  achievement: QueuedAchievement | null;
  onClose: () => void;
  onContinue: () => void;
}) {
  const isLeague = achievement?.kind === "league" && Boolean(achievement.league);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          key={achievement.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[13000] flex items-center justify-center bg-slate-950/48 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-title"
        >
          <Confetti key={achievement.id} />
          <motion.section
            initial={{ opacity: 0, y: 34, scale: 0.88, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 230, damping: 22 }}
            className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_40px_110px_-38px_rgba(37,99,235,0.72)]"
          >
            <div className="h-2 bg-gradient-to-r from-blue-600 via-cyan-400 to-orange-400" />
            <button
              type="button"
              onClick={isLeague ? onContinue : onClose}
              aria-label="Fechar conquista"
              className="absolute right-4 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-500 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-950"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#fff7ed_100%)] px-6 pb-7 pt-8 text-center sm:px-8">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
                Nova conquista
              </p>
              <motion.div
                initial={{ scale: 0.65, rotate: -12 }}
                animate={{ scale: [0.65, 1.12, 1], rotate: [-12, 5, 0] }}
                transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto mt-5 flex h-28 w-28 items-center justify-center"
              >
                {isLeague ? (
                  <LeagueBadge league={achievement.league!} size="xl" showLabel={false} />
                ) : (
                  <AchievementIcon
                    icon={achievement.icon}
                    iconKey={achievement.iconKey ?? achievement.id}
                    rarity={achievement.rarity ?? "UNCOMMON"}
                    category={achievement.category ?? undefined}
                    color={achievement.color}
                    title={achievement.title}
                    label={achievement.iconDescription ?? achievement.badge ?? achievement.title}
                    className="h-24 w-24"
                  />
                )}
              </motion.div>
              {achievement.badge && (
                <p className="mt-5 text-xs font-black uppercase tracking-wider text-orange-600">
                  {achievement.badge}
                </p>
              )}
              <h2
                id="achievement-title"
                className="mt-2 font-display text-3xl font-black text-slate-950"
              >
                {achievement.title}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-600">
                {achievement.message}
              </p>
              {Boolean(achievement.xp) && (
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-700"
                >
                  <Sparkles className="h-4 w-4" />
                  +{achievement.xp} XP
                </motion.span>
              )}
              <button
                type="button"
                onClick={onContinue}
                className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-sm font-black text-white shadow-[0_18px_34px_-18px_rgba(37,99,235,0.82)] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Check className="h-4 w-4" />
                {achievement.actionLabel ?? "Continuar"}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        id: index,
        left: (index * 29) % 100,
        delay: (index % 9) * 0.06,
        rotate: (index * 73) % 360,
        color: ["#2563EB", "#22D3EE", "#F97316", "#FACC15", "#22C55E", "#A855F7"][
          index % 6
        ],
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ left: `${piece.left}%`, top: "-5%", opacity: 1, rotate: 0 }}
          animate={{ top: "108%", opacity: [1, 1, 0], rotate: piece.rotate + 540 }}
          transition={{ duration: 2.7, delay: piece.delay, ease: "easeIn" }}
          className="absolute h-3 w-1.5 rounded-sm"
          style={{ backgroundColor: piece.color }}
        />
      ))}
    </div>
  );
}

function FeedbackDialog({
  dialog,
  setDialog,
}: {
  dialog: DialogState | null;
  setDialog: (value: DialogState | null) => void;
}) {
  const [value, setValue] = useState(() =>
    dialog?.kind === "prompt" ? dialog.input.initialValue ?? "" : "",
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (dialog?.kind !== "prompt") return;
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [dialog]);

  function cancel() {
    if (!dialog) return;
    if (dialog.kind === "confirm") dialog.resolve(false);
    else dialog.resolve(null);
    setDialog(null);
  }

  function accept() {
    if (!dialog) return;
    if (dialog.kind === "confirm") dialog.resolve(true);
    else {
      const normalized = value.trim();
      if (dialog.input.required && !normalized) return;
      dialog.resolve(normalized || null);
    }
    setDialog(null);
  }

  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[14000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.section
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="w-full max-w-md overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.75)]"
          >
            <div
              className={`h-1.5 ${
                dialog.input.tone === "danger"
                  ? "bg-gradient-to-r from-rose-500 to-orange-400"
                  : "bg-gradient-to-r from-blue-600 to-cyan-400"
              }`}
            />
            <div className="p-5 sm:p-6">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  dialog.input.tone === "danger"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {dialog.input.tone === "danger" ? (
                  <CircleAlert className="h-5 w-5" />
                ) : (
                  <Info className="h-5 w-5" />
                )}
              </span>
              <h2 className="mt-4 text-xl font-black text-slate-950">{dialog.input.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {dialog.input.message}
              </p>
              {dialog.kind === "prompt" && (
                <textarea
                  ref={inputRef}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={dialog.input.placeholder}
                  rows={4}
                  className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              )}
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  {dialog.input.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  type="button"
                  onClick={accept}
                  disabled={dialog.kind === "prompt" && dialog.input.required && !value.trim()}
                  className={`min-h-11 rounded-2xl px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                    dialog.input.tone === "danger"
                      ? "bg-gradient-to-r from-rose-600 to-orange-500"
                      : "bg-gradient-to-r from-blue-600 to-cyan-500"
                  }`}
                >
                  {dialog.input.confirmLabel ?? "Confirmar"}
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback precisa ser usado dentro de FeedbackProvider.");
  }
  return context;
}
