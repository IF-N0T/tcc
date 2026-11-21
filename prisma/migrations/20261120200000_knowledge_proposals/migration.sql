CREATE TYPE "KnowledgeProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "KnowledgeProposal" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "appliesTo" TEXT NOT NULL DEFAULT '',
    "status" "KnowledgeProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "libraryEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeProposal_caseId_key" ON "KnowledgeProposal"("caseId");
CREATE UNIQUE INDEX "KnowledgeProposal_libraryEntryId_key" ON "KnowledgeProposal"("libraryEntryId");
CREATE INDEX "KnowledgeProposal_status_createdAt_idx" ON "KnowledgeProposal"("status", "createdAt");

ALTER TABLE "KnowledgeProposal" ADD CONSTRAINT "KnowledgeProposal_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeProposal" ADD CONSTRAINT "KnowledgeProposal_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeProposal" ADD CONSTRAINT "KnowledgeProposal_libraryEntryId_fkey" FOREIGN KEY ("libraryEntryId") REFERENCES "KnowledgeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
