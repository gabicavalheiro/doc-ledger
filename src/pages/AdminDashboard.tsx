import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/contexts/BillingContext';
import { DOCTORS } from '@/types/billing';
import SummaryCards from '@/components/SummaryCards';
import BillingTable from '@/components/BillingTable';
import AppHeader from '@/components/AppHeader';
import ManageUsers from '@/components/admin/ManageUsers';
import ManageDoctors from '@/components/admin/ManageDoctors';
import ManageCategories from '@/components/admin/ManageCategories';
import ManageUnits from '@/components/admin/ManageUnits';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, UserPlus, Stethoscope, Tags, Building2 } from 'lucide-react';

export default function AdminDashboard({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const { user } = useAuth();
  const { data, updateMonth, getDoctorData } = useBilling();
  const [selectedDoctorId, setSelectedDoctorId] = useState(DOCTORS[0].id);

  const doctorData = getDoctorData(selectedDoctorId);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onOpenProfile={onOpenProfile} />
      <main className="container max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm">Gerencie faturamento, médicos, categorias e usuários</p>
        </div>

        <Tabs defaultValue="billing" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="billing" className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 className="w-4 h-4" />
              Faturamento
            </TabsTrigger>
            <TabsTrigger value="doctors" className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Stethoscope className="w-4 h-4" />
              Médicos
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Tags className="w-4 h-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Building2 className="w-4 h-4" />
              Unidades
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <UserPlus className="w-4 h-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="billing" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="doctors">
            <ManageDoctors />
          </TabsContent>

          <TabsContent value="categories">
            <ManageCategories />
          </TabsContent>

          <TabsContent value="units">
            <ManageUnits />
          </TabsContent>

          <TabsContent value="users">
            <ManageUsers />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
