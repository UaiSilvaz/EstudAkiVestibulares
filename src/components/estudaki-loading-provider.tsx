"use client";

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
import { EstudakiIntro } from "@/components/landing/estudaki-intro";
import type { RouteLoadingMeta } from "@/lib/route-loading";

type LoadingContextValue = {
  beginLoading: (meta?: string | Partial<RouteLoadingMeta>) => () => void;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);
const defaultMeta: RouteLoadingMeta = {
  label: "Carregando Silva Educacional",
  from: "#2563EB",
  to: "#22D3EE",
  accent: "#FACC15",
};

function normalizeMeta(meta?: string | Partial<RouteLoadingMeta>): RouteLoadingMeta {
  if (typeof meta === "string") return { ...defaultMeta, label: meta };
  return { ...defaultMeta, ...meta };
}

export function EstudakiLoadingProvider({ children }: { children: ReactNode }) {
  const sources = useRef(new Map<symbol, RouteLoadingMeta>());
  const [overlay, setOverlay] = useState({
    visible: true,
    introductory: true,
    pending: false,
    meta: defaultMeta,
  });

  const beginLoading = useCallback((metaInput?: string | Partial<RouteLoadingMeta>) => {
    const meta = normalizeMeta(metaInput);
    const id = Symbol(meta.label);
    sources.current.set(id, meta);
    setOverlay((current) => ({ ...current, visible: true, pending: true, meta }));

    return () => {
      if (!sources.current.delete(id)) return;
      const remainingMetas = [...sources.current.values()];
      setOverlay((current) => ({
        ...current,
        pending: remainingMetas.length > 0,
        meta: remainingMetas.at(-1) ?? current.meta,
      }));
    };
  }, []);

  const complete = useCallback(() => {
    // A new Suspense boundary can mount while the preceding transition exits.
    if (sources.current.size > 0) return false;
    setOverlay((current) => ({ ...current, visible: false, introductory: false }));
    return true;
  }, []);

  const context = useMemo(() => ({ beginLoading }), [beginLoading]);

  return (
    <LoadingContext.Provider value={context}>
      {children}
      {overlay.visible ? (
        <EstudakiIntro
          introductory={overlay.introductory}
          pending={overlay.pending}
          label={overlay.meta.label}
          from={overlay.meta.from}
          to={overlay.meta.to}
          accent={overlay.meta.accent}
          onComplete={complete}
        />
      ) : null}
    </LoadingContext.Provider>
  );
}

export function useEstudakiLoading() {
  const context = useContext(LoadingContext);
  if (!context) throw new Error("EstudakiLoadingProvider must wrap loading states.");
  return context;
}

/** Registers a pending screen without restarting the shared introduction. */
export function EstudakiLoadingState({ label = defaultMeta.label }: { label?: string }) {
  const { beginLoading } = useEstudakiLoading();

  useEffect(() => beginLoading(label), [beginLoading, label]);

  return <span className="sr-only" role="status">{label}</span>;
}
