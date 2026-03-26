import { prisma } from "@/lib/prisma";

const OVERDUE_TOLERANCE_MINUTES = 15;
const LOW_STOCK_DAYS = 7;

export async function getPendingMedications(userId: string) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const prescriptions = await prisma.prescription.findMany({
    where: {
      status: "active",
      patient: { groupId: { in: groupIds }, isArchived: false },
      startDate: { lte: todayEnd },
      OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
    },
    include: {
      patient: { select: { id: true, name: true, species: true } },
      medication: { select: { id: true, name: true, doseUnit: true } },
      applications: {
        where: { appliedAt: { gte: todayStart, lte: todayEnd } },
      },
    },
  });

  const items: object[] = [];

  for (const prescription of prescriptions) {
    const times = prescription.scheduleTimes as string[];

    for (const timeStr of times) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const scheduledAt = new Date(todayStart);
      scheduledAt.setHours(hours, minutes, 0, 0);

      // Check if applied within 15-min window
      const applied = prescription.applications.some((app) => {
        const diff = Math.abs(app.appliedAt.getTime() - scheduledAt.getTime());
        return diff <= 30 * 60 * 1000; // 30 min window
      });

      if (applied) {
        const app = prescription.applications.find((a) => {
          const diff = Math.abs(a.appliedAt.getTime() - scheduledAt.getTime());
          return diff <= 30 * 60 * 1000;
        });
        items.push({
          patient: prescription.patient,
          prescription: { id: prescription.id },
          medication: prescription.medication,
          scheduled_at: scheduledAt.toISOString(),
          status: "applied",
          dose_quantity: prescription.doseQuantity,
          dose_fraction: prescription.doseFraction,
          dose_unit: prescription.doseUnit,
          applied: true,
          applied_at: app?.appliedAt.toISOString(),
        });
      } else {
        const overdueThreshold = new Date(scheduledAt.getTime() + OVERDUE_TOLERANCE_MINUTES * 60 * 1000);
        const isOverdue = now > overdueThreshold;
        const minutesOverdue = isOverdue ? Math.floor((now.getTime() - scheduledAt.getTime()) / 60000) : 0;

        items.push({
          patient: prescription.patient,
          prescription: { id: prescription.id },
          medication: prescription.medication,
          scheduled_at: scheduledAt.toISOString(),
          status: isOverdue ? "overdue" : "upcoming",
          dose_quantity: prescription.doseQuantity,
          dose_fraction: prescription.doseFraction,
          dose_unit: prescription.doseUnit,
          applied: false,
          minutes_overdue: isOverdue ? minutesOverdue : undefined,
        });
      }
    }
  }

  // Sort: overdue (oldest first), then upcoming (soonest first), then applied
  items.sort((a: any, b: any) => {
    const order = { overdue: 0, upcoming: 1, applied: 2 };
    if (order[a.status as keyof typeof order] !== order[b.status as keyof typeof order]) {
      return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
    }
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  return {
    date: todayStart.toISOString().split("T")[0],
    items,
  };
}

export async function getStockDashboard(userId: string) {
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);

  const medications = await prisma.medication.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      prescriptions: {
        where: { status: "active" },
        select: { frequencyHours: true, doseQuantity: true },
      },
    },
  });

  const today = new Date();

  const result = medications.map((med) => {
    const dailyConsumption = med.prescriptions.reduce((sum, p) => {
      return sum + (24 / p.frequencyHours) * p.doseQuantity;
    }, 0);

    const daysRemaining =
      med.stockQuantity !== null && dailyConsumption > 0
        ? med.stockQuantity / dailyConsumption
        : null;

    const estimatedDepletionDate =
      daysRemaining !== null
        ? new Date(today.getTime() + daysRemaining * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : null;

    return {
      id: med.id,
      name: med.name,
      stock_quantity: med.stockQuantity,
      stock_unit: med.doseUnit,
      daily_consumption: Math.round(dailyConsumption * 100) / 100,
      days_remaining: daysRemaining !== null ? Math.round(daysRemaining * 10) / 10 : null,
      alert: daysRemaining !== null ? daysRemaining < LOW_STOCK_DAYS : false,
      estimated_depletion_date: estimatedDepletionDate,
      active_prescriptions_count: med.prescriptions.length,
    };
  });

  return { medications: result };
}
