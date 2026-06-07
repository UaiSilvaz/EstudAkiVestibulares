import { Camera, FileText, PenLine } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

const themes = [
  "Desafios para democratizar o acesso a educacao digital no Brasil",
  "A importancia da cultura cientifica na formacao dos jovens",
  "Caminhos para combater a evasao escolar no ensino medio",
];

export default async function RedacaoPage() {
  await requireUser();

  return (
    <div>
      <PageHeader
        eyebrow="Redacao"
        title="Temas e envio de redacao"
        description="Estrutura preparada para texto digitado ou foto da redacao manuscrita, com correcao por competencia."
      />
      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="estudaki-card rounded-[30px] p-6">
          <h2 className="mb-5 text-2xl font-black text-slate-950">Temas disponiveis</h2>
          <div className="space-y-3">
            {themes.map((theme) => (
              <div key={theme} className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="font-black text-slate-950">{theme}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Texto motivador, repertorios e matriz de competencias podem ser cadastrados no CMS.
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="estudaki-card rounded-[30px] p-6">
          <h2 className="mb-5 text-2xl font-black text-slate-950">Enviar producao</h2>
          <div className="grid gap-3">
            <button className="estudaki-button estudaki-button-primary justify-start">
              <PenLine className="h-4 w-4" />
              Digitar redacao
            </button>
            <button className="estudaki-button estudaki-button-ghost justify-start">
              <Camera className="h-4 w-4" />
              Enviar foto manuscrita
            </button>
            <button className="estudaki-button estudaki-button-ghost justify-start">
              <FileText className="h-4 w-4" />
              Baixar folha oficial
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
