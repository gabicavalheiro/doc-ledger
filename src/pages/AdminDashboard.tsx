import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

interface Category {
  id: string;
  name: string;
  calculation_type: string;
  retention_percentage: number;
  repasse_percentage: number;
  fixed_fee: number;
}

interface Entry {
  id?: string;
  month: number; // 0-11
  category_id: string;
  gross_amount: number;
  quantity: number;
  retention_amount: number;
  repasse_amount: number;
  fixed_fee_amount: number;
}

interface BillingTableProps {
  doctorId: string;
  year: number;
  editable?: boolean;
  onStatsChange?: (stats: {
    totalBruto: number;
    totalLiquido: number;
    totalConsultas: number;
    totalProcedimentos: number;
  }) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function BillingTable({ doctorId, year, editable = false, onStatsChange }: BillingTableProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const debounceRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const entryKey = (month: number, catId: string) => `${month}-${catId}`;

  // Fetch categories
  useEffect(() => {
    supabase
      .from('payment_categories')
      .select('id, name, calculation_type, retention_percentage, repasse_percentage, fixed_fee')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setCategories(data || []));
  }, []);

  // Fetch billing entries for doctor + year
  const fetchEntries = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);

    const startDate = `${year}-01-01`;
    const endDate   = `${year}-12-31`;

    const { data } = await supabase
      .from('billing_entries')
      .select('id, reference_month, category_id, gross_amount, quantity, retention_amount, repasse_amount, fixed_fee_amount')
      .eq('doctor_id', doctorId)
      .gte('reference_month', startDate)
      .lte('reference_month', endDate);

    const map = new Map<string, Entry>();
    (data || []).forEach(row => {
      const month = new Date(row.reference_month).getUTCMonth();
      const key   = entryKey(month, row.category_id);
      map.set(key, {
        id: row.id,
        month,
        category_id: row.category_id,
        gross_amount: Number(row.gross_amount),
        quantity: Number(row.quantity),
        retention_amount: Number(row.retention_amount),
        repasse_amount:   Number(row.repasse_amount),
        fixed_fee_amount: Number(row.fixed_fee_amount),
      });
    });
    setEntries(map);
    setLoading(false);
  }, [doctorId, year]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Compute stats whenever entries change
  useEffect(() => {
    if (!onStatsChange || categories.length === 0) return;
    let totalBruto = 0, totalLiquido = 0, totalConsultas = 0, totalProcedimentos = 0;

    entries.forEach((e, key) => {
      const cat = categories.find(c => c.id === e.category_id);
      if (!cat) return;
      totalBruto += e.gross_amount;
      if (cat.calculation_type === 'percentage') {
        totalLiquido += e.repasse_amount;
      } else if (cat.calculation_type === 'fixed_fee') {
        totalLiquido   += e.fixed_fee_amount;
        totalProcedimentos += e.quantity;
      } else {
        totalLiquido += e.repasse_amount + e.fixed_fee_amount;
      }
      // heuristic: categories named "consulta" count toward totalConsultas
      if (cat.name.toLowerCase().includes('consulta')) {
        totalConsultas += e.quantity || 1;
      }
    });

    onStatsChange({ totalBruto, totalLiquido, totalConsultas, totalProcedimentos });
  }, [entries, categories, onStatsChange]);

  const getEntry = (month: number, catId: string): Entry => {
    return entries.get(entryKey(month, catId)) ?? {
      month, category_id: catId,
      gross_amount: 0, quantity: 0,
      retention_amount: 0, repasse_amount: 0, fixed_fee_amount: 0,
    };
  };

  const handleChange = (month: number, cat: Category, field: 'gross_amount' | 'quantity', raw: string) => {
    const value = parseFloat(raw) || 0;
    const key   = entryKey(month, cat.id);

    // Optimistic local calc
    setEntries(prev => {
      const next = new Map(prev);
      const cur  = getEntry(month, cat.id);
      const updated = { ...cur, [field]: value };

      if (field === 'gross_amount') {
        if (cat.calculation_type === 'percentage') {
          updated.retention_amount = Math.round(value * (cat.retention_percentage / 100) * 100) / 100;
          const net = value - updated.retention_amount;
          updated.repasse_amount   = Math.round(net * (cat.repasse_percentage  / 100) * 100) / 100;
        } else if (cat.calculation_type === 'fixed_fee') {
          updated.fixed_fee_amount = value;
        } else {
          updated.retention_amount = Math.round(value * (cat.retention_percentage / 100) * 100) / 100;
          const net = value - updated.retention_amount;
          updated.repasse_amount   = Math.round(net * (cat.repasse_percentage  / 100) * 100) / 100;
          updated.fixed_fee_amount = cat.fixed_fee;
        }
      }

      next.set(key, updated);
      return next;
    });

    // Debounced save
    const existing = debounceRef.current.get(key);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => saveEntry(month, cat, field, value), 800);
    debounceRef.current.set(key, timeout);
  };

  const saveEntry = async (month: number, cat: Category, field: 'gross_amount' | 'quantity', value: number) => {
    const key     = entryKey(month, cat.id);
    const current = getEntry(month, cat.id);

    setSaving(prev => new Set(prev).add(key));

    // reference_month: first day of the month
    const refMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const payload: any = {
      doctor_id:       doctorId,
      category_id:     cat.id,
      reference_month: refMonth,
      [field]:         value,
    };

    // If updating one field, keep the other
    if (field === 'gross_amount') payload.quantity     = current.quantity;
    if (field === 'quantity')     payload.gross_amount = current.gross_amount;

    const { data, error } = await supabase
      .from('billing_entries')
      .upsert(payload, {
        onConflict:     'doctor_id,category_id,reference_month',
        ignoreDuplicates: false,
      })
      .select('id, gross_amount, quantity, retention_amount, repasse_amount, fixed_fee_amount')
      .single();

    if (!error && data) {
      setEntries(prev => {
        const next = new Map(prev);
        next.set(key, {
          ...current,
          id:               data.id,
          gross_amount:     Number(data.gross_amount),
          quantity:         Number(data.quantity),
          retention_amount: Number(data.retention_amount),
          repasse_amount:   Number(data.repasse_amount),
          fixed_fee_amount: Number(data.fixed_fee_amount),
        });
        return next;
      });
    }

    setSaving(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  // Sub-column counts per category type
  const subCols = (cat: Category) => {
    if (cat.calculation_type === 'percentage') return 3; // Valor Total | -ret% | rep% Líq.
    if (cat.calculation_type === 'fixed_fee')  return 2; // Qtd | Honorários
    return 4; // mixed: Qtd | Valor Total | -ret% | rep% + fixo
  };

  // Row net income
  const rowNet = (month: number) =>
    categories.reduce((sum, cat) => {
      const e = getEntry(month, cat.id);
      if (cat.calculation_type === 'percentage') return sum + e.repasse_amount;
      if (cat.calculation_type === 'fixed_fee')  return sum + e.fixed_fee_amount;
      return sum + e.repasse_amount + e.fixed_fee_amount;
    }, 0);

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
          Cadastre categorias na aba "Categorias" para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full border-collapse text-sm">
        {/* ── GROUP HEADER ── */}
        <thead>
          <tr className="bg-muted/60">
            <th className="sticky left-0 z-20 bg-muted/60 px-3 py-2.5 text-left font-semibold min-w-[90px] border-b" rowSpan={2}>
              Mês
            </th>
            {categories.map(cat => (
              <th
                key={cat.id}
                colSpan={subCols(cat)}
                className="border-l border-b px-3 py-2.5 text-center font-semibold text-primary whitespace-nowrap"
              >
                {cat.name}
              </th>
            ))}
            <th className="border-l border-b px-3 py-2.5 text-center font-semibold text-green-600 whitespace-nowrap" rowSpan={2}>
              Total Líq.
            </th>
          </tr>

          {/* ── SUB-HEADERS ── */}
          <tr className="bg-muted/40 text-xs text-muted-foreground">
            {categories.map(cat => {
              if (cat.calculation_type === 'percentage') return (
                <>
                  <th key={`${cat.id}-vt`}  className="border-l border-b px-2 py-1.5 text-center font-medium whitespace-nowrap">Valor Total</th>
                  <th key={`${cat.id}-ret`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-orange-500">-{cat.retention_percentage}%</th>
                  <th key={`${cat.id}-liq`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-green-600">{cat.repasse_percentage}% (Líq.)</th>
                </>
              );
              if (cat.calculation_type === 'fixed_fee') return (
                <>
                  <th key={`${cat.id}-qtd`} className="border-l border-b px-2 py-1.5 text-center font-medium whitespace-nowrap">Qtd</th>
                  <th key={`${cat.id}-hon`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-green-600">Honorários</th>
                </>
              );
              // mixed
              return (
                <>
                  <th key={`${cat.id}-qtd`} className="border-l border-b px-2 py-1.5 text-center font-medium whitespace-nowrap">Qtd</th>
                  <th key={`${cat.id}-vt`}  className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap">Valor Total</th>
                  <th key={`${cat.id}-ret`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-orange-500">-{cat.retention_percentage}%</th>
                  <th key={`${cat.id}-liq`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-green-600">{cat.repasse_percentage}% (Líq.)</th>
                </>
              );
            })}
          </tr>
        </thead>

        {/* ── ROWS ── */}
        <tbody>
          {MONTHS.map((monthName, month) => {
            const net      = rowNet(month);
            const isSaving = [...saving].some(k => k.startsWith(`${month}-`));

            return (
              <tr key={month} className="border-t hover:bg-muted/20 transition-colors">
                <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium text-sm whitespace-nowrap border-r">
                  <span className="flex items-center gap-1.5">
                    {monthName}
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                  </span>
                </td>

                {categories.map(cat => {
                  const e   = getEntry(month, cat.id);
                  const key = entryKey(month, cat.id);

                  if (cat.calculation_type === 'percentage') return (
                    <>
                      <td key={`${key}-vt`} className="border-l px-2 py-1.5">
                        {editable ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={e.gross_amount || ''}
                            placeholder="0"
                            onChange={ev => handleChange(month, cat, 'gross_amount', ev.target.value)}
                            className="w-28 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <span className="text-sm">{fmt(e.gross_amount)}</span>
                        )}
                      </td>
                      <td key={`${key}-ret`} className="px-2 py-1.5 text-center text-orange-500 text-sm tabular-nums">
                        {e.gross_amount > 0 ? fmt(e.retention_amount) : <span className="text-muted-foreground">R$ 0,00</span>}
                      </td>
                      <td key={`${key}-liq`} className="px-2 py-1.5 text-center text-green-600 font-medium text-sm tabular-nums">
                        {e.gross_amount > 0 ? fmt(e.repasse_amount) : <span className="text-muted-foreground font-normal">R$ 0,00</span>}
                      </td>
                    </>
                  );

                  if (cat.calculation_type === 'fixed_fee') return (
                    <>
                      <td key={`${key}-qtd`} className="border-l px-2 py-1.5">
                        {editable ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={e.quantity || ''}
                            placeholder="0"
                            onChange={ev => handleChange(month, cat, 'quantity', ev.target.value)}
                            className="w-16 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <span className="text-sm">{e.quantity || 0}</span>
                        )}
                      </td>
                      <td key={`${key}-hon`} className="px-2 py-1.5 text-center">
                        {editable ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={e.gross_amount || ''}
                            placeholder="0,00"
                            onChange={ev => handleChange(month, cat, 'gross_amount', ev.target.value)}
                            className="w-28 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <span className="text-green-600 font-medium text-sm">{fmt(e.gross_amount)}</span>
                        )}
                      </td>
                    </>
                  );

                  // mixed
                  return (
                    <>
                      <td key={`${key}-qtd`} className="border-l px-2 py-1.5">
                        {editable ? (
                          <input
                            type="number" min="0" step="1"
                            defaultValue={e.quantity || ''}
                            placeholder="0"
                            onChange={ev => handleChange(month, cat, 'quantity', ev.target.value)}
                            className="w-16 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : <span className="text-sm">{e.quantity || 0}</span>}
                      </td>
                      <td key={`${key}-vt`} className="px-2 py-1.5">
                        {editable ? (
                          <input
                            type="number" min="0" step="0.01"
                            defaultValue={e.gross_amount || ''}
                            placeholder="0"
                            onChange={ev => handleChange(month, cat, 'gross_amount', ev.target.value)}
                            className="w-28 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : <span className="text-sm">{fmt(e.gross_amount)}</span>}
                      </td>
                      <td key={`${key}-ret`} className="px-2 py-1.5 text-center text-orange-500 text-sm tabular-nums">
                        {e.gross_amount > 0 ? fmt(e.retention_amount) : <span className="text-muted-foreground">R$ 0,00</span>}
                      </td>
                      <td key={`${key}-liq`} className="px-2 py-1.5 text-center text-green-600 font-medium text-sm tabular-nums">
                        {e.gross_amount > 0 ? fmt(e.repasse_amount) : <span className="text-muted-foreground font-normal">R$ 0,00</span>}
                      </td>
                    </>
                  );
                })}

                {/* Total Líq. */}
                <td className="border-l px-3 py-1.5 text-center font-bold text-green-600 tabular-nums whitespace-nowrap">
                  {fmt(net)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}