"use client";

import { Camera, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AppUser } from "@/lib/roles";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ProfilePhotoManager({ user }: { user: AppUser }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const preview = previewUrl || user.avatarUrl || "";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(nextFile: File | undefined) {
    setError("");
    setMessage("");

    if (!nextFile) return;

    if (!ALLOWED_TYPES.has(nextFile.type)) {
      setError("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setError("A imagem deve ter no maximo 3 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function savePhoto() {
    if (!file) {
      setError("Escolha uma imagem antes de salvar.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Nao foi possivel salvar a foto.");
        return;
      }

      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setMessage("Foto atualizada.");
      router.refresh();
    } catch {
      setError("Nao foi possivel enviar a imagem.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Nao foi possivel remover a foto.");
        return;
      }

      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setMessage("Foto removida.");
      router.refresh();
    } catch {
      setError("Nao foi possivel remover a foto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="foto" className="relative overflow-hidden rounded-[32px] border border-blue-100/80 bg-white p-6 shadow-[0_22px_54px_-38px_rgba(15,23,42,0.28)] md:p-7">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="relative z-10 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#2563EB] via-[#22D3EE] to-[#86EFAC] text-4xl font-black text-white shadow-[0_24px_42px_-26px_rgba(37,99,235,0.7)] ring-4 ring-white lg:mx-0"
          aria-label="Alterar foto de perfil"
        >
          {preview ? (
            <span
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${preview})` }}
            />
          ) : (
            initials(user.name)
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition group-hover:bg-slate-950/30 group-hover:opacity-100">
            <Camera className="h-8 w-8" />
          </span>
        </button>

        <div className="min-w-0 text-center lg:text-left">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">
            Foto de perfil
          </p>
          <h2 className="mt-1 font-display text-3xl font-black text-[#0F172A]">
            Personalize seu avatar
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
            Use uma imagem quadrada para melhor resultado. Aceitamos JPG, PNG e WEBP de ate 3 MB.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center lg:justify-start">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-5 text-sm font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
            >
              <ImagePlus className="h-4 w-4" />
              Alterar foto
            </button>
            <button
              type="button"
              onClick={savePhoto}
              disabled={!file || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#22D3EE] px-5 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar foto"}
            </button>
            {(preview || user.avatarUrl) && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-5 text-sm font-black text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
                Remover foto
              </button>
            )}
          </div>

          {error && <p className="mt-3 text-sm font-bold text-rose-600">{error}</p>}
          {message && <p className="mt-3 text-sm font-bold text-emerald-600">{message}</p>}
        </div>
      </div>
    </section>
  );
}
