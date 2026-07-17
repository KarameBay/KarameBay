-- Existing customers predate email verification and remain trusted/active.
ALTER TABLE "User" ADD COLUMN "profilePhotoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;

UPDATE "User"
SET "emailVerifiedAt" = CURRENT_TIMESTAMP
WHERE "role" = 'CUSTOMER';

CREATE TABLE "EmailVerificationChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailVerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmailVerificationChallenge_userId_key" ON "EmailVerificationChallenge"("userId");
CREATE INDEX "EmailVerificationChallenge_expiresAt_idx" ON "EmailVerificationChallenge"("expiresAt");
