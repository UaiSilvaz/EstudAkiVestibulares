"use client";

import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type ExistingImage = {
  url: string;
  altText?: string;
};

type Props = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingImages?: ExistingImage[];
  onRemoveExisting?: (url: string) => void;
  label: string;
  description?: string;
  multiple?: boolean;
  compact?: boolean;
};

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function imageExtension(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/svg+xml") return "svg";
  return type.split("/")[1] || "png";
}

function uniqueFiles(files: File[]) {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function droppedImageUrl(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) return null;
  const html = dataTransfer.getData("text/html");
  const htmlSource = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  const uri = dataTransfer.getData("text/uri-list").split(/\r?\n/).find((line) => line && !line.startsWith("#"));
  const plain = dataTransfer.getData("text/plain").trim();
  const candidate = htmlSource || uri || plain;
  return candidate && /^(https?:|data:image\/)/i.test(candidate) ? candidate : null;
}

async function imageFileFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível buscar a imagem arrastada.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("O item arrastado não é uma imagem.");
  return new File(
    [blob],
    `imagem-arrastada-${Date.now()}.${imageExtension(blob.type)}`,
    { type: blob.type, lastModified: Date.now() },
  );
}

export function ImageDropZone({
  files,
  onFilesChange,
  existingImages = [],
  onRemoveExisting,
  label,
  description,
  multiple = false,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrls = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => previewUrls.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  async function addImages(nextFiles: File[], fallbackUrl?: string | null) {
    setError(null);
    setProcessing(true);
    try {
      let incoming = nextFiles.filter(
        (file) => ACCEPTED_IMAGE_TYPES.has(file.type) || file.type.startsWith("image/"),
      );
      if (!incoming.length && fallbackUrl) {
        incoming = [await imageFileFromUrl(fallbackUrl)];
      }
      if (!incoming.length) {
        throw new Error("Cole ou arraste um arquivo de imagem válido.");
      }
      onFilesChange(multiple ? uniqueFiles([...files, ...incoming]) : [incoming[incoming.length - 1]]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível ler a imagem.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <div
        tabIndex={0}
        aria-label={label}
        onClick={(event) => event.currentTarget.focus()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onPaste={(event) => {
          const clipboardFiles = Array.from(event.clipboardData.files);
          const fallbackUrl = droppedImageUrl(event.clipboardData);
          if (clipboardFiles.length || fallbackUrl) {
            event.preventDefault();
            void addImages(clipboardFiles, fallbackUrl);
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addImages(Array.from(event.dataTransfer.files), droppedImageUrl(event.dataTransfer));
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed text-center outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 ${
          dragging
            ? "border-blue-500 bg-blue-100"
            : "border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50"
        } ${compact ? "p-3" : "p-5"}`}
      >
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          multiple={multiple}
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={(event) => {
            void addImages(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <div className="flex items-center justify-center gap-2 text-blue-700">
          {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-sm font-black">{label}</span>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {description ?? "Clique nesta área e cole com Ctrl+V, ou arraste uma imagem."}
        </p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-2 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-black text-blue-700"
        >
          Selecionar arquivo
        </button>
      </div>

      {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}

      {(existingImages.length > 0 || previewUrls.length > 0) && (
        <div className={`mt-3 grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {existingImages.map((image, index) => (
            <figure key={image.url} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.altText || `Imagem existente ${index + 1}`}
                className="h-32 w-full object-contain"
              />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveExisting(image.url);
                  }}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow"
                  aria-label={`Remover imagem existente ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </figure>
          ))}
          {previewUrls.map(({ file, url }, index) => (
            <figure key={url} className="relative overflow-hidden rounded-xl border border-blue-200 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Nova imagem ${index + 1}`} className="h-32 w-full object-contain" />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onFilesChange(files.filter((candidate) => candidate !== file));
                }}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow"
                aria-label={`Descartar nova imagem ${index + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
              <figcaption className="mt-1 truncate px-1 text-[10px] font-semibold text-slate-500">
                {file.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
