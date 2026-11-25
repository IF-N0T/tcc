CREATE TABLE "ReportAttachment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "description" TEXT,
    "fileData" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportAttachment_caseId_createdAt_idx" ON "ReportAttachment"("caseId", "createdAt");

ALTER TABLE "ReportAttachment"
ADD CONSTRAINT "ReportAttachment_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportAttachment"
ADD CONSTRAINT "ReportAttachment_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
