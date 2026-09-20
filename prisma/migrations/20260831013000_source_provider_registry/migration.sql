CREATE TABLE "source_providers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "base_url" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 30,
  "config" JSONB NOT NULL DEFAULT '{}',
  "legal_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "source_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "source_providers_slug_key" ON "source_providers"("slug");
CREATE INDEX "source_providers_enabled_priority_idx" ON "source_providers"("enabled", "priority");

INSERT INTO "source_providers" (
  "id",
  "name",
  "slug",
  "base_url",
  "enabled",
  "priority",
  "rate_limit_per_minute",
  "config",
  "legal_notes",
  "updated_at"
) VALUES
  (
    'source-provider-inep',
    'INEP / ENEM',
    'inep',
    'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos',
    true,
    1,
    12,
    '{"mode":"official_inventory","inventoryPath":"data/provas/enem/INVENTARIO_OFICIAL_ENEM_2009_2025.md"}',
    'Use only gov.br and download.inep.gov.br official public files. Do not scrape private question banks.',
    CURRENT_TIMESTAMP
  ),
  (
    'source-provider-vunesp',
    'VUNESP',
    'vunesp',
    'https://www.vunesp.com.br/',
    false,
    20,
    6,
    '{}',
    'Planned provider. Enable only after official public exam discovery and answer-key validation are implemented.',
    CURRENT_TIMESTAMP
  ),
  (
    'source-provider-fgv',
    'FGV',
    'fgv',
    'https://conhecimento.fgv.br/concursos',
    false,
    30,
    6,
    '{}',
    'Planned provider. Enable only for official public PDFs and final answer keys.',
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO NOTHING;
