import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Activity, FileText, TrendingUp } from 'lucide-react';

interface SummaryCardsProps {
  totalLiquido?: number;
  totalBruto?: number;
  totalConsultas?: number;
  totalProcedimentos?: number;
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function SummaryCards({
  totalLiquido = 0,
  totalBruto = 0,
  totalConsultas = 0,
  totalProcedimentos = 0,
}: SummaryCardsProps) {
  const cards = [
    {
      title: 'Renda Líquida',
      value: fmt(totalLiquido),
      icon: DollarSign,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    {
      title: 'Fat. Bruto',
      value: fmt(totalBruto),
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    },
    {
      title: 'Consultas',
      value: String(totalConsultas),
      icon: FileText,
      gradient: 'bg-gradient-to-br from-sky-500 to-sky-600',
    },
    {
      title: 'Procedimentos',
      value: String(totalProcedimentos),
      icon: Activity,
      gradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c, i) => (
        <Card
          key={c.title}
          className="shadow-card border-0 overflow-hidden animate-fade-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-sm text-muted-foreground font-medium truncate">{c.title}</p>
                <p className="text-lg sm:text-2xl font-bold font-display mt-0.5 sm:mt-1 truncate">{c.value}</p>
              </div>
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${c.gradient}`}>
                <c.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}