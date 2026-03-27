import { prisma } from "@/lib/prisma";
import { calcSuggestedTimes } from "@/lib/schedule";
import { PrescriptionStatus } from "@prisma/client";
import { notifyGroupMembers } from "@/services/notification.service";

async function assertPrescriptionAccess(prescriptionId: string, userId: string) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      patient: true,
      medication: { select: { id: true, name: true } },
    },
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
    startTime?: string;
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
  const startDate = (() => {
    const dateStr = data.startDate ?? new Date().toISOString().slice(0, 10);
    const timeStr = data.startTime ?? "00:00";
    return new Date(`${dateStr}T${timeStr}:00`);
  })();
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

  await prisma.prescriptionLog.create({
    data: {
      prescriptionId: prescription.id,
      patientId: prescription.patientId,
      patientName: prescription.patient.name,
      medicationId: prescription.medicationId,
      medicationName: prescription.medication.name,
      action: "create",
      performedBy: userId,
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
  const before = await assertPrescriptionAccess(prescriptionId, userId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changes: Record<string, [any, any]> = {};
  if (data.doseQuantity !== undefined && data.doseQuantity !== before.doseQuantity)
    changes.dose_quantity = [before.doseQuantity, data.doseQuantity];
  if (data.doseFraction !== undefined && data.doseFraction !== before.doseFraction)
    changes.dose_fraction = [before.doseFraction, data.doseFraction];
  if (data.frequencyHours !== undefined && data.frequencyHours !== before.frequencyHours)
    changes.frequency_hours = [before.frequencyHours, data.frequencyHours];
  if (data.durationDays !== undefined && data.durationDays !== before.durationDays)
    changes.duration_days = [before.durationDays, data.durationDays];
  if (data.status !== undefined && data.status !== before.status)
    changes.status = [before.status, data.status];
  if (data.scheduleTimes !== undefined) {
    const oldTimes = before.scheduleTimes as string[];
    if (JSON.stringify(oldTimes) !== JSON.stringify(data.scheduleTimes))
      changes.schedule_times = [oldTimes, data.scheduleTimes];
  }

  const updated = await prisma.prescription.update({ where: { id: prescriptionId }, data });

  await prisma.prescriptionLog.create({
    data: {
      prescriptionId,
      patientId: before.patientId,
      patientName: before.patient.name,
      medicationId: before.medicationId,
      medicationName: before.medication.name,
      action: "update",
      performedBy: userId,
      changes: Object.keys(changes).length > 0 ? (changes as object) : undefined,
    },
  });

  return updated;
}

export async function deletePrescription(prescriptionId: string, userId: string) {
  const prescription = await assertPrescriptionAccess(prescriptionId, userId);

  await prisma.prescription.delete({ where: { id: prescriptionId } });

  // Log after deletion (prescriptionId kept for reference even though the record is gone)
  await prisma.prescriptionLog.create({
    data: {
      prescriptionId,
      patientId: prescription.patientId,
      patientName: prescription.patient.name,
      medicationId: prescription.medicationId,
      medicationName: prescription.medication.name,
      action: "delete",
      performedBy: userId,
    },
  });

  // Notify all group members
  await notifyGroupMembers(
    prescription.patient.groupId,
    "PRESCRIPTION_REMOVED",
    "Prescrição removida",
    `Prescrição de ${prescription.medication.name} para ${prescription.patient.name} foi removida`,
    { data: { patientId: prescription.patientId, medicationId: prescription.medicationId } }
  );
}

export async function listPrescriptionLogs(
  userId: string,
  opts: { patientId?: string; limit?: number; offset?: number }
) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);

  // Filter by patientIds in group
  const groupPatientIds = await prisma.patient
    .findMany({ where: { groupId: { in: groupIds } }, select: { id: true } })
    .then((p) => p.map((x) => x.id));

  const where = {
    patientId: opts.patientId
      ? opts.patientId
      : { in: groupPatientIds },
  };

  const [total, items] = await Promise.all([
    prisma.prescriptionLog.count({ where }),
    prisma.prescriptionLog.findMany({
      where,
      include: { performer: { select: { id: true, name: true, email: true } } },
      orderBy: { performedAt: "desc" },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    }),
  ]);

  return { total, items };
}
