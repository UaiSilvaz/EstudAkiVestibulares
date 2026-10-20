"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";
import { useEstudakiLoading } from "@/components/estudaki-loading-provider";
import { routeLoadingMeta } from "@/lib/route-loading";

/** React owns the pending lifecycle, including interrupted navigations. */
export function useLoadingRouter() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const destination = useRef<string | null>(null);
  const { beginLoading } = useEstudakiLoading();

  useEffect(() => {
    if (pending && destination.current) return beginLoading(routeLoadingMeta(destination.current), 2);
  }, [pending, beginLoading]);

  const navigate = useCallback((method: "push" | "replace", ...args: Parameters<typeof router.push>) => {
    const url = new URL(args[0], window.location.href);
    destination.current = url.origin === window.location.origin &&
      `${url.pathname}${url.search}` !== `${window.location.pathname}${window.location.search}` ? args[0] : null;
    startTransition(() => router[method](...args));
  }, [router]);

  return useMemo(() => ({
    ...router,
    push: (...args: Parameters<typeof router.push>) => navigate("push", ...args),
    replace: (...args: Parameters<typeof router.replace>) => navigate("replace", ...args),
  }), [router, navigate]);
}
