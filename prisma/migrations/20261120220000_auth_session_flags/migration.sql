ALTER TABLE "User"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "mustChangePassword" = true,
    "sessionVersion" = "sessionVersion" + 1
WHERE lower("email") IN (
  'admin@sherlock.local',
  'victor@sherlock.local',
  'perito@sherlock.local',
  'visualizador@sherlock.local'
);
