import { prisma } from "@/lib/prisma";
import { calcSuggestedTimes } from "@/lib/schedule";
import { PrescriptionStatus } from "@prisma/client";

async function assertPrescriptionAccess(prescriptionId: string, userId: string) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { patient: true },
  });
  if (!prescription) throw new Error("Prescription not found");
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: prescription.patient.groupId } },
  });
  if (!member) throw new Error("Access denied");
  return prescription;
}

export async function listPrescriptions(userId: string, patientId?: string, status?: PrescriptionStatus) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);

  return prisma.prescription.findMany({
    where: {
      patient: { groupId: { in: groupIds } },
      ...(patientId && { patientId }),
      ...(status && { status }),
    },
    include: {
      patient: { select: { id: true, name: true, species: true } },
      medication: { select: { id: true, name: true, doseUnit: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPrescription(
  userId: string,
  data: {
    patientId: string;
    medicationId: string;
    doseQuantity: number;
    doseFraction?: string;
    doseUnit: string;
    frequencyHours: number;
    durationDays?: number;
    startDate?: string;
    scheduleTimes?: string[];
  }
) {
  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
  if (!patient) throw new Error("Patient not found");

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: patient.groupId } },
  });
  if (!member) throw new Error("Access denied");

  const medication = await prisma.medication.findUnique({ where: { id: data.medicationId } });
  if (!medication || medication.groupId !== patient.groupId) throw new Error("Medication not found in group");

  const suggestedTimes = calcSuggestedTimes(data.frequencyHours);
  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const endDate =
    data.durationDays
      ? new Date(startDate.getTime() + data.durationDays * 24 * 60 * 60 * 1000)
      : undefined;

  const prescription = await prisma.prescription.create({
    data: {
      patientId: data.patientId,
      medicationId: data.medicationId,
      doseQuantity: data.doseQuantity,
      doseFraction: data.doseFraction,
      doseUnit: data.doseUnit,
      frequencyHours: data.frequencyHours,
      scheduleTimes: data.scheduleTimes ?? suggestedTimes,
      durationDays: data.durationDays,
      startDate,
      endDate,
      createdBy: userId,
    },
    include: {
      patient: { select: { id: true, name: true } },
      medication: { select: { id: true, name: true } },
    },
  });

  return { ...prescription, suggestedTimes };
}

export async function getPrescription(prescriptionId: string, userId: string) {
  return assertPrescriptionAccess(prescriptionId, userId);
}

export async function updatePrescription(
  prescriptionId: string,
  userId: string,
  data: {
    scheduleTimes?: string[];
    status?: PrescriptionStatus;
    doseQuantity?: number;
    doseFraction?: string;
    frequencyHours?: number;
    durationDays?: number;
  }
) {
  await assertPrescriptionAccess(prescriptionId, userId);
  return prisma.prescription.update({ where: { id: prescriptionId }, data });
}

export async function deletePrescription(prescriptionId: string, userId: string) {
  await assertPrescriptionAccess(prescriptionId, userId);
  return prisma.prescription.delete({ where: { id: prescriptionId } });
}
