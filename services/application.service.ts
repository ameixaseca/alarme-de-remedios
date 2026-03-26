import { prisma } from "@/lib/prisma";

async function assertApplicationAccess(applicationId: string, userId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { prescription: { include: { patient: true } } },
  });
  if (!app) throw new Error("Application not found");
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: app.prescription.patient.groupId } },
  });
  if (!member) throw new Error("Access denied");
  return app;
}

export async function listApplications(userId: string, prescriptionId?: string, date?: string) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);

  let dateFilter = {};
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    dateFilter = { appliedAt: { gte: start, lt: end } };
  }

  return prisma.application.findMany({
    where: {
      prescription: { patient: { groupId: { in: groupIds } } },
      ...(prescriptionId && { prescriptionId }),
      ...dateFilter,
    },
    include: {
      prescription: {
        select: { id: true, doseUnit: true },
      },
      applier: { select: { id: true, name: true } },
    },
    orderBy: { appliedAt: "desc" },
  });
}

export async function listApplicationLog(
  userId: string,
  opts: {
    patientId?: string;
    medicationId?: string;
    from?: string;
    to?: string;
    take?: number;
    skip?: number;
  } = {}
) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);

  const dateFilter: Record<string, unknown> = {};
  if (opts.from) dateFilter.gte = new Date(opts.from);
  if (opts.to) dateFilter.lte = new Date(opts.to);

  const where = {
    prescription: {
      patient: { groupId: { in: groupIds } },
      ...(opts.patientId && { patientId: opts.patientId }),
      ...(opts.medicationId && { medicationId: opts.medicationId }),
    },
    ...(Object.keys(dateFilter).length > 0 && { appliedAt: dateFilter }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: {
        applier: { select: { id: true, name: true, email: true } },
        prescription: {
          include: {
            patient: { select: { id: true, name: true, species: true } },
            medication: { select: { id: true, name: true, doseUnit: true } },
          },
        },
      },
      orderBy: { appliedAt: "desc" },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
    }),
  ]);

  return {
    total,
    items: items.map((a) => ({
      id: a.id,
      appliedAt: a.appliedAt,
      scheduledAt: a.scheduledAt,
      doseApplied: a.doseApplied,
      doseUnit: a.prescription.medication.doseUnit,
      notes: a.notes,
      applier: a.applier,
      patient: a.prescription.patient,
      medication: a.prescription.medication,
      prescriptionId: a.prescriptionId,
    })),
  };
}

export async function createApplication(
  userId: string,
  data: {
    prescriptionId: string;
    appliedAt: string;
    scheduledAt?: string;
    doseApplied: number;
    notes?: string;
  }
) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: data.prescriptionId },
    include: { patient: true, medication: true },
  });
  if (!prescription) throw new Error("Prescription not found");
  if (prescription.status !== "active") throw new Error("Prescription is not active");

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: prescription.patient.groupId } },
  });
  if (!member) throw new Error("Access denied");

  const application = await prisma.application.create({
    data: {
      prescriptionId: data.prescriptionId,
      appliedBy: userId,
      appliedAt: new Date(data.appliedAt),
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      doseApplied: data.doseApplied,
      notes: data.notes,
    },
  });

  // Subtract from stock if defined (allow negative)
  let stockRemaining: number | null = null;
  if (prescription.medication.stockQuantity !== null) {
    const updated = await prisma.medication.update({
      where: { id: prescription.medicationId },
      data: { stockQuantity: { decrement: data.doseApplied } },
    });
    stockRemaining = updated.stockQuantity;
  }

  return { application, stockRemaining };
}

export async function getApplication(applicationId: string, userId: string) {
  return assertApplicationAccess(applicationId, userId);
}

export async function updateApplication(
  applicationId: string,
  userId: string,
  data: { appliedAt?: string; doseApplied?: number; notes?: string }
) {
  await assertApplicationAccess(applicationId, userId);
  return prisma.application.update({
    where: { id: applicationId },
    data: {
      ...data,
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
    },
  });
}

export async function deleteApplication(applicationId: string, userId: string) {
  await assertApplicationAccess(applicationId, userId);
  return prisma.application.delete({ where: { id: applicationId } });
}
