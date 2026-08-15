"use client";

import { FileText, FileUp, LinkIcon, Tag } from "lucide-react";
import { useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

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

function formatPrice(cents: number) {
  if (!cents) return "Gratis";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function ContentManager({
  subjects,
  materials,
}: {
  subjects: Option[];
  materials: Material[];
}) {
  const { notify } = useFeedback();
  const [material, setMaterial] = useState({
    title: "",
    subjectId: subjects[0]?.id ?? "",
    type: "PDF",
    category: "Apostilas",
    description: "",
    price: "",
    purchaseUrl: "",
    hotmartProductId: "",
    premium: false,
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
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
    formData.set("hotmartProductId", material.hotmartProductId);
    formData.set("premium", String(material.premium || Number(material.price.replace(",", ".")) > 0));

    if (pdfFile) {
      formData.set("file", pdfFile);
    }

    const response = await fetch("/api/admin/materials", {
      method: "POST",
      body: formData,
    });

    setMessage(response.ok ? "Material salvo." : "Erro ao salvar material.");
    if (response.ok) {
      notify({
        tone: "success",
        title: "Material salvo",
        message: pdfFile
          ? "O arquivo foi enviado e o material está disponível no painel."
          : "O cadastro do material foi concluído.",
      });
      setMaterial({
        title: "",
        subjectId: subjects[0]?.id ?? "",
        type: "PDF",
        category: "Apostilas",
        description: "",
        price: "",
        purchaseUrl: "",
        hotmartProductId: "",
        premium: false,
      });
      setPdfFile(null);
    } else {
      notify({
        tone: "error",
        title: "Material não salvo",
        message: "Revise os campos e tente novamente.",
      });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <section className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
        <h2 className="mb-5 text-2xl font-black text-slate-950">Cadastrar material</h2>
        <div className="grid gap-4">
          <input
            className="ek-input"
            placeholder="Titulo do material"
            value={material.title}
            onChange={(event) => setMaterial({ ...material, title: event.target.value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <select
              className="ek-input"
              value={material.subjectId}
              onChange={(event) => setMaterial({ ...material, subjectId: event.target.value })}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <input
              className="ek-input"
              value={material.category}
              onChange={(event) => setMaterial({ ...material, category: event.target.value })}
              placeholder="Categoria"
            />
          </div>

          <textarea
            className="ek-input min-h-28"
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
                className="ek-input"
                placeholder="Ex: 29,90"
                value={material.price}
                onChange={(event) => setMaterial({ ...material, price: event.target.value })}
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                <LinkIcon className="h-4 w-4 text-blue-600" />
                Checkout Hotmart
              </span>
              <input
                className="ek-input"
                placeholder="https://pay.hotmart.com/..."
                value={material.purchaseUrl}
                onChange={(event) => setMaterial({ ...material, purchaseUrl: event.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">
              ID do produto na Hotmart
            </span>
            <input
              className="ek-input"
              placeholder="Ex: 1234567"
              value={material.hotmartProductId}
              onChange={(event) => setMaterial({ ...material, hotmartProductId: event.target.value })}
            />
          </label>

          <label className="block rounded-[20px] border border-dashed border-blue-200 bg-blue-50/70 p-5">
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
              {pdfFile ? `Selecionado: ${pdfFile.name}` : "O arquivo sera salvo em storage privado."}
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

      <section className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
        <h2 className="mb-4 text-xl font-black text-slate-950">Materiais recentes</h2>
        <div className="space-y-3">
          {materials.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {item.subject?.name ?? "Geral"} · {item.category} · {formatPrice(item.priceCents)}
                {item.fileUrl ? " · PDF protegido" : ""}
                {item.purchaseUrl ? " · Hotmart" : ""}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-500">
          O conteúdo pago entra agora com checkout, ID de produto e PDF protegido.
        </p>
      </section>

      {message && (
        <div className="xl:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
          {message}
        </div>
      )}
    </div>
  );
}
