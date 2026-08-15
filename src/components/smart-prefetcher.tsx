"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function normalizeHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("#")) return null;
  return href;
}

export function SmartPrefetcher({ hrefs, delay = 650 }: { hrefs: string[]; delay?: number }) {
  const router = useRouter();

  useEffect(() => {
    const uniqueHrefs = Array.from(new Set(hrefs.map(normalizeHref).filter(Boolean))) as string[];
    if (uniqueHrefs.length === 0) return;

    const run = () => {
      uniqueHrefs.forEach((href) => router.prefetch(href));
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(run, { timeout: 1800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(run, delay);
    return () => clearTimeout(timeoutId);
  }, [delay, hrefs, router]);

  return null;
}
