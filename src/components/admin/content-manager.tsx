"use client";

import { FileText, FileUp, LinkIcon, PlayCircle, Tag } from "lucide-react";
import { useState } from "react";

type Option = { id: string; name: string };
type Material = {
  id: string;
  title: string;
  category: string;
  premium: boolean;
  priceCents: number;
  purchaseUrl: string | null;
  fileUrl: string | null;
  subject: { name: string } | null;
};
type Video = {
  id: string;
  title: string;
  kind: string;
  durationSeconds: number;
  subject: { name: string } | null;
};

function formatPrice(cents: number) {
  if (!cents) return "Gratis";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function ContentManager({
  subjects,
  materials,
  videos,
}: {
  subjects: Option[];
  materials: Material[];
  videos: Video[];
}) {
  const [material, setMaterial] = useState({
    title: "",
    subjectId: subjects[0]?.id ?? "",
    type: "PDF",
    category: "Apostilas",
    description: "",
    price: "",
    purchaseUrl: "",
    premium: false,
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [video, setVideo] = useState({
    title: "",
    subjectId: subjects[0]?.id ?? "",
    kind: "EXPRESS",
    description: "",
    durationSeconds: 90,
    videoUrl: "",
  });
  const [message, setMessage] = useState("");

  async function saveMaterial() {
    const formData = new FormData();
    formData.set("title", material.title);
    formData.set("subjectId", material.subjectId);
    formData.set("type", material.type);
    formData.set("category", material.category);
    formData.set("description", material.description);
    formData.set("price", material.price);
    formData.set("purchaseUrl", material.purchaseUrl);
    formData.set(
      "premium",
      String(material.premium || Number(material.price.replace(",", ".")) > 0),
    );

    if (pdfFile) {
      formData.set("file", pdfFile);
    }

    const response = await fetch("/api/admin/materials", {
      method: "POST",
      body: formData,
    });

    setMessage(response.ok ? "Material salvo." : "Erro ao salvar material.");
  }

  async function saveVideo() {
    const response = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(video),
    });
    setMessage(response.ok ? "Video salvo." : "Erro ao salvar video.");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="estudaki-card rounded-[30px] p-6">
        <h2 className="mb-5 text-2xl font-black text-slate-950">Cadastrar material</h2>
        <div className="grid gap-4">
          <input
            className="estudaki-input"
            placeholder="Titulo do material"
            value={material.title}
            onChange={(event) => setMaterial({ ...material, title: event.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <select
              className="estudaki-input"
              value={material.subjectId}
              onChange={(event) => setMaterial({ ...material, subjectId: event.target.value })}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <select
              className="estudaki-input"
              value={material.type}
              onChange={(event) => setMaterial({ ...material, type: event.target.value })}
            >
              <option value="PDF">PDF</option>
              <option value="SUMMARY">Resumo</option>
              <option value="MINDMAP">Mapa mental</option>
              <option value="SLIDES">Slides</option>
              <option value="SHEET">Apostila</option>
            </select>
          </div>

          <input
            className="estudaki-input"
            placeholder="Categoria"
            value={material.category}
            onChange={(event) => setMaterial({ ...material, category: event.target.value })}
          />

          <textarea
            className="estudaki-input min-h-28"
            placeholder="Descricao"
            value={material.description}
            onChange={(event) => setMaterial({ ...material, description: event.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                <Tag className="h-4 w-4 text-blue-600" />
                Preco
              </span>
              <input
                className="estudaki-input"
                placeholder="Ex: 29,90"
                value={material.price}
                onChange={(event) => setMaterial({ ...material, price: event.target.value })}
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                <LinkIcon className="h-4 w-4 text-blue-600" />
                Link Hotmart
              </span>
              <input
                className="estudaki-input"
                placeholder="https://pay.hotmart.com/..."
                value={material.purchaseUrl}
                onChange={(event) =>
                  setMaterial({ ...material, purchaseUrl: event.target.value })
                }
              />
            </label>
          </div>

          <label className="block rounded-[24px] border border-dashed border-blue-200 bg-blue-50/70 p-5">
            <span className="mb-3 flex items-center gap-2 text-sm font-black text-blue-800">
              <FileText className="h-4 w-4" />
              Upload do PDF
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="block w-full text-sm font-semibold text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-bold file:text-white"
              onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
            />
            <p className="mt-3 text-xs font-semibold text-blue-700">
              {pdfFile
                ? `Selecionado: ${pdfFile.name}`
                : "O arquivo sera salvo em public/uploads/materials."}
            </p>
          </label>

          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={material.premium}
              onChange={(event) => setMaterial({ ...material, premium: event.target.checked })}
            />
            Material pago/premium
          </label>

          <button
            type="button"
            onClick={saveMaterial}
            className="estudaki-button estudaki-button-primary"
          >
            <FileUp className="h-4 w-4" />
            Salvar material
          </button>
        </div>
      </section>

      <section className="estudaki-card rounded-[30px] p-6">
        <h2 className="mb-5 text-2xl font-black text-slate-950">Videoaula / Express</h2>
        <div className="grid gap-4">
          <input
            className="estudaki-input"
            placeholder="Titulo do video"
            value={video.title}
            onChange={(event) => setVideo({ ...video, title: event.target.value })}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <select
              className="estudaki-input"
              value={video.subjectId}
              onChange={(event) => setVideo({ ...video, subjectId: event.target.value })}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <select
              className="estudaki-input"
              value={video.kind}
              onChange={(event) => setVideo({ ...video, kind: event.target.value })}
            >
              <option value="EXPRESS">Express</option>
              <option value="LESSON">Videoaula</option>
              <option value="RESOLUTION">Resolucao</option>
            </select>
          </div>
          <textarea
            className="estudaki-input min-h-28"
            placeholder="Descricao"
            value={video.description}
            onChange={(event) => setVideo({ ...video, description: event.target.value })}
          />
          <div className="grid gap-4 md:grid-cols-[120px_1fr]">
            <input
              className="estudaki-input"
              type="number"
              value={video.durationSeconds}
              onChange={(event) =>
                setVideo({ ...video, durationSeconds: Number(event.target.value) })
              }
            />
            <input
              className="estudaki-input"
              placeholder="URL do video"
              value={video.videoUrl}
              onChange={(event) => setVideo({ ...video, videoUrl: event.target.value })}
            />
          </div>
          <button
            type="button"
            onClick={saveVideo}
            className="estudaki-button estudaki-button-primary"
          >
            <PlayCircle className="h-4 w-4" />
            Salvar video
          </button>
        </div>
      </section>

      {message && (
        <div className="xl:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
          {message}
        </div>
      )}

      <section className="estudaki-card rounded-[30px] p-6">
        <h2 className="mb-4 text-xl font-black text-slate-950">Materiais recentes</h2>
        <div className="space-y-3">
          {materials.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white p-4">
              <p className="font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {item.subject?.name ?? "Geral"} · {item.category} · {formatPrice(item.priceCents)}
                {item.fileUrl ? " · PDF" : ""}
                {item.purchaseUrl ? " · Hotmart" : ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="estudaki-card rounded-[30px] p-6">
        <h2 className="mb-4 text-xl font-black text-slate-950">Videos recentes</h2>
        <div className="space-y-3">
          {videos.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white p-4">
              <p className="font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {item.subject?.name ?? "Geral"} · {item.kind} · {item.durationSeconds}s
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
