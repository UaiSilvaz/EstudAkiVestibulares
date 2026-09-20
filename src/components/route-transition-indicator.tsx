"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useEstudakiLoading } from "@/components/estudaki-loading-provider";
import { routeLoadingMeta } from "@/lib/route-loading";

const ROUTE_TRANSITION_EVENT = "estudaki:route-transition-start";

function routeKey(url: URL) {
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function routeHref(url: URL) {
  return `${url.pathname}${url.search}`;
}

function destination(href: string) {
  try {
    const url = new URL(href, window.location.href);
    if (!/^https?:$/.test(url.protocol) || url.origin !== window.location.origin) return null;
    if (routeKey(url) === routeKey(new URL(window.location.href))) return null;
    return {
      key: routeKey(url),
      href: routeHref(url),
    };
  } catch {
    return null;
  }
}

function shouldTrackAnchor(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download") || anchor.dataset.noRouteIndicator === "true") return false;
  const href = anchor.getAttribute("href");
  return Boolean(href && !href.startsWith("#") && destination(href));
}

export function announceRouteTransition(href: string) {
  if (typeof window === "undefined" || !destination(href)) return;
  window.dispatchEvent(new CustomEvent(ROUTE_TRANSITION_EVENT, { detail: { href } }));
}

export function RouteTransitionIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRoute = `${pathname}?${searchParams.toString()}`;
  const { beginLoading } = useEstudakiLoading();
  const stopRef = useRef<(() => void) | null>(null);
  const currentRouteRef = useRef(currentRoute);

  useEffect(() => {
    let pendingTarget: string | null = null;
    let release: (() => void) | null = null;
    let delay: number | undefined;
    let timeout: number | undefined;

    function stop() {
      window.clearTimeout(delay);
      window.clearTimeout(timeout);
      release?.();
      release = null;
      pendingTarget = null;
    }
    stopRef.current = stop;

    function start(target: { key: string; href: string }) {
      if (pendingTarget === target.key) return;
      pendingTarget = target.key;
      window.clearTimeout(delay);
      window.clearTimeout(timeout);
      if (!release) {
        delay = window.setTimeout(() => {
          release = beginLoading(routeLoadingMeta(target.href));
        }, 100);
      }
      timeout = window.setTimeout(stop, 15000);
    }

    function onAnnouncement(event: Event) {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href;
      const target = typeof href === "string" ? destination(href) : null;
      if (target) start(target);
    }

    function onDocumentClick(event: MouseEvent) {
      const element = event.target;
      if (!(element instanceof Element)) return;
      const anchor = element.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || !shouldTrackAnchor(anchor, event)) return;
      const target = destination(anchor.href);
      if (target) start(target);
    }

    function onPopState() {
      const url = new URL(window.location.href);
      const target = { key: routeKey(url), href: routeHref(url) };
      if (target.key !== currentRouteRef.current) start(target);
    }

    window.addEventListener(ROUTE_TRANSITION_EVENT, onAnnouncement);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", stop);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      stop();
      stopRef.current = null;
      window.removeEventListener(ROUTE_TRANSITION_EVENT, onAnnouncement);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", stop);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [beginLoading]);

  useEffect(() => {
    if (currentRouteRef.current === currentRoute) return;
    currentRouteRef.current = currentRoute;
    stopRef.current?.();
  }, [currentRoute]);

  return null;
}

