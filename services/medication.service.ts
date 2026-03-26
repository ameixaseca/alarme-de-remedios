import { prisma } from "@/lib/prisma";
import { ApplicationMethod } from "@prisma/client";

async function assertGroupMember(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!member) throw new Error("Access denied");
}

async function assertMedicationAccess(medicationId: string, userId: string) {
  const med = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!med) throw new Error("Medication not found");
  await assertGroupMember(med.groupId, userId);
  return med;
}

export async function listMedications(userId: string, groupId?: string) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);
  return prisma.medication.findMany({
    where: {
      groupId: groupId ? { in: groupIds.filter((id) => id === groupId) } : { in: groupIds },
    },
    orderBy: { name: "asc" },
  });
}

export async function createMedication(
  userId: string,
  groupId: string,
  data: {
    name: string;
    manufacturer?: string;
    activeIngredient?: string;
    applicationMethod?: ApplicationMethod;
    doseUnit: string;
    stockQuantity?: number;
  }
) {
  await assertGroupMember(groupId, userId);
  return prisma.medication.create({
    data: {
      groupId,
      name: data.name,
      manufacturer: data.manufacturer,
      activeIngredient: data.activeIngredient,
      applicationMethod: data.applicationMethod ?? "oral",
      doseUnit: data.doseUnit,
      stockQuantity: data.stockQuantity,
    },
  });
}

export async function getMedication(medicationId: string, userId: string) {
  return assertMedicationAccess(medicationId, userId);
}

export async function updateMedication(
  medicationId: string,
  userId: string,
  data: {
    name?: string;
    manufacturer?: string;
    activeIngredient?: string;
    applicationMethod?: ApplicationMethod;
    doseUnit?: string;
    stockQuantity?: number;
  }
) {
  await assertMedicationAccess(medicationId, userId);
  return prisma.medication.update({ where: { id: medicationId }, data });
}

export async function deleteMedication(medicationId: string, userId: string) {
  await assertMedicationAccess(medicationId, userId);
  return prisma.medication.delete({ where: { id: medicationId } });
}
