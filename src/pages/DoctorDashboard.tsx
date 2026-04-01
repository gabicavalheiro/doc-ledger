import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/contexts/BillingContext';
import SummaryCards from '@/components/SummaryCards';
import BillingTable from '@/components/BillingTable';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { getDoctorData } = useBilling();

  if (!user) return null;

  const doctorData = getDoctorData(user.id);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Meu Painel Financeiro</h1>
          <p className="text-muted-foreground text-sm">Bem-vindo(a), {user.name}</p>
        </div>

        <SummaryCards data={doctorData} />

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">
              Relatório Mensal — {doctorData.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-4">
            <BillingTable
              data={doctorData}
              editable={false}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
