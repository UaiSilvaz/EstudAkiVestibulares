export type LessonVideoSource = {
  kind: "native" | "youtube" | "vimeo" | "loom" | "google-drive" | "embed";
  playbackUrl: string;
  originalUrl: string;
  providerLabel: string;
};

const NATIVE_VIDEO_EXTENSION = /\.(?:mp4|webm|ogg|ogv|m4v|mov)(?:$|[?#])/i;
const SAFE_VIDEO_ID = /^[a-zA-Z0-9_-]{6,}$/;

function youtubeId(url: URL) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
  if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) return null;
  if (url.pathname === "/watch") return url.searchParams.get("v");
  const parts = url.pathname.split("/").filter(Boolean);
  if (["embed", "shorts", "live"].includes(parts[0] ?? "")) return parts[1] ?? null;
  return null;
}

function vimeoId(url: URL) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!host.endsWith("vimeo.com")) return null;
  return url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part)) ?? null;
}

export function isValidLessonVideoUrl(value: string) {
  const source = value.trim();
  if (!source) return true;
  if (source.startsWith("/") && !source.startsWith("//")) return true;
  try {
    const url = new URL(source);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function resolveLessonVideoSource(value: string | null | undefined): LessonVideoSource | null {
  const source = value?.trim();
  if (!source || !isValidLessonVideoUrl(source)) return null;

  if (source.startsWith("/")) {
    return { kind: "native", playbackUrl: source, originalUrl: source, providerLabel: "Vídeo local" };
  }

  const url = new URL(source);
  const youtubeVideoId = youtubeId(url);
  if (youtubeVideoId && SAFE_VIDEO_ID.test(youtubeVideoId)) {
    return {
      kind: "youtube",
      playbackUrl: `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0&modestbranding=1&playsinline=1`,
      originalUrl: source,
      providerLabel: "YouTube",
    };
  }

  const vimeoVideoId = vimeoId(url);
  if (vimeoVideoId) {
    return {
      kind: "vimeo",
      playbackUrl: `https://player.vimeo.com/video/${vimeoVideoId}?dnt=1`,
      originalUrl: source,
      providerLabel: "Vimeo",
    };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "loom.com" && parts[0] === "share" && parts[1]) {
    return {
      kind: "loom",
      playbackUrl: `https://www.loom.com/embed/${parts[1]}`,
      originalUrl: source,
      providerLabel: "Loom",
    };
  }

  if (host === "drive.google.com" && parts[0] === "file" && parts[1] === "d" && parts[2]) {
    return {
      kind: "google-drive",
      playbackUrl: `https://drive.google.com/file/d/${parts[2]}/preview`,
      originalUrl: source,
      providerLabel: "Google Drive",
    };
  }

  if (NATIVE_VIDEO_EXTENSION.test(url.pathname)) {
    return { kind: "native", playbackUrl: source, originalUrl: source, providerLabel: "Arquivo de vídeo" };
  }

  return {
    kind: "embed",
    playbackUrl: source,
    originalUrl: source,
    providerLabel: "Provedor externo",
  };
}

export function videoUrlWithStart(source: LessonVideoSource, seconds: number) {
  const start = Math.max(0, Math.floor(seconds));
  if (!start || source.kind === "native") return source.playbackUrl;
  const url = new URL(source.playbackUrl);
  if (source.kind === "youtube") url.searchParams.set("start", String(start));
  if (source.kind === "vimeo") url.hash = `t=${start}s`;
  return url.toString();
}
