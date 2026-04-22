import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { MONTHS } from '@/types/billing';

interface Category {
  id: string;
  name: string;
  active: boolean;
}

interface BillingTableProps {
  doctorId?: string;
  editable?: boolean;
}

export default function BillingTable({ doctorId, editable = false }: BillingTableProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('payment_categories')
        .select('id, name, active')
        .eq('active', true)
        .order('name');
      setCategories(data || []);
      setLoading(false);
    })();
  }, []);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="px-6 py-12 text-center space-y-2">
        <p className="text-sm font-medium">Nenhuma categoria ativa.</p>
        <p className="text-xs text-muted-foreground">
          Cadastre categorias na aba "Categorias" para começar a registrar faturamento.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-display font-semibold sticky left-0 bg-muted/50 z-10 min-w-[100px] text-xs sm:text-sm">
              Mês
            </TableHead>
            {categories.map(c => (
              <TableHead
                key={c.id}
                className="text-center font-display font-semibold text-xs sm:text-sm border-l whitespace-nowrap"
              >
                {c.name}
              </TableHead>
            ))}
            <TableHead className="text-center font-display font-semibold border-l text-accent text-xs sm:text-sm">
              Total Líq.
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MONTHS.map((monthName, idx) => (
            <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium sticky left-0 bg-card z-10 text-xs sm:text-sm whitespace-nowrap">
                {monthName}
              </TableCell>
              {categories.map(c => (
                <TableCell key={c.id} className="border-l text-center text-xs sm:text-sm text-muted-foreground tabular-nums">
                  {fmt(0)}
                </TableCell>
              ))}
              <TableCell className="border-l text-center font-bold text-accent tabular-nums text-xs sm:text-sm">
                {fmt(0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
