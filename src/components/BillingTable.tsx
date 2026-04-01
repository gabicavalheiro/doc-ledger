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

  const handleChange = (month: number, field: keyof MonthlyBilling, value: string) => {
    const num = parseFloat(value) || 0;
    onUpdate?.(month, { [field]: num });
  };

  const CellInput = ({ month, field, value }: { month: number; field: keyof MonthlyBilling; value: number }) => {
    if (!editable) return <span className="text-sm tabular-nums">{field.includes('Qtd') ? value : fmt(value)}</span>;
    return (
      <Input
        type="number"
        min={0}
        step={field.includes('Qtd') ? 1 : 0.01}
        value={value || ''}
        onChange={e => handleChange(month, field, e.target.value)}
        className="h-8 w-24 text-sm tabular-nums"
      />
    );
  };

  const CalcCell = ({ value }: { value: number }) => (
    <span className="text-sm font-medium tabular-nums text-accent">{fmt(value)}</span>
  );

  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-display font-semibold sticky left-0 bg-muted/50 z-10 min-w-[100px]">Mês</TableHead>
            <TableHead colSpan={3} className="text-center font-display font-semibold border-l">Exames</TableHead>
            <TableHead colSpan={4} className="text-center font-display font-semibold border-l">Consultas</TableHead>
            <TableHead colSpan={2} className="text-center font-display font-semibold border-l">YAG</TableHead>
            <TableHead colSpan={2} className="text-center font-display font-semibold border-l">IRIDEC</TableHead>
            <TableHead colSpan={2} className="text-center font-display font-semibold border-l">LASER</TableHead>
            <TableHead className="text-center font-display font-semibold border-l text-accent">Líquido Total</TableHead>
          </TableRow>
          <TableRow className="bg-muted/30">
            <TableHead className="sticky left-0 bg-muted/30 z-10"></TableHead>
            {/* Exames */}
            <TableHead className="text-xs border-l">Valor Total</TableHead>
            <TableHead className="text-xs">-15%</TableHead>
            <TableHead className="text-xs">50% (Líq.)</TableHead>
            {/* Consultas */}
            <TableHead className="text-xs border-l">Qtd</TableHead>
            <TableHead className="text-xs">Valor Total</TableHead>
            <TableHead className="text-xs">-15%</TableHead>
            <TableHead className="text-xs">70% (Líq.)</TableHead>
            {/* YAG */}
            <TableHead className="text-xs border-l">Qtd</TableHead>
            <TableHead className="text-xs">Honorários</TableHead>
            {/* IRIDEC */}
            <TableHead className="text-xs border-l">Qtd</TableHead>
            <TableHead className="text-xs">Honorários</TableHead>
            {/* LASER */}
            <TableHead className="text-xs border-l">Qtd</TableHead>
            <TableHead className="text-xs">Honorários</TableHead>
            {/* Total */}
            <TableHead className="text-xs border-l"></TableHead>
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
                <TableCell className="font-medium sticky left-0 bg-card z-10">{MONTHS[m.month]}</TableCell>
                {/* Exames */}
                <TableCell className="border-l"><CellInput month={m.month} field="examesTotal" value={m.examesTotal} /></TableCell>
                <TableCell><CalcCell value={examesMenos15} /></TableCell>
                <TableCell><CalcCell value={examesLiq} /></TableCell>
                {/* Consultas */}
                <TableCell className="border-l"><CellInput month={m.month} field="consultasQtd" value={m.consultasQtd} /></TableCell>
                <TableCell><CellInput month={m.month} field="consultasTotal" value={m.consultasTotal} /></TableCell>
                <TableCell><CalcCell value={consultasMenos15} /></TableCell>
                <TableCell><CalcCell value={consultasLiq} /></TableCell>
                {/* YAG */}
                <TableCell className="border-l"><CellInput month={m.month} field="yagQtd" value={m.yagQtd} /></TableCell>
                <TableCell><CellInput month={m.month} field="yagHonorarios" value={m.yagHonorarios} /></TableCell>
                {/* IRIDEC */}
                <TableCell className="border-l"><CellInput month={m.month} field="iridecQtd" value={m.iridecQtd} /></TableCell>
                <TableCell><CellInput month={m.month} field="iridecHonorarios" value={m.iridecHonorarios} /></TableCell>
                {/* LASER */}
                <TableCell className="border-l"><CellInput month={m.month} field="laserQtd" value={m.laserQtd} /></TableCell>
                <TableCell><CellInput month={m.month} field="laserHonorarios" value={m.laserHonorarios} /></TableCell>
                {/* Total */}
                <TableCell className="border-l font-bold text-accent tabular-nums">{fmt(totalLiq)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
