import { prisma } from "@/lib/prisma";
import { notifyGroupMembers } from "@/services/notification.service";

const LOW_STOCK_DAYS = 7;

async function assertApplicationAccess(applicationId: string, userId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      prescription: { include: { patient: true } },
      patient: true,
    },
  });
  if (!app) throw new Error("Application not found");

  // Resolve groupId from prescription (scheduled) or direct patient (ad-hoc)
  const groupId = app.prescription?.patient.groupId ?? app.patient?.groupId;
  if (!groupId) throw new Error("Application not found");

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
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
      OR: [
        { prescription: { patient: { groupId: { in: groupIds } } } },
        { patient: { groupId: { in: groupIds } } },
      ],
      ...(prescriptionId && { prescriptionId }),
      ...dateFilter,
    },
    include: {
      prescription: { select: { id: true, doseUnit: true } },
      medication:   { select: { id: true, name: true, doseUnit: true } },
      applier:      { select: { id: true, name: true } },
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
    groupId?: string;
  } = {}
) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const allGroupIds = memberGroups.map((m) => m.groupId);
  const groupIds = opts.groupId
    ? allGroupIds.filter((id) => id === opts.groupId)
    : allGroupIds;

  const dateFilter: Record<string, unknown> = {};
  if (opts.from) dateFilter.gte = new Date(opts.from);
  if (opts.to)   dateFilter.lte = new Date(opts.to);

  // Match both scheduled (via prescription) and ad-hoc (direct patient/medication fields)
  const groupFilter = {
    OR: [
      { prescription: { patient: { groupId: { in: groupIds } } } },
      { patient:      { groupId: { in: groupIds } } },
    ],
  };

  const patientFilter = opts.patientId
    ? {
        OR: [
          { prescription: { patientId: opts.patientId } },
          { patientId: opts.patientId },
        ],
      }
    : {};

  const medicationFilter = opts.medicationId
    ? {
        OR: [
          { prescription: { medicationId: opts.medicationId } },
          { medicationId: opts.medicationId },
        ],
      }
    : {};

  const where = {
    ...groupFilter,
    ...patientFilter,
    ...medicationFilter,
    ...(Object.keys(dateFilter).length > 0 && { appliedAt: dateFilter }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: {
        applier: { select: { id: true, name: true, email: true } },
        // For scheduled applications
        prescription: {
          include: {
            patient:    { select: { id: true, name: true, species: true } },
            medication: { select: { id: true, name: true, doseUnit: true } },
          },
        },
        // For ad-hoc applications
        patient:    { select: { id: true, name: true, species: true } },
        medication: { select: { id: true, name: true, doseUnit: true } },
      },
      orderBy: { appliedAt: "desc" },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
    }),
  ]);

  return {
    total,
    items: items.map((a) => {
      const patient    = a.prescription?.patient    ?? a.patient;
      const medication = a.prescription?.medication ?? a.medication;
      return {
        id:             a.id,
        appliedAt:      a.appliedAt,
        scheduledAt:    a.scheduledAt,
        doseApplied:    a.doseApplied,
        doseUnit:       medication?.doseUnit ?? "",
        notes:          a.notes,
        isAdHoc:        a.isAdHoc,
        applier:        a.applier,
        patient,
        medication,
        prescriptionId: a.prescriptionId,
      };
    }),
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
      appliedBy:      userId,
      appliedAt:      new Date(data.appliedAt),
      scheduledAt:    data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      doseApplied:    data.doseApplied,
      notes:          data.notes,
    },
  });

  // Subtract from stock if defined (allow negative).
  // Gotas: stock is kept in mL (1 gota = 0.05 mL).
  let stockRemaining: number | null = null;
  if (prescription.medication.stockQuantity !== null) {
    const isDrops = prescription.medication.doseUnit.toLowerCase().trim() === "gotas";
    const stockDecrement = isDrops ? data.doseApplied * 0.05 : data.doseApplied;
    const updated = await prisma.medication.update({
      where: { id: prescription.medicationId },
      data:  { stockQuantity: { decrement: stockDecrement } },
    });
    stockRemaining = updated.stockQuantity;
    await maybeNotifyLowStock(prescription.medication, stockRemaining, prescription.patient.groupId);
  }

  return { application, stockRemaining };
}

export async function createAdHocApplication(
  userId: string,
  data: {
    patientId:    string;
    medicationId: string;
    doseApplied:  number;
    notes?:       string;
  }
) {
  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
  });
  if (!patient)           throw new Error("Patient not found");
  if (patient.isArchived) throw new Error("Patient is archived");

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: patient.groupId } },
  });
  if (!member) throw new Error("Access denied");

  const medication = await prisma.medication.findUnique({
    where: { id: data.medicationId },
  });
  if (!medication)                         throw new Error("Medication not found");
  if (medication.groupId !== patient.groupId) throw new Error("Medication does not belong to the patient's group");

  const application = await prisma.application.create({
    data: {
      isAdHoc:     true,
      patientId:   data.patientId,
      medicationId: data.medicationId,
      appliedBy:   userId,
      appliedAt:   new Date(),
      doseApplied: data.doseApplied,
      notes:       data.notes,
    },
  });

  // Deduct from stock — same rules as scheduled applications
  let stockRemaining: number | null = null;
  if (medication.stockQuantity !== null) {
    const isDrops = medication.doseUnit.toLowerCase().trim() === "gotas";
    const stockDecrement = isDrops ? data.doseApplied * 0.05 : data.doseApplied;
    const updated = await prisma.medication.update({
      where: { id: data.medicationId },
      data:  { stockQuantity: { decrement: stockDecrement } },
    });
    stockRemaining = updated.stockQuantity;
    await maybeNotifyLowStock(medication, stockRemaining, patient.groupId);
  }

  return { application, stockRemaining };
}

// ── Helpers ───────────────────────────────────────────────

async function maybeNotifyLowStock(
  medication: { id: string; name: string; doseUnit: string },
  stockRemaining: number | null,
  groupId: string
) {
  if (stockRemaining === null) return;

  // Compute daily consumption for this medication
  const activePrescriptions = await prisma.prescription.findMany({
    where: { medicationId: medication.id, status: "active" },
    select: { frequencyHours: true, doseQuantity: true },
  });
  if (activePrescriptions.length === 0) return;

  const isDrops = medication.doseUnit.toLowerCase().trim() === "gotas";
  const dailyConsumption = activePrescriptions.reduce((sum, p) => {
    const dosesPerDay = 24 / p.frequencyHours;
    return sum + dosesPerDay * (isDrops ? p.doseQuantity * 0.05 : p.doseQuantity);
  }, 0);
  if (dailyConsumption <= 0) return;

  const daysRemaining = stockRemaining / dailyConsumption;
  if (daysRemaining >= LOW_STOCK_DAYS) return;

  const today = new Date().toISOString().slice(0, 10);
  await notifyGroupMembers(
    groupId,
    "LOW_STOCK",
    "Estoque baixo",
    `${medication.name} tem estoque para aprox. ${Math.ceil(daysRemaining)} dia(s)`,
    {
      data: { medicationId: medication.id, daysRemaining: Math.ceil(daysRemaining) },
      dedupKey: `low_stock_${medication.id}_${today}`,
    }
  );
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
