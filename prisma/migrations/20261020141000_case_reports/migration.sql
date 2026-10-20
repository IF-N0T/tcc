CREATE TABLE "CaseReport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaseReport_caseId_version_key" ON "CaseReport"("caseId", "version");
CREATE INDEX "CaseReport_caseId_createdAt_idx" ON "CaseReport"("caseId", "createdAt");

ALTER TABLE "CaseReport" ADD CONSTRAINT "CaseReport_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseReport" ADD CONSTRAINT "CaseReport_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
