import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import BillingTable from '@/components/BillingTable';
import ManageUsers from '@/components/admin/ManageUsers';
import ManageDoctors from '@/components/admin/ManageDoctors';
import ManageCategories from '@/components/admin/ManageCategories';
import ManageUnits from '@/components/admin/ManageUnits';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutDashboard, Users, Stethoscope, Tags, Building2, RefreshCw } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
}

interface Props {
  onOpenProfile?: () => void;
}

export default function AdminDashboard({ onOpenProfile }: Props) {
  const { displayName } = useAuth();
  const [activeTab, setActiveTab] = useState('billing');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const currentYear = new Date().getFullYear();

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    const { data } = await supabase
      .from('doctors')
      .select('id, name')
      .eq('active', true)
      .order('name');
    const list = data ?? [];
    setDoctors(list);
    // Mantém seleção atual se ainda existir; senão seleciona o primeiro
    setSelectedDoctor(prev => {
      if (prev && list.some(d => d.id === prev)) return prev;
      return list[0]?.id ?? '';
    });
    setLoadingDoctors(false);
  }, []);

  // Carrega ao montar
  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  // Recarrega sempre que a aba de faturamento for ativada
  useEffect(() => {
    if (activeTab === 'billing') fetchDoctors();
  }, [activeTab, fetchDoctors]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onOpenProfile={onOpenProfile} />
      <main className="container max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground text-sm">Bem-vindo(a), {displayName}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto w-full max-w-3xl">
            <TabsTrigger value="billing" className="gap-1.5 text-xs sm:text-sm">
              <LayoutDashboard className="w-4 h-4" /> Faturamento
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="w-4 h-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="doctors" className="gap-1.5 text-xs sm:text-sm">
              <Stethoscope className="w-4 h-4" /> Médicos
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm">
              <Tags className="w-4 h-4" /> Categorias
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-1.5 text-xs sm:text-sm">
              <Building2 className="w-4 h-4" /> Unidades
            </TabsTrigger>
          </TabsList>

          {/* Faturamento */}
          <TabsContent value="billing" className="space-y-4">
            <Card className="border-0 shadow-card">
              <CardHeader className="px-4 sm:px-6 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="font-display text-base sm:text-lg">
                    Faturamento por Médico
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Selecione um médico para visualizar e editar os lançamentos mensais.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={fetchDoctors}
                  title="Atualizar lista de médicos"
                  className="shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDoctors ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6">
                {loadingDoctors ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-sm font-medium">Nenhum médico ativo cadastrado.</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastre médicos na aba "Médicos" para começar.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="max-w-xs">
                      <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione um médico..." />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedDoctor && (
                      <BillingTable
                        doctorId={selectedDoctor}
                        year={currentYear}
                        editable
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users"><ManageUsers /></TabsContent>
          <TabsContent value="doctors"><ManageDoctors /></TabsContent>
          <TabsContent value="categories"><ManageCategories /></TabsContent>
          <TabsContent value="units"><ManageUnits /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}