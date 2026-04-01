import React, { createContext, useContext, useState, useCallback } from 'react';
import { DoctorData, MonthlyBilling, DOCTORS, createEmptyDoctorData } from '@/types/billing';

interface BillingContextType {
  data: DoctorData[];
  updateMonth: (doctorId: string, month: number, updates: Partial<MonthlyBilling>) => void;
  getDoctorData: (doctorId: string) => DoctorData;
}

const BillingContext = createContext<BillingContextType | null>(null);

const currentYear = new Date().getFullYear();

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DoctorData[]>(
    DOCTORS.map(d => createEmptyDoctorData(d.id, d.name, currentYear))
  );

  const updateMonth = useCallback((doctorId: string, month: number, updates: Partial<MonthlyBilling>) => {
    setData(prev => prev.map(d => {
      if (d.doctorId !== doctorId) return d;
      return {
        ...d,
        months: d.months.map(m => m.month === month ? { ...m, ...updates } : m),
      };
    }));
  }, []);

  const getDoctorData = useCallback((doctorId: string): DoctorData => {
    return data.find(d => d.doctorId === doctorId) || createEmptyDoctorData(doctorId, '', currentYear);
  }, [data]);

  return (
    <BillingContext.Provider value={{ data, updateMonth, getDoctorData }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
}
