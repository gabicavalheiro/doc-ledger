import { DoctorData, MonthlyBilling, MONTHS, calcExamesLiquido, calcConsultasLiquido, getMonthNetIncome } from '@/types/billing';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BillingTableProps {
  data: DoctorData;
  editable: boolean;
  onUpdate?: (month: number, updates: Partial<MonthlyBilling>) => void;
}

export default function BillingTable({ data, editable, onUpdate }: BillingTableProps) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const fmtShort = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

  const handleChange = (month: number, field: keyof MonthlyBilling, value: string) => {
    const num = parseFloat(value) || 0;
    onUpdate?.(month, { [field]: num });
  };

  const CellInput = ({ month, field, value }: { month: number; field: keyof MonthlyBilling; value: number }) => {
    if (!editable) return <span className="text-xs sm:text-sm tabular-nums whitespace-nowrap">{field.includes('Qtd') ? value : fmt(value)}</span>;
    return (
      <Input
        type="number"
        min={0}
        step={field.includes('Qtd') ? 1 : 0.01}
        value={value || ''}
        onChange={e => handleChange(month, field, e.target.value)}
        className="h-7 sm:h-8 w-20 sm:w-24 text-xs sm:text-sm tabular-nums"
      />
    );
  };

  const CalcCell = ({ value }: { value: number }) => (
    <span className="text-xs sm:text-sm font-medium tabular-nums text-accent whitespace-nowrap">{fmt(value)}</span>
  );

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-lg border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-display font-semibold sticky left-0 bg-muted/50 z-10 min-w-[70px] sm:min-w-[100px] text-xs sm:text-sm px-2 sm:px-4">Mês</TableHead>
            <TableHead colSpan={3} className="text-center font-display font-semibold border-l text-xs sm:text-sm px-2 sm:px-4">Exames</TableHead>
            <TableHead colSpan={4} className="text-center font-display font-semibold border-l text-xs sm:text-sm px-2 sm:px-4">Consultas</TableHead>
            <TableHead colSpan={2} className="text-center font-display font-semibold border-l text-xs sm:text-sm px-2 sm:px-4">YAG</TableHead>
            <TableHead colSpan={2} className="text-center font-display font-semibold border-l text-xs sm:text-sm px-2 sm:px-4">IRIDEC</TableHead>
            <TableHead colSpan={2} className="text-center font-display font-semibold border-l text-xs sm:text-sm px-2 sm:px-4">LASER</TableHead>
            <TableHead className="text-center font-display font-semibold border-l text-accent text-xs sm:text-sm px-2 sm:px-4">Líq. Total</TableHead>
          </TableRow>
          <TableRow className="bg-muted/30">
            <TableHead className="sticky left-0 bg-muted/30 z-10 px-2 sm:px-4"></TableHead>
            <TableHead className="text-[10px] sm:text-xs border-l px-1.5 sm:px-4 whitespace-nowrap">Valor Total</TableHead>
            <TableHead className="text-[10px] sm:text-xs px-1.5 sm:px-4">-15%</TableHead>
            <TableHead className="text-[10px] sm:text-xs px-1.5 sm:px-4 whitespace-nowrap">50% (Líq.)</TableHead>
            <TableHead className="text-[10px] sm:text-xs border-l px-1.5 sm:px-4">Qtd</TableHead>
            <TableHead className="text-[10px] sm:text-xs px-1.5 sm:px-4 whitespace-nowrap">Valor Total</TableHead>
            <TableHead className="text-[10px] sm:text-xs px-1.5 sm:px-4">-15%</TableHead>
            <TableHead className="text-[10px] sm:text-xs px-1.5 sm:px-4 whitespace-nowrap">70% (Líq.)</TableHead>
            <TableHead className="text-[10px] sm:text-xs border-l px-1.5 sm:px-4">Qtd</TableHead>
            <TableHead className="text-[10px] sm:text-xs px-1.5 sm:px-4 whitespace-nowrap">Honorários</TableHead>
            <TableHead className="text-[10px] sm:text-xs border-l px-1.5 sm:px-4">Qtd</TableHead>
            <TableHead className="text-[10px] sm:text-xs px-1.5 sm:px-4 whitespace-nowrap">Honorários</TableHead>
            <TableHead className="text-[10px] sm:text-xs border-l px-1.5 sm:px-4">Qtd</TableHead>
            <TableHead className="text-[10px] sm:text-xs px-1.5 sm:px-4 whitespace-nowrap">Honorários</TableHead>
            <TableHead className="text-[10px] sm:text-xs border-l px-1.5 sm:px-4"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.months.map(m => {
            const examesMenos15 = m.examesTotal * 0.85;
            const examesLiq = calcExamesLiquido(m.examesTotal);
            const consultasMenos15 = m.consultasTotal * 0.85;
            const consultasLiq = calcConsultasLiquido(m.consultasTotal);
            const totalLiq = getMonthNetIncome(m);

            return (
              <TableRow key={m.month} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium sticky left-0 bg-card z-10 text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap">{MONTHS[m.month]}</TableCell>
                <TableCell className="border-l px-1.5 sm:px-4"><CellInput month={m.month} field="examesTotal" value={m.examesTotal} /></TableCell>
                <TableCell className="px-1.5 sm:px-4"><CalcCell value={examesMenos15} /></TableCell>
                <TableCell className="px-1.5 sm:px-4"><CalcCell value={examesLiq} /></TableCell>
                <TableCell className="border-l px-1.5 sm:px-4"><CellInput month={m.month} field="consultasQtd" value={m.consultasQtd} /></TableCell>
                <TableCell className="px-1.5 sm:px-4"><CellInput month={m.month} field="consultasTotal" value={m.consultasTotal} /></TableCell>
                <TableCell className="px-1.5 sm:px-4"><CalcCell value={consultasMenos15} /></TableCell>
                <TableCell className="px-1.5 sm:px-4"><CalcCell value={consultasLiq} /></TableCell>
                <TableCell className="border-l px-1.5 sm:px-4"><CellInput month={m.month} field="yagQtd" value={m.yagQtd} /></TableCell>
                <TableCell className="px-1.5 sm:px-4"><CellInput month={m.month} field="yagHonorarios" value={m.yagHonorarios} /></TableCell>
                <TableCell className="border-l px-1.5 sm:px-4"><CellInput month={m.month} field="iridecQtd" value={m.iridecQtd} /></TableCell>
                <TableCell className="px-1.5 sm:px-4"><CellInput month={m.month} field="iridecHonorarios" value={m.iridecHonorarios} /></TableCell>
                <TableCell className="border-l px-1.5 sm:px-4"><CellInput month={m.month} field="laserQtd" value={m.laserQtd} /></TableCell>
                <TableCell className="px-1.5 sm:px-4"><CellInput month={m.month} field="laserHonorarios" value={m.laserHonorarios} /></TableCell>
                <TableCell className="border-l font-bold text-accent tabular-nums text-xs sm:text-sm px-1.5 sm:px-4 whitespace-nowrap">{fmt(totalLiq)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
