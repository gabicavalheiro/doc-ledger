import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/contexts/BillingContext';
import { DOCTORS } from '@/types/billing';
import SummaryCards from '@/components/SummaryCards';
import BillingTable from '@/components/BillingTable';
import AppHeader from '@/components/AppHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const { user } = useAuth();
  const { data, updateMonth, getDoctorData } = useBilling();
  const [selectedDoctorId, setSelectedDoctorId] = useState(DOCTORS[0].id);

  const doctorData = getDoctorData(selectedDoctorId);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display">Painel Administrativo</h1>
            <p className="text-muted-foreground text-sm">Gerencie o faturamento de todos os médicos</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Médico:</span>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCTORS.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SummaryCards data={doctorData} />

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">
              Faturamento Mensal — {doctorData.doctorName} ({doctorData.year})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-4">
            <BillingTable
              data={doctorData}
              editable={true}
              onUpdate={(month, updates) => updateMonth(selectedDoctorId, month, updates)}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
