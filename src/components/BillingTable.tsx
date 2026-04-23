import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FolderTree, MinusCircle, TrendingUp } from 'lucide-react';

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
  parent_id: string | null;
  is_deduction: boolean;
}

interface Entry {
  id?: string;
  month: number;
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

const round2 = (n: number) => Math.round(n * 100) / 100;

function computeDerived(cat: Category, gross: number, quantity: number) {
  if (cat.calculation_type === 'percentage') {
    const retention = round2(gross * (cat.retention_percentage / 100));
    const net = gross - retention;
    const repasse = round2(net * (cat.repasse_percentage / 100));
    return { retention_amount: retention, repasse_amount: repasse, fixed_fee_amount: 0 };
  }
  if (cat.calculation_type === 'fixed_fee') {
    return { retention_amount: 0, repasse_amount: 0, fixed_fee_amount: gross };
  }
  // mixed
  const retention = round2(gross * (cat.retention_percentage / 100));
  const net = gross - retention;
  const repasse = round2(net * (cat.repasse_percentage / 100));
  const fixed = round2(quantity * Number(cat.fixed_fee || 0));
  return { retention_amount: retention, repasse_amount: repasse, fixed_fee_amount: fixed };
}

function entryNet(cat: Category, e: Entry): number {
  if (cat.calculation_type === 'percentage') return e.repasse_amount;
  if (cat.calculation_type === 'fixed_fee')  return e.fixed_fee_amount;
  return e.repasse_amount + e.fixed_fee_amount;
}

export default function BillingTable({ doctorId, year, editable = false, onStatsChange }: BillingTableProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const debounceRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Ref que sempre tem a versão mais atualizada dos entries
  // (o state do React é stale dentro de closures de setTimeout)
  const entriesRef = useRef<Map<string, Entry>>(new Map());

  const entryKey = (month: number, catId: string) => `${month}-${catId}`;

  const emptyEntry = (month: number, catId: string): Entry => ({
    month, category_id: catId,
    gross_amount: 0, quantity: 0,
    retention_amount: 0, repasse_amount: 0, fixed_fee_amount: 0,
  });

  useEffect(() => {
    supabase
      .from('payment_categories')
      .select('id, name, calculation_type, retention_percentage, repasse_percentage, fixed_fee, parent_id, is_deduction')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setCategories((data || []) as Category[]));
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    const startDate = `${year}-01-01`;
    const endDate   = `${year}-12-31`;

    const { data } = await (supabase as any)
      .from('billing_entries')
      .select('id, reference_month, category_id, gross_amount, quantity, retention_amount, repasse_amount, fixed_fee_amount')
      .eq('doctor_id', doctorId)
      .gte('reference_month', startDate)
      .lte('reference_month', endDate) as { data: any[] | null };

    const map = new Map<string, Entry>();
    (data || []).forEach((row: any) => {
      const month = new Date(row.reference_month).getUTCMonth();
      map.set(entryKey(month, row.category_id), {
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
    entriesRef.current = map;
    setEntries(map);
    setLoading(false);
  }, [doctorId, year]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const { roots, leavesByRoot } = useMemo(() => {
    const roots = categories.filter(c => !c.parent_id);
    const leavesByRoot = new Map<string, Category[]>();
    for (const root of roots) {
      const kids = categories.filter(c => c.parent_id === root.id);
      leavesByRoot.set(root.id, kids.length > 0 ? kids : [root]);
    }
    return { roots, leavesByRoot };
  }, [categories]);

  const getEntry = useCallback((month: number, catId: string): Entry =>
    entries.get(entryKey(month, catId)) ?? emptyEntry(month, catId),
  [entries]);

  useEffect(() => {
    if (!onStatsChange || categories.length === 0) return;
    let totalBruto = 0, totalLiquido = 0, totalConsultas = 0, totalProcedimentos = 0;

    entries.forEach(e => {
      const cat = categories.find(c => c.id === e.category_id);
      if (!cat) return;
      totalBruto += e.gross_amount;
      const root = cat.parent_id ? categories.find(c => c.id === cat.parent_id) : cat;
      const net = entryNet(cat, e);
      totalLiquido += root?.is_deduction ? -net : net;
      if (cat.calculation_type === 'fixed_fee') totalProcedimentos += e.quantity;
      if (cat.name.toLowerCase().includes('consulta')) totalConsultas += e.quantity || 1;
    });

    onStatsChange({ totalBruto, totalLiquido, totalConsultas, totalProcedimentos });
  }, [entries, categories, onStatsChange]);

  // ─── Salva uma entry — recebe a entry final, não lê do state ───
  const saveEntry = async (month: number, cat: Category, key: string, entryToSave: Entry) => {
    setSaving(prev => new Set(prev).add(key));

    const refMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const payload: any = {
      doctor_id:        doctorId,
      category_id:      cat.id,
      reference_month:  refMonth,
      gross_amount:     entryToSave.gross_amount,
      quantity:         entryToSave.quantity,
      retention_amount: entryToSave.retention_amount,
      repasse_amount:   entryToSave.repasse_amount,
      fixed_fee_amount: entryToSave.fixed_fee_amount,
    };

    const { data, error } = await (supabase as any)
      .from('billing_entries')
      .upsert(payload, { onConflict: 'doctor_id,category_id,reference_month', ignoreDuplicates: false })
      .select('id, gross_amount, quantity, retention_amount, repasse_amount, fixed_fee_amount')
      .single() as { data: any; error: any };

    if (!error && data) {
      const fresh: Entry = {
        month, category_id: cat.id, id: data.id,
        gross_amount:     Number(data.gross_amount),
        quantity:         Number(data.quantity),
        retention_amount: Number(data.retention_amount),
        repasse_amount:   Number(data.repasse_amount),
        fixed_fee_amount: Number(data.fixed_fee_amount),
      };
      // Só atualiza o state se o que está na ref ainda é o valor que acabamos de enviar.
      // Se o usuário já digitou algo diferente, mantemos o novo (otimista) e deixamos
      // o próximo save sobrescrever no banco.
      const currentRef = entriesRef.current.get(key);
      if (
        currentRef &&
        currentRef.gross_amount === entryToSave.gross_amount &&
        currentRef.quantity === entryToSave.quantity
      ) {
        const next = new Map(entriesRef.current);
        next.set(key, fresh);
        entriesRef.current = next;
        setEntries(next);
      }
    }

    setSaving(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleChange = (month: number, cat: Category, field: 'gross_amount' | 'quantity', raw: string) => {
    const value = parseFloat(raw) || 0;
    const key = entryKey(month, cat.id);

    // Computa a entry final AGORA, baseado na ref (sempre atual)
    const current = entriesRef.current.get(key) ?? emptyEntry(month, cat.id);
    const updated = { ...current, [field]: value };
    const derived = computeDerived(cat, updated.gross_amount, updated.quantity);
    const finalEntry: Entry = { ...updated, ...derived };

    // Atualiza ref e state
    const nextMap = new Map(entriesRef.current);
    nextMap.set(key, finalEntry);
    entriesRef.current = nextMap;
    setEntries(nextMap);

    // Debounce do save — passa a entry como argumento para evitar closure stale
    const existing = debounceRef.current.get(key);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => saveEntry(month, cat, key, finalEntry), 800);
    debounceRef.current.set(key, timeout);
  };

  const rootMonthNet = useCallback((rootId: string, month: number): number => {
    const leaves = leavesByRoot.get(rootId) ?? [];
    return leaves.reduce((sum, leaf) => sum + entryNet(leaf, getEntry(month, leaf.id)), 0);
  }, [leavesByRoot, getEntry]);

  const monthGrandTotal = useCallback((month: number): number =>
    roots.reduce((sum, root) => {
      const net = rootMonthNet(root.id, month);
      return sum + (root.is_deduction ? -net : net);
    }, 0),
  [roots, rootMonthNet]);

  const subCols = (cat: Category) => {
    if (cat.calculation_type === 'percentage') return 3;
    if (cat.calculation_type === 'fixed_fee')  return 2;
    return 4;
  };

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
    <div className="space-y-6">
      {roots.map(root => {
        const leaves = leavesByRoot.get(root.id) ?? [];
        return (
          <CategoryGroupTable
            key={root.id}
            root={root}
            leaves={leaves}
            editable={editable}
            getEntry={getEntry}
            handleChange={handleChange}
            saving={saving}
            rootMonthNet={(m) => rootMonthNet(root.id, m)}
            subCols={subCols}
            loadedKey={entriesRef.current.size}
          />
        );
      })}

      <SummaryTable
        roots={roots}
        rootMonthNet={rootMonthNet}
        monthGrandTotal={monthGrandTotal}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════
interface CategoryGroupTableProps {
  root: Category;
  leaves: Category[];
  editable: boolean;
  getEntry: (month: number, catId: string) => Entry;
  handleChange: (month: number, cat: Category, field: 'gross_amount' | 'quantity', raw: string) => void;
  saving: Set<string>;
  rootMonthNet: (month: number) => number;
  subCols: (cat: Category) => number;
  loadedKey: number;
}

function CategoryGroupTable({
  root, leaves, editable, getEntry, handleChange, saving, rootMonthNet, subCols, loadedKey,
}: CategoryGroupTableProps) {
  const entryKey = (month: number, catId: string) => `${month}-${catId}`;
  const Icon = root.is_deduction ? MinusCircle : FolderTree;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className={`px-4 py-3 flex items-center gap-2 border-b ${root.is_deduction ? 'bg-destructive/10' : 'bg-primary/5'}`}>
        <Icon className={`w-4 h-4 ${root.is_deduction ? 'text-destructive' : 'text-primary'}`} />
        <h3 className="font-display font-semibold text-sm sm:text-base">{root.name}</h3>
        {root.is_deduction && <span className="text-xs text-destructive font-medium">(dedução)</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="sticky left-0 z-20 bg-muted/60 px-3 py-2.5 text-left font-semibold min-w-[90px] border-b" rowSpan={2}>Mês</th>
              {leaves.map(leaf => (
                <th key={leaf.id} colSpan={subCols(leaf)} className="border-l border-b px-3 py-2.5 text-center font-semibold text-primary whitespace-nowrap">
                  {leaf.name}
                </th>
              ))}
              <th className={`border-l border-b px-3 py-2.5 text-center font-semibold whitespace-nowrap ${root.is_deduction ? 'text-destructive' : 'text-green-600'}`} rowSpan={2}>
                Subtotal
              </th>
            </tr>
            <tr className="bg-muted/40 text-xs text-muted-foreground">
              {leaves.map(leaf => {
                if (leaf.calculation_type === 'percentage') return (
                  <>
                    <th key={`${leaf.id}-vt`}  className="border-l border-b px-2 py-1.5 text-center font-medium whitespace-nowrap">Valor Total</th>
                    <th key={`${leaf.id}-ret`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-orange-500">-{leaf.retention_percentage}%</th>
                    <th key={`${leaf.id}-liq`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-green-600">{leaf.repasse_percentage}% (Líq.)</th>
                  </>
                );
                if (leaf.calculation_type === 'fixed_fee') return (
                  <>
                    <th key={`${leaf.id}-qtd`} className="border-l border-b px-2 py-1.5 text-center font-medium whitespace-nowrap">Qtd</th>
                    <th key={`${leaf.id}-hon`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-green-600">Honorários</th>
                  </>
                );
                return (
                  <>
                    <th key={`${leaf.id}-qtd`} className="border-l border-b px-2 py-1.5 text-center font-medium whitespace-nowrap">Qtd</th>
                    <th key={`${leaf.id}-vt`}  className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap">Valor Total</th>
                    <th key={`${leaf.id}-ret`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-orange-500">-{leaf.retention_percentage}%</th>
                    <th key={`${leaf.id}-liq`} className="border-b px-2 py-1.5 text-center font-medium whitespace-nowrap text-green-600">{leaf.repasse_percentage}% (Líq.)</th>
                  </>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {MONTHS.map((monthName, month) => {
              const subtotal = rootMonthNet(month);
              const isSaving = leaves.some(leaf => saving.has(entryKey(month, leaf.id)));

              return (
                <tr key={month} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium text-sm whitespace-nowrap border-r">
                    <span className="flex items-center gap-1.5">
                      {monthName}
                      {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                    </span>
                  </td>

                  {leaves.map(leaf => {
                    const e = getEntry(month, leaf.id);
                    const key = entryKey(month, leaf.id);
                    // key composto garante que o input remonta quando o dado carrega do banco
                    const inputKey = `${key}-${loadedKey}`;

                    if (leaf.calculation_type === 'percentage') return (
                      <>
                        <td key={`${key}-vt`} className="border-l px-2 py-1.5">
                          {editable ? (
                            <input key={inputKey} type="number" min="0" step="0.01" defaultValue={e.gross_amount || ''} placeholder="0"
                              onChange={ev => handleChange(month, leaf, 'gross_amount', ev.target.value)}
                              className="w-28 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
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

                    if (leaf.calculation_type === 'fixed_fee') return (
                      <>
                        <td key={`${key}-qtd`} className="border-l px-2 py-1.5">
                          {editable ? (
                            <input key={`${inputKey}-q`} type="number" min="0" step="1" defaultValue={e.quantity || ''} placeholder="0"
                              onChange={ev => handleChange(month, leaf, 'quantity', ev.target.value)}
                              className="w-16 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                          ) : <span className="text-sm">{e.quantity || 0}</span>}
                        </td>
                        <td key={`${key}-hon`} className="px-2 py-1.5 text-center">
                          {editable ? (
                            <input key={`${inputKey}-h`} type="number" min="0" step="0.01" defaultValue={e.gross_amount || ''} placeholder="0,00"
                              onChange={ev => handleChange(month, leaf, 'gross_amount', ev.target.value)}
                              className="w-28 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                          ) : <span className="text-green-600 font-medium text-sm">{fmt(e.gross_amount)}</span>}
                        </td>
                      </>
                    );

                    return (
                      <>
                        <td key={`${key}-qtd`} className="border-l px-2 py-1.5">
                          {editable ? (
                            <input key={`${inputKey}-q`} type="number" min="0" step="1" defaultValue={e.quantity || ''} placeholder="0"
                              onChange={ev => handleChange(month, leaf, 'quantity', ev.target.value)}
                              className="w-16 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                          ) : <span className="text-sm">{e.quantity || 0}</span>}
                        </td>
                        <td key={`${key}-vt`} className="px-2 py-1.5">
                          {editable ? (
                            <input key={`${inputKey}-v`} type="number" min="0" step="0.01" defaultValue={e.gross_amount || ''} placeholder="0"
                              onChange={ev => handleChange(month, leaf, 'gross_amount', ev.target.value)}
                              className="w-28 h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                          ) : <span className="text-sm">{fmt(e.gross_amount)}</span>}
                        </td>
                        <td key={`${key}-ret`} className="px-2 py-1.5 text-center text-orange-500 text-sm tabular-nums">
                          {e.gross_amount > 0 ? fmt(e.retention_amount) : <span className="text-muted-foreground">R$ 0,00</span>}
                        </td>
                        <td key={`${key}-liq`} className="px-2 py-1.5 text-center text-green-600 font-medium text-sm tabular-nums">
                          {(e.gross_amount > 0 || e.fixed_fee_amount > 0) ? fmt(e.repasse_amount + e.fixed_fee_amount) : <span className="text-muted-foreground font-normal">R$ 0,00</span>}
                        </td>
                      </>
                    );
                  })}

                  <td className={`border-l px-3 py-1.5 text-center font-bold tabular-nums whitespace-nowrap ${root.is_deduction ? 'text-destructive' : 'text-green-600'}`}>
                    {root.is_deduction && subtotal > 0 ? '−' : ''}{fmt(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
interface SummaryTableProps {
  roots: Category[];
  rootMonthNet: (rootId: string, month: number) => number;
  monthGrandTotal: (month: number) => number;
}

function SummaryTable({ roots, rootMonthNet, monthGrandTotal }: SummaryTableProps) {
  if (roots.length === 0) return null;

  const yearTotalByRoot = (rootId: string) =>
    MONTHS.reduce((sum, _, m) => sum + rootMonthNet(rootId, m), 0);
  const grandYearTotal = MONTHS.reduce((sum, _, m) => sum + monthGrandTotal(m), 0);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b bg-gradient-primary">
        <TrendingUp className="w-4 h-4 text-primary-foreground" />
        <h3 className="font-display font-semibold text-sm sm:text-base text-primary-foreground">
          Resumo — Total Líquido
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="sticky left-0 z-20 bg-muted/60 px-3 py-2.5 text-left font-semibold min-w-[90px] border-b">Mês</th>
              {roots.map(root => (
                <th key={root.id} className={`border-l border-b px-3 py-2.5 text-center font-semibold whitespace-nowrap ${root.is_deduction ? 'text-destructive' : 'text-primary'}`}>
                  {root.name}
                  {root.is_deduction && <span className="ml-1 text-xs">(−)</span>}
                </th>
              ))}
              <th className="border-l border-b px-3 py-2.5 text-center font-semibold text-green-600 whitespace-nowrap">Total Líq.</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((monthName, month) => {
              const total = monthGrandTotal(month);
              return (
                <tr key={month} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium text-sm whitespace-nowrap border-r">{monthName}</td>
                  {roots.map(root => {
                    const v = rootMonthNet(root.id, month);
                    return (
                      <td key={root.id} className={`border-l px-3 py-2 text-center text-sm tabular-nums ${root.is_deduction ? 'text-destructive' : ''}`}>
                        {root.is_deduction && v > 0 ? '−' : ''}{fmt(v)}
                      </td>
                    );
                  })}
                  <td className="border-l px-3 py-2 text-center font-bold text-green-600 tabular-nums whitespace-nowrap">{fmt(total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-bold">
              <td className="sticky left-0 z-10 bg-muted/40 px-3 py-2.5 font-semibold text-sm whitespace-nowrap border-r">Ano</td>
              {roots.map(root => {
                const v = yearTotalByRoot(root.id);
                return (
                  <td key={root.id} className={`border-l px-3 py-2.5 text-center tabular-nums ${root.is_deduction ? 'text-destructive' : ''}`}>
                    {root.is_deduction && v > 0 ? '−' : ''}{fmt(v)}
                  </td>
                );
              })}
              <td className="border-l px-3 py-2.5 text-center text-green-600 tabular-nums whitespace-nowrap">{fmt(grandYearTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}