import assert from "node:assert/strict";
import test from "node:test";
import { isValidLessonVideoUrl, resolveLessonVideoSource, videoUrlWithStart } from "./video-source";

test("converte links compartilháveis do YouTube em reprodução incorporada", () => {
  const source = resolveLessonVideoSource("https://www.youtube.com/watch?v=ApXoWvfEYVU&list=exemplo");
  assert.equal(source?.kind, "youtube");
  assert.equal(source?.playbackUrl, "https://www.youtube-nocookie.com/embed/ApXoWvfEYVU?rel=0&modestbranding=1&playsinline=1");
  assert.match(videoUrlWithStart(source!, 42), /start=42/);
});

test("aceita Vimeo, Loom, Google Drive e arquivos diretos", () => {
  assert.equal(resolveLessonVideoSource("https://vimeo.com/123456789")?.kind, "vimeo");
  assert.equal(resolveLessonVideoSource("https://www.loom.com/share/abc123xyz")?.kind, "loom");
  assert.equal(resolveLessonVideoSource("https://drive.google.com/file/d/arquivo123/preview")?.kind, "google-drive");
  assert.equal(resolveLessonVideoSource("https://cdn.exemplo.com/aula.mp4?token=123")?.kind, "native");
  assert.equal(resolveLessonVideoSource("/demo/aula.webm")?.kind, "native");
});

test("recusa protocolos inseguros e mantém outros provedores como incorporação", () => {
  assert.equal(isValidLessonVideoUrl("javascript:alert(1)"), false);
  assert.equal(resolveLessonVideoSource("javascript:alert(1)"), null);
  assert.equal(resolveLessonVideoSource("https://videos.exemplo.com/aula/123")?.kind, "embed");
});
