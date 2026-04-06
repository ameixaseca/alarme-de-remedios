-- CreateEnum
CREATE TYPE "PrescriptionAction" AS ENUM ('create', 'update', 'delete');

-- CreateTable
CREATE TABLE "PrescriptionLog" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "action" "PrescriptionAction" NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB,

    CONSTRAINT "PrescriptionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PrescriptionLog" ADD CONSTRAINT "PrescriptionLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
