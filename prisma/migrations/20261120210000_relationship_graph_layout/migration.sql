CREATE TABLE "RelationshipNodePosition" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipNodePosition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RelationshipNodePosition_caseId_entityType_entityId_key"
ON "RelationshipNodePosition"("caseId", "entityType", "entityId");

ALTER TABLE "RelationshipNodePosition"
ADD CONSTRAINT "RelationshipNodePosition_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
