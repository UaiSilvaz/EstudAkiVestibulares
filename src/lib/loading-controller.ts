import { routeLoadingMeta, type RouteLoadingMeta } from "./route-loading";

export const LOADING_TIMING = { delay: 160, exit: 250 };
type Snapshot = { phase: "hidden" | "visible" | "leaving"; meta: RouteLoadingMeta; cycle: number };
type Source = { meta: RouteLoadingMeta; priority: number };

/** Stay visible until every active navigation and route boundary has finished. */
export function createLoadingController() {
  const idle: Snapshot = { phase: "hidden", meta: routeLoadingMeta("/"), cycle: 0 };
  let snapshot = idle;
  const listeners = new Set<() => void>();
  const sources = new Map<symbol, Source>();
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  let visualPriority = -1;
  function publish(next: Snapshot) { snapshot = next; listeners.forEach(listener => listener()); }
  function scheduleExit() {
    clearTimeout(exitTimer);
    publish({ ...snapshot, phase: "leaving" });
    exitTimer = setTimeout(() => {
      exitTimer = undefined;
      visualPriority = -1;
      publish({ ...snapshot, phase: "hidden" });
    }, LOADING_TIMING.exit);
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => idle,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    begin(meta: RouteLoadingMeta, priority = 0) {
      const wasIdle = sources.size === 0;
      const id = Symbol();
      sources.set(id, { meta, priority });
      if (snapshot.phase === "leaving") {
        clearTimeout(exitTimer);
        exitTimer = undefined;
        visualPriority = priority;
        publish({ ...snapshot, phase: "visible", meta });
      }
      if (snapshot.phase === "visible") {
        if (priority > visualPriority || (priority === 2 && visualPriority === 2)) {
          visualPriority = priority;
          publish({ ...snapshot, meta });
        }
      } else if (snapshot.phase === "hidden" && wasIdle && !showTimer) {
        showTimer = setTimeout(() => {
          showTimer = undefined;
          const source = [...sources.values()].reduce<Source | undefined>((best, item) => !best || item.priority >= best.priority ? item : best, undefined);
          if (!source) return;
          visualPriority = source.priority;
          publish({ phase: "visible", meta: source.meta, cycle: snapshot.cycle + 1 });
        }, LOADING_TIMING.delay);
      }
      return () => {
        if (!sources.delete(id)) return;
        if (!sources.size && snapshot.phase === "hidden") { clearTimeout(showTimer); showTimer = undefined; }
        if (!sources.size && snapshot.phase === "visible") scheduleExit();
      };
    },
    dispose() {
      clearTimeout(showTimer); clearTimeout(exitTimer);
      showTimer = undefined; exitTimer = undefined; sources.clear(); visualPriority = -1; publish(idle);
    },
  };
}
