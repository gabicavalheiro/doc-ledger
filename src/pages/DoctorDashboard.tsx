import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/contexts/BillingContext';
import SummaryCards from '@/components/SummaryCards';
import BillingTable from '@/components/BillingTable';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DoctorDashboard({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const { user } = useAuth();
  const { getDoctorData } = useBilling();

  if (!user) return null;

  const { displayName } = useAuth();
  const doctorData = getDoctorData(user.id);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onOpenProfile={onOpenProfile} />
      <main className="container max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">Meu Painel Financeiro</h1>
          <p className="text-muted-foreground text-sm">Bem-vindo(a), {displayName}</p>
        </div>

        <SummaryCards data={doctorData} />

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <CardTitle className="font-display text-base sm:text-lg">
              Relatório Mensal — {doctorData.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <BillingTable doctorId={user.id} editable={false} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
