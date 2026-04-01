import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DoctorData, getMonthNetIncome, getMonthTotalProcedures, calcExamesLiquido, calcConsultasLiquido } from '@/types/billing';
import { DollarSign, Activity, FileText, TrendingUp } from 'lucide-react';

interface SummaryCardsProps {
  data: DoctorData;
  selectedMonth?: number; // if undefined, show yearly
}

export default function SummaryCards({ data, selectedMonth }: SummaryCardsProps) {
  const stats = useMemo(() => {
    const months = selectedMonth !== undefined
      ? [data.months[selectedMonth]]
      : data.months;

    const totalLiquido = months.reduce((s, m) => s + getMonthNetIncome(m), 0);
    const totalConsultas = months.reduce((s, m) => s + m.consultasQtd, 0);
    const totalProcedimentos = months.reduce((s, m) => s + getMonthTotalProcedures(m), 0);
    const totalBruto = months.reduce((s, m) => s + m.examesTotal + m.consultasTotal + m.yagHonorarios + m.iridecHonorarios + m.laserHonorarios, 0);

    return { totalLiquido, totalConsultas, totalProcedimentos, totalBruto };
  }, [data, selectedMonth]);

  const cards = [
    {
      title: 'Renda Líquida',
      value: formatCurrency(stats.totalLiquido),
      icon: DollarSign,
      gradient: 'bg-gradient-primary',
    },
    {
      title: 'Faturamento Bruto',
      value: formatCurrency(stats.totalBruto),
      icon: TrendingUp,
      gradient: 'bg-accent',
    },
    {
      title: 'Total Consultas',
      value: stats.totalConsultas.toString(),
      icon: FileText,
      gradient: 'bg-info',
    },
    {
      title: 'Total Procedimentos',
      value: stats.totalProcedimentos.toString(),
      icon: Activity,
      gradient: 'bg-warning',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card key={c.title} className="shadow-card border-0 overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{c.title}</p>
                <p className="text-2xl font-bold font-display mt-1">{c.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.gradient}`}>
                <c.icon className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
