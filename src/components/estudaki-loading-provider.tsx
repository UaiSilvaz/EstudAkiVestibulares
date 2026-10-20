"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { EstudakiIntro } from "@/components/landing/estudaki-intro";
import { createLoadingController } from "@/lib/loading-controller";
import { routeLoadingMeta } from "@/lib/route-loading";

type LoadingController = ReturnType<typeof createLoadingController>;
const LoadingContext = createContext<LoadingController | null>(null);

export function EstudakiLoadingProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => createLoadingController());
  const overlay = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const visible = overlay.phase !== "hidden";

  useEffect(() => () => controller.dispose(), [controller]);

  return (
    <LoadingContext.Provider value={controller}>
      <MotionConfig reducedMotion="user">
      <div className="contents" inert={visible || undefined} aria-busy={visible || undefined}>
        {children}
      </div>
      {visible && <EstudakiIntro key={overlay.cycle} leaving={overlay.phase === "leaving"} {...overlay.meta} />}
      </MotionConfig>
    </LoadingContext.Provider>
  );
}

export function useEstudakiLoading() {
  const controller = useContext(LoadingContext);
  if (!controller) throw new Error("EstudakiLoadingProvider must wrap loading states.");
  return { beginLoading: controller.begin };
}

/** Nested boundaries register work; only the root provider renders a screen. */
export function EstudakiLoadingState({ label, href }: { label?: string; href?: string }) {
  const { beginLoading } = useEstudakiLoading();
  useEffect(() => {
    const meta = routeLoadingMeta(href ?? window.location.href);
    return beginLoading({ ...meta, label: label ?? meta.label }, href ? 1 : 0);
  }, [beginLoading, href, label]);
  return null;
}
