-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "StaffRegistration" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "fullName" TEXT NOT NULL,
    "officerId" TEXT,
    "designation" TEXT,
    "state" TEXT,
    "district" TEXT,
    "house" TEXT,
    "constituency" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffRegistration_status_createdAt_idx" ON "StaffRegistration"("status", "createdAt");