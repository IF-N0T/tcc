CREATE TABLE "CaseVisit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "lastTab" TEXT NOT NULL DEFAULT 'overview',
    "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseVisit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaseVisit_userId_caseId_key" ON "CaseVisit"("userId", "caseId");
CREATE INDEX "CaseVisit_userId_lastVisitedAt_idx" ON "CaseVisit"("userId", "lastVisitedAt");

ALTER TABLE "CaseVisit"
ADD CONSTRAINT "CaseVisit_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseVisit"
ADD CONSTRAINT "CaseVisit_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
