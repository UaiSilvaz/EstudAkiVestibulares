"use client";

import Link, { useLinkStatus, type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useEstudakiLoading } from "@/components/estudaki-loading-provider";
import { routeLoadingMeta } from "@/lib/route-loading";

type FastLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & {
    children: ReactNode;
  pendingClassName?: string;
  pendingLabel?: ReactNode;
  };

function hrefToString(href: LinkProps["href"]) {
  if (typeof href === "string") return href;
  const query = href.query ? `?${new URLSearchParams(href.query as Record<string, string>).toString()}` : "";
  return `${href.pathname ?? ""}${query}`;
}

function canPrefetch(href: string) {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("#");
}

function LinkPendingState({ href, onChange }: { href: string; onChange: (pending: boolean) => void }) {
  const { pending } = useLinkStatus();
  const { beginLoading } = useEstudakiLoading();
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) onChange(pending); });
    const url = new URL(href, window.location.href);
    const changesRoute = url.origin === window.location.origin &&
      `${url.pathname}${url.search}` !== `${window.location.pathname}${window.location.search}`;
    const release = pending && changesRoute ? beginLoading(routeLoadingMeta(href), 2) : undefined;
    return () => { active = false; release?.(); };
  }, [pending, href, onChange, beginLoading]);
  return null;
}

export function FastLink({
  href,
  children,
  className,
  onClick,
  onFocus,
  onPointerEnter,
  onTouchStart,
  pendingClassName,
  pendingLabel,
  prefetch,
  target,
  ...props
}: FastLinkProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const hrefString = hrefToString(href);

  const warmRoute = useCallback(() => {
    if (prefetch !== false && canPrefetch(hrefString)) router.prefetch(hrefString);
  }, [hrefString, prefetch, router]);

  return (
    <Link
      {...props}
      href={href}
      target={target}
      prefetch={prefetch}
      aria-busy={pending || undefined}
      data-pending={pending ? "true" : undefined}
      className={cn("touch-manipulation", className, pending && pendingClassName)}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") warmRoute();
        onPointerEnter?.(event);
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        warmRoute();
        onFocus?.(event);
      }}
      onClick={onClick}
    >
      <LinkPendingState href={hrefString} onChange={setPending} />
      {pending && pendingLabel ? pendingLabel : children}
    </Link>
  );
}
