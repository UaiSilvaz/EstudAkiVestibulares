"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const ROUTE_TRANSITION_EVENT = "estudaki:route-transition-start";

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function isSameRoute(url: URL) {
  return url.pathname === window.location.pathname && url.search === window.location.search;
}

function shouldTrackAnchor(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || isModifiedClick(event)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.dataset.noRouteIndicator === "true") return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (isSameRoute(url)) return false;

  return true;
}

export function announceRouteTransition(href: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ROUTE_TRANSITION_EVENT, { detail: { href } }));
}

export function RouteTransitionIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const search = useMemo(() => searchParams.toString(), [searchParams]);
  const routeKey = useMemo(() => `${pathname}?${search}`, [pathname, search]);
  const routeKeyRef = useRef(routeKey);

  useEffect(() => {
    function start() {
      setPending(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setPending(false), 4500);
    }

    function onDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldTrackAnchor(anchor, event)) return;
      start();
    }

    window.addEventListener(ROUTE_TRANSITION_EVENT, start);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener(ROUTE_TRANSITION_EVENT, start);
      document.removeEventListener("click", onDocumentClick, true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (routeKeyRef.current === routeKey) return;
    routeKeyRef.current = routeKey;
    const frame = window.requestAnimationFrame(() => {
      setPending(false);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [routeKey]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-1"
    >
      <div
        className={`h-full origin-left bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#F97316] shadow-[0_0_18px_rgba(37,99,235,0.38)] transition-opacity duration-150 ${
          pending ? "estudaki-route-progress opacity-100" : "scale-x-0 opacity-0"
        }`}
      />
      <span className="sr-only">{pending ? "Carregando nova pagina" : ""}</span>
    </div>
  );
}
