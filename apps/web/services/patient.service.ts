import { prisma } from "@/lib/prisma";

async function assertGroupMember(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!member) throw new Error("Access denied");
}

async function assertPatientAccess(patientId: string, userId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new Error("Patient not found");
  await assertGroupMember(patient.groupId, userId);
  return patient;
}

export async function listPatients(userId: string, groupId?: string) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);
  return prisma.patient.findMany({
    where: {
      groupId: groupId ? { in: groupIds.filter((id) => id === groupId) } : { in: groupIds },
      isArchived: false,
    },
    orderBy: { name: "asc" },
  });
}

export async function createPatient(
  userId: string,
  groupId: string,
  data: {
    name: string;
    species: string;
    breed?: string;
    birthDate?: string;
    gender?: string;
    weightKg?: number;
    photoUrl?: string;
    notes?: string;
  }
) {
  await assertGroupMember(groupId, userId);
  return prisma.patient.create({
    data: {
      groupId,
      name: data.name,
      species: data.species,
      breed: data.breed,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      gender: data.gender,
      weightKg: data.weightKg,
      photoUrl: data.photoUrl,
      notes: data.notes,
    },
  });
}

export async function getPatient(patientId: string, userId: string) {
  return assertPatientAccess(patientId, userId);
}

export async function updatePatient(
  patientId: string,
  userId: string,
  data: {
    name?: string;
    species?: string;
    breed?: string;
    birthDate?: string;
    gender?: string;
    weightKg?: number;
    photoUrl?: string;
    notes?: string;
  }
) {
  await assertPatientAccess(patientId, userId);
  return prisma.patient.update({
    where: { id: patientId },
    data: {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    },
  });
}

export async function archivePatient(patientId: string, userId: string) {
  await assertPatientAccess(patientId, userId);
  return prisma.patient.update({ where: { id: patientId }, data: { isArchived: true } });
}
