-- CreateEnum
CREATE TYPE "ProvaAntigaStatus" AS ENUM ('DISPONIVEL', 'EM_PROCESSAMENTO', 'PENDENTE', 'COM_ERRO');

-- CreateTable
CREATE TABLE "provas_antigas" (
    "id" TEXT NOT NULL,
    "vestibular" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fase" TEXT NOT NULL,
    "dia" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'OFICIAL',
    "arquivo_prova_url" TEXT NOT NULL,
    "arquivo_gabarito_url" TEXT,
    "arquivo_prova_path" TEXT NOT NULL,
    "arquivo_gabarito_path" TEXT,
    "fonte_oficial" TEXT NOT NULL,
    "fonte_url" TEXT NOT NULL,
    "total_questoes" INTEGER,
    "status" "ProvaAntigaStatus" NOT NULL DEFAULT 'PENDENTE',
    "importacao_status" TEXT NOT NULL DEFAULT 'NAO_INICIADA',
    "importacao_relatorio" TEXT,
    "questoes_detectadas" INTEGER NOT NULL DEFAULT 0,
    "questoes_validas" INTEGER NOT NULL DEFAULT 0,
    "questoes_com_erro" INTEGER NOT NULL DEFAULT 0,
    "imagens_detectadas" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provas_antigas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prova_antiga_questoes" (
    "id" TEXT NOT NULL,
    "prova_antiga_id" TEXT NOT NULL,
    "questao_id" TEXT NOT NULL,
    "numero_questao" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "pagina_pdf" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prova_antiga_questoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provas_antigas_slug_key" ON "provas_antigas"("slug");
CREATE INDEX "provas_antigas_vestibular_ano_idx" ON "provas_antigas"("vestibular", "ano");
CREATE INDEX "provas_antigas_status_idx" ON "provas_antigas"("status");
CREATE UNIQUE INDEX "prova_antiga_questoes_prova_antiga_id_questao_id_key" ON "prova_antiga_questoes"("prova_antiga_id", "questao_id");
CREATE UNIQUE INDEX "prova_antiga_questoes_prova_antiga_id_numero_questao_key" ON "prova_antiga_questoes"("prova_antiga_id", "numero_questao");
CREATE INDEX "prova_antiga_questoes_questao_id_idx" ON "prova_antiga_questoes"("questao_id");

-- AddForeignKey
ALTER TABLE "prova_antiga_questoes" ADD CONSTRAINT "prova_antiga_questoes_prova_antiga_id_fkey" FOREIGN KEY ("prova_antiga_id") REFERENCES "provas_antigas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prova_antiga_questoes" ADD CONSTRAINT "prova_antiga_questoes_questao_id_fkey" FOREIGN KEY ("questao_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
