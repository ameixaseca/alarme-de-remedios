-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "isAdHoc" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medicationId" TEXT,
ADD COLUMN     "patientId" TEXT,
ALTER COLUMN "prescriptionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
