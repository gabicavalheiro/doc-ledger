export type UserRole = 'admin' | 'medico';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface MonthlyBilling {
  month: number; // 0-11
  examesTotal: number;
  consultasQtd: number;
  consultasTotal: number;
  yagQtd: number;
  yagHonorarios: number;
  iridecQtd: number;
  iridecHonorarios: number;
  laserQtd: number;
  laserHonorarios: number;
}

export interface DoctorData {
  doctorId: string;
  doctorName: string;
  year: number;
  months: MonthlyBilling[];
}

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DOCTORS: User[] = [
  { id: 'dr-guilherme', name: 'Dr. Guilherme', role: 'medico' },
  { id: 'dr-ana', name: 'Dra. Ana', role: 'medico' },
  { id: 'dr-carlos', name: 'Dr. Carlos', role: 'medico' },
];

export const ADMIN_USER: User = { id: 'admin', name: 'Administrador', role: 'admin' };

// Calculation helpers
export function calcExamesLiquido(total: number): number {
  const menosTaxa = total * 0.85; // -15%
  return menosTaxa * 0.5; // 50%
}

export function calcConsultasLiquido(total: number): number {
  const menosTaxa = total * 0.85; // -15%
  return menosTaxa * 0.7; // 70%
}

export function createEmptyMonth(month: number): MonthlyBilling {
  return {
    month,
    examesTotal: 0,
    consultasQtd: 0,
    consultasTotal: 0,
    yagQtd: 0,
    yagHonorarios: 0,
    iridecQtd: 0,
    iridecHonorarios: 0,
    laserQtd: 0,
    laserHonorarios: 0,
  };
}

export function createEmptyDoctorData(doctorId: string, doctorName: string, year: number): DoctorData {
  return {
    doctorId,
    doctorName,
    year,
    months: Array.from({ length: 12 }, (_, i) => createEmptyMonth(i)),
  };
}

export function getMonthNetIncome(m: MonthlyBilling): number {
  return (
    calcExamesLiquido(m.examesTotal) +
    calcConsultasLiquido(m.consultasTotal) +
    m.yagHonorarios +
    m.iridecHonorarios +
    m.laserHonorarios
  );
}

export function getMonthTotalProcedures(m: MonthlyBilling): number {
  return m.consultasQtd + m.yagQtd + m.iridecQtd + m.laserQtd;
}
