-- Presença e controle de contas
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "leftAt" TIMESTAMP(3);

-- Diário do perito
CREATE TABLE "CaseNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseNote_pkey" PRIMARY KEY ("id")
);

-- Biblioteca do Watson
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "appliesTo" TEXT NOT NULL DEFAULT '',
    "source" TEXT,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- Importações de ferramentas
CREATE TABLE "ToolImport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "evidenceId" TEXT,
    "toolId" TEXT,
    "analysisId" TEXT,
    "source" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "summary" TEXT,
    "importedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportedItem" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "evidenceId" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "size" TEXT,
    "md5" TEXT,
    "sha1" TEXT,
    "sha256" TEXT,
    "mime" TEXT,
    "modifiedAt" TIMESTAMP(3),
    "accessedAt" TIMESTAMP(3),
    "bornAt" TIMESTAMP(3),
    "extra" TEXT,

    CONSTRAINT "ImportedItem_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX "CaseNote_caseId_createdAt_idx" ON "CaseNote"("caseId", "createdAt");
CREATE UNIQUE INDEX "KnowledgeEntry_slug_key" ON "KnowledgeEntry"("slug");
CREATE INDEX "KnowledgeEntry_category_idx" ON "KnowledgeEntry"("category");
CREATE INDEX "ToolImport_caseId_createdAt_idx" ON "ToolImport"("caseId", "createdAt");
CREATE INDEX "ImportedItem_importId_idx" ON "ImportedItem"("importId");
CREATE INDEX "ImportedItem_caseId_idx" ON "ImportedItem"("caseId");
CREATE INDEX "ImportedItem_md5_idx" ON "ImportedItem"("md5");
CREATE INDEX "ImportedItem_sha1_idx" ON "ImportedItem"("sha1");
CREATE INDEX "ImportedItem_sha256_idx" ON "ImportedItem"("sha256");

-- Chaves estrangeiras
ALTER TABLE "CaseNote" ADD CONSTRAINT "CaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseNote" ADD CONSTRAINT "CaseNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ToolImport" ADD CONSTRAINT "ToolImport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToolImport" ADD CONSTRAINT "ToolImport_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ToolImport" ADD CONSTRAINT "ToolImport_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ToolImport" ADD CONSTRAINT "ToolImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportedItem" ADD CONSTRAINT "ImportedItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ToolImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedItem" ADD CONSTRAINT "ImportedItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedItem" ADD CONSTRAINT "ImportedItem_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
