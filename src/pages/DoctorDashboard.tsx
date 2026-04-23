import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BillingTable from '@/components/BillingTable';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DoctorDashboard({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const { user, displayName } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDoctorId(data?.id ?? null);
        setLoading(false);
      });
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onOpenProfile={onOpenProfile} />
      <main className="container max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
            Meu Painel Financeiro
          </h1>
          <p className="text-muted-foreground text-sm">Bem-vindo(a), {displayName}</p>
        </div>

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <CardTitle className="font-display text-base sm:text-lg">
              Relatório Mensal — {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !doctorId ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-medium">Sua conta ainda não está vinculada a um médico.</p>
                <p className="text-xs text-muted-foreground">
                  Entre em contato com o administrador para fazer o vínculo.
                </p>
              </div>
            ) : (
              <BillingTable
                doctorId={doctorId}
                year={currentYear}
                editable={false}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}