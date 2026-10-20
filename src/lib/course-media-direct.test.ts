import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { prepareDirectUpload, completeDirectUpload, readUploadReceipt, signUploadReceipt } from "./course-media-direct";

test("upload receipt rejects tampering, another teacher and expired grants", () => {
  const upload = { userId: "teacher-a", fileName: "lesson-video-test.mp4", kind: "lesson-video", name: "Aula", size: 12, contentType: "video/mp4", expiresAt: Date.now() + 60_000 };
  const receipt = signUploadReceipt(upload);
  assert.equal(readUploadReceipt(receipt, "teacher-a").fileName, upload.fileName);
  assert.throws(() => readUploadReceipt(receipt, "teacher-b"));
  assert.throws(() => readUploadReceipt(`x${receipt}`, "teacher-a"));
  assert.throws(() => readUploadReceipt(signUploadReceipt({ ...upload, expiresAt: 0 }), "teacher-a"));
});

test("direct uploads validate provider path, actual size, cover dimensions and PDF signature", async () => {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://fixture.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-only";
  let bytes = await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#ffffff" } }).png().toBuffer();
  globalThis.fetch = async (input, init) => {
    assert.ok(String(input).startsWith("https://fixture.supabase.co/storage/v1/"));
    if (init?.method === "POST") return Response.json({ url: "/object/upload/sign/course-media/fixture?token=fake" });
    if (init?.method === "HEAD") return new Response(null, { headers: { "content-length": String(bytes.length) } });
    return new Response(new Uint8Array(bytes));
  };
  try {
    const prepared = await prepareDirectUpload("teacher-a", { kind: "course-cover", name: "Capa.png", size: bytes.length, contentType: "image/png" });
    assert.ok(prepared?.signedUrl.startsWith("https://fixture.supabase.co/storage/v1/object/upload/sign/"));
    assert.ok((await completeDirectUpload("teacher-a", prepared!.receipt)).url.startsWith("/api/course-media/course-cover-"));
    await assert.rejects(completeDirectUpload("teacher-b", prepared!.receipt));
    bytes = Buffer.from("%PDF-1.7\nfixture");
    const pdf = await prepareDirectUpload("teacher-a", { kind: "lesson-pdf", name: "Aula.pdf", size: bytes.length, contentType: "application/pdf" });
    assert.ok((await completeDirectUpload("teacher-a", pdf!.receipt)).url.endsWith(".pdf"));
    bytes = Buffer.from("invalid content");
    const invalid = await prepareDirectUpload("teacher-a", { kind: "lesson-pdf", name: "Aula.pdf", size: bytes.length, contentType: "application/pdf" });
    await assert.rejects(completeDirectUpload("teacher-a", invalid!.receipt));
    await assert.rejects(prepareDirectUpload("teacher-a", { kind: "lesson-video", name: "Aula.mp4", size: 600 * 1024 * 1024, contentType: "video/mp4" }));
    await assert.rejects(prepareDirectUpload("teacher-a", { kind: "course-cover", name: "Capa.svg", size: 20, contentType: "image/svg+xml" }));
  } finally {
    globalThis.fetch = originalFetch;
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
  }
});
