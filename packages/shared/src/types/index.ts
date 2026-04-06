// Tipos compartilhados entre web e mobile

export type ApplicationMethod = 'oral' | 'injectable' | 'topical' | 'ophthalmic' | 'otic' | 'inhalation' | 'other';
export type PrescriptionStatus = 'active' | 'paused' | 'finished';
export type GroupRole = 'admin' | 'member';
export type NotificationType = 'LATE_APPLICATION' | 'LOW_STOCK' | 'PRESCRIPTION_REMOVED' | 'OFFLINE_APPLICATION';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  photoUrl?: string;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: GroupRole;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface Patient {
  id: string;
  groupId: string;
  name: string;
  species: string;
  breed?: string;
  photoUrl?: string;
  archived: boolean;
  createdAt: string;
}

export interface Medication {
  id: string;
  groupId: string;
  name: string;
  manufacturer?: string;
  activeIngredient?: string;
  applicationMethod: ApplicationMethod;
  doseUnit: string;
  stockQuantity?: number;
  createdAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  medicationId: string;
  doseQuantity: number;
  doseFraction?: string;
  doseUnit: string;
  frequencyHours: number;
  scheduleTimes: string[];
  durationDays?: number;
  startDate: string;
  endDate?: string;
  status: PrescriptionStatus;
  createdBy: string;
  createdAt: string;
  patient?: Patient;
  medication?: Medication;
}

export interface Application {
  id: string;
  prescriptionId?: string;
  medicationId?: string;
  patientId?: string;
  isAdHoc: boolean;
  appliedBy: string;
  appliedAt: string;
  scheduledAt?: string;
  doseApplied: number;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface PendingMedication {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string;
  medicationId: string;
  medicationName: string;
  doseQuantity: number;
  doseFraction?: string;
  doseUnit: string;
  scheduledAt: string;
  status: 'overdue' | 'upcoming' | 'applied';
  appliedAt?: string;
  minutesLate?: number;
}

export interface StockItem {
  medicationId: string;
  medicationName: string;
  stockQuantity?: number;
  dailyConsumption?: number;
  daysRemaining?: number;
  isLowStock: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface ApiError {
  error: string;
  status: number;
}
