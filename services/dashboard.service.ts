import { prisma } from "@/lib/prisma";

const OVERDUE_TOLERANCE_MINUTES = 15;
const LOW_STOCK_DAYS = 7;

export async function getPendingMedications(userId: string, tzOffset: number = 0) {
  // tzOffset: minutes from UTC, e.g. -180 for UTC-3 (Brazil).
  // getTimezoneOffset() on the client returns the negated value, so the caller should negate it.
  const memberGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((m) => m.groupId);

  const now = new Date();
  const offsetMs = tzOffset * 60 * 1000;

  // Derive the user's local date string ("YYYY-MM-DD") from now + offset
  const localNow = new Date(now.getTime() + offsetMs);
  const localDateStr = localNow.toISOString().slice(0, 10);

  // Build day boundaries in UTC that correspond to local midnight / end-of-day
  const todayStart = new Date(Date.parse(`${localDateStr}T00:00:00Z`) - offsetMs);
  const todayEnd   = new Date(Date.parse(`${localDateStr}T23:59:59.999Z`) - offsetMs);

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
      // Build scheduledAt as the correct UTC instant for "timeStr" in the user's local timezone
      const scheduledAt = new Date(Date.parse(`${localDateStr}T${timeStr}:00Z`) - offsetMs);

      // Skip slots that are before the prescription's start date+time
      if (scheduledAt < prescription.startDate) continue;

      // Check if this slot was registered: match by scheduledAt (exact, 1-min tolerance)
      // Fallback to 30-min window on appliedAt for legacy records without scheduledAt
      const applied = prescription.applications.some((app) => {
        if (app.scheduledAt) {
          return Math.abs(app.scheduledAt.getTime() - scheduledAt.getTime()) <= 60 * 1000;
        }
        return Math.abs(app.appliedAt.getTime() - scheduledAt.getTime()) <= 30 * 60 * 1000;
      });

      if (applied) {
        continue; // already registered — exclude from pending list
      } else {
        const overdueThreshold = new Date(scheduledAt.getTime() + OVERDUE_TOLERANCE_MINUTES * 60 * 1000);
        const isOverdue = now > overdueThreshold;
        const minutesOverdue = isOverdue ? Math.floor((now.getTime() - scheduledAt.getTime()) / 60000) : 0;

        items.push({
          patient: prescription.patient,
          prescription: { id: prescription.id },
          medication: prescription.medication,
          scheduled_at: scheduledAt.toISOString(),
          scheduled_time: timeStr,          // raw "HH:MM" — use this for display
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

  // Sort: overdue (oldest first), then upcoming (soonest first)
  items.sort((a: any, b: any) => {
    const order = { overdue: 0, upcoming: 1 };
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
        select: { frequencyHours: true, doseQuantity: true, doseUnit: true },
      },
    },
  });

  const today = new Date();

  const DROPS_TO_ML = 0.05;

  const result = medications.map((med) => {
    const isDrops = med.doseUnit.toLowerCase().trim() === "gotas";
    const dailyConsumption = med.prescriptions.reduce((sum, p) => {
      const dosesPerDay = 24 / p.frequencyHours;
      const doseInStockUnit = isDrops ? p.doseQuantity * DROPS_TO_ML : p.doseQuantity;
      return sum + dosesPerDay * doseInStockUnit;
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
      stock_unit: isDrops ? "mL" : med.doseUnit,
      daily_consumption: Math.round(dailyConsumption * 100) / 100,
      days_remaining: daysRemaining !== null ? Math.round(daysRemaining * 10) / 10 : null,
      alert: daysRemaining !== null ? daysRemaining < LOW_STOCK_DAYS : false,
      estimated_depletion_date: estimatedDepletionDate,
      active_prescriptions_count: med.prescriptions.length,
    };
  });

  return { medications: result };
}
