import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Tags, Plus, Trash2, Settings2, FolderTree, MinusCircle, Pencil, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Category {
  id: string;
  name: string;
  calculation_type: string;
  retention_percentage: number;
  repasse_percentage: number;
  fixed_fee: number;
  active: boolean;
  parent_id: string | null;
  is_deduction: boolean;
}

interface Doctor { id: string; name: string; }
interface Unit { id: string; name: string; }

interface DoctorRule {
  id: string;
  doctor_id: string;
  category_id: string;
  unit_id: string | null;
  retention_percentage: number | null;
  repasse_percentage: number | null;
  fixed_fee: number | null;
}

type CalcType = 'percentage' | 'fixed_fee' | 'mixed';

const NO_PARENT = '__none__';
const NO_UNIT = 'all';

export default function ManageCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form de criação
  const [name, setName] = useState('');
  const [calcType, setCalcType] = useState<CalcType>('percentage');
  const [retention, setRetention] = useState('15');
  const [repasse, setRepasse] = useState('50');
  const [fixedFee, setFixedFee] = useState('0');
  const [parentId, setParentId] = useState<string>(NO_PARENT);
  const [isDeduction, setIsDeduction] = useState(false);

  // Dialog de edição
  const [editOpen, setEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editCalcType, setEditCalcType] = useState<CalcType>('percentage');
  const [editRetention, setEditRetention] = useState('0');
  const [editRepasse, setEditRepasse] = useState('0');
  const [editFixedFee, setEditFixedFee] = useState('0');
  const [editParentId, setEditParentId] = useState<string>(NO_PARENT);
  const [editIsDeduction, setEditIsDeduction] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Dialog de regras
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [doctorRules, setDoctorRules] = useState<DoctorRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(NO_UNIT);
  const [ruleRetention, setRuleRetention] = useState('');
  const [ruleRepasse, setRuleRepasse] = useState('');
  const [ruleFixedFee, setRuleFixedFee] = useState('');

  const fetchData = async () => {
    const [catRes, docRes, unitRes] = await Promise.all([
      supabase.from('payment_categories').select('*').order('name'),
      supabase.from('doctors').select('id, name').eq('active', true).order('name'),
      supabase.from('units').select('id, name').eq('active', true).order('name'),
    ]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    if (docRes.data) setDoctors(docRes.data);
    if (unitRes.data) setUnits(unitRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const rootCategories = categories.filter(c => !c.parent_id);
  const childrenByParent = new Map<string, Category[]>();
  categories.forEach(c => {
    if (c.parent_id) {
      const list = childrenByParent.get(c.parent_id) ?? [];
      list.push(c);
      childrenByParent.set(c.parent_id, list);
    }
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const isChild = parentId !== NO_PARENT;
    const { error } = await supabase.from('payment_categories').insert({
      name: name.trim(),
      calculation_type: calcType,
      retention_percentage: parseFloat(retention) || 0,
      repasse_percentage: parseFloat(repasse) || 0,
      fixed_fee: parseFloat(fixedFee) || 0,
      parent_id: isChild ? parentId : null,
      is_deduction: isChild ? false : isDeduction,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Categoria criada!', description: `${name} adicionada.` });
      setName(''); setRetention('15'); setRepasse('50'); setFixedFee('0');
      setCalcType('percentage'); setParentId(NO_PARENT); setIsDeduction(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from('payment_categories').update({ active: !currentActive }).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else fetchData();
  };

  const handleDelete = async (id: string) => {
    const kids = childrenByParent.get(id);
    if (kids && kids.length > 0) {
      toast({
        title: 'Não foi possível remover',
        description: 'Essa categoria possui filhas. Remova as filhas primeiro.',
        variant: 'destructive',
      });
      return;
    }
    const { error } = await supabase.from('payment_categories').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else fetchData();
  };

  // ─── Edit Dialog ───
  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditCalcType(cat.calculation_type as CalcType);
    setEditRetention(String(cat.retention_percentage ?? 0));
    setEditRepasse(String(cat.repasse_percentage ?? 0));
    setEditFixedFee(String(cat.fixed_fee ?? 0));
    setEditParentId(cat.parent_id ?? NO_PARENT);
    setEditIsDeduction(cat.is_deduction);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingCategory) return;
    if (!editName.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    // Não permite a categoria ser mãe de si mesma
    if (editParentId === editingCategory.id) {
      toast({ title: 'Erro', description: 'Uma categoria não pode ser mãe dela mesma.', variant: 'destructive' });
      return;
    }
    // Não permite colocar uma categoria como filha de uma das suas próprias filhas
    const kids = childrenByParent.get(editingCategory.id) ?? [];
    if (editParentId !== NO_PARENT && kids.some(k => k.id === editParentId)) {
      toast({ title: 'Erro', description: 'Ciclo inválido: essa categoria é mãe da selecionada.', variant: 'destructive' });
      return;
    }

    setEditSaving(true);
    const willBeChild = editParentId !== NO_PARENT;

    const payload = {
      name: editName.trim(),
      calculation_type: editCalcType,
      retention_percentage: parseFloat(editRetention) || 0,
      repasse_percentage: parseFloat(editRepasse) || 0,
      fixed_fee: parseFloat(editFixedFee) || 0,
      parent_id: willBeChild ? editParentId : null,
      // filhas nunca são dedução — a dedução é herdada da mãe
      is_deduction: willBeChild ? false : editIsDeduction,
    };

    const { error } = await supabase
      .from('payment_categories')
      .update(payload)
      .eq('id', editingCategory.id);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Categoria atualizada!' });
      setEditOpen(false);
      setEditingCategory(null);
      fetchData();
    }
    setEditSaving(false);
  };

  // ─── Rules Dialog ───
  const fetchRules = async (categoryId: string) => {
    const { data } = await supabase.from('doctor_category_rules').select('*').eq('category_id', categoryId);
    setDoctorRules(data || []);
  };

  const openRules = async (cat: Category) => {
    setSelectedCategory(cat);
    setRulesOpen(true);
    setRulesLoading(true);
    await fetchRules(cat.id);
    setRulesLoading(false);
  };

  const handleAddRule = async () => {
    if (!selectedDoctor || !selectedCategory) return;
    setRulesSaving(true);
    const unit_id = selectedUnit && selectedUnit !== NO_UNIT ? selectedUnit : null;
    const values = {
      retention_percentage: ruleRetention.trim() ? parseFloat(ruleRetention) : null,
      repasse_percentage:   ruleRepasse.trim()   ? parseFloat(ruleRepasse)   : null,
      fixed_fee:            ruleFixedFee.trim()  ? parseFloat(ruleFixedFee)  : null,
    };

    let q = supabase
      .from('doctor_category_rules')
      .select('id')
      .eq('doctor_id', selectedDoctor)
      .eq('category_id', selectedCategory.id);
    q = unit_id === null ? q.is('unit_id', null) : q.eq('unit_id', unit_id);

    const { data: existing, error: findErr } = await q.maybeSingle();
    if (findErr) {
      toast({ title: 'Erro', description: findErr.message, variant: 'destructive' });
      setRulesSaving(false);
      return;
    }

    let error;
    if (existing) {
      const res = await supabase.from('doctor_category_rules').update(values).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('doctor_category_rules').insert({
        doctor_id: selectedDoctor,
        category_id: selectedCategory.id,
        unit_id,
        ...values,
      });
      error = res.error;
    }

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Regra salva!' });
      setSelectedDoctor(''); setSelectedUnit(NO_UNIT);
      setRuleRetention(''); setRuleRepasse(''); setRuleFixedFee('');
      await fetchRules(selectedCategory.id);
    }
    setRulesSaving(false);
  };

  const handleDeleteRule = async (ruleId: string) => {
    await supabase.from('doctor_category_rules').delete().eq('id', ruleId);
    if (selectedCategory) await fetchRules(selectedCategory.id);
  };

  const getDoctorName = (id: string) => doctors.find(d => d.id === id)?.name || id;
  const getUnitName = (id: string | null) => id ? (units.find(u => u.id === id)?.name || id) : 'Todas';

  const renderCategoryRow = (c: Category, isChild = false) => (
    <div
      key={c.id}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg transition-colors ${
        c.active ? 'bg-muted/50 hover:bg-muted' : 'bg-muted/20 opacity-60'
      } ${isChild ? 'ml-6 border-l-2 border-primary/30 pl-4' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.active ? 'bg-primary/10' : 'bg-muted'}`}>
          {c.is_deduction
            ? <MinusCircle className={`w-4 h-4 ${c.active ? 'text-destructive' : 'text-muted-foreground'}`} />
            : isChild
              ? <Tags className={`w-4 h-4 ${c.active ? 'text-primary' : 'text-muted-foreground'}`} />
              : <FolderTree className={`w-4 h-4 ${c.active ? 'text-primary' : 'text-muted-foreground'}`} />
          }
        </div>
        <div className="min-w-0">
          <span className={`font-medium text-sm block truncate ${!c.active ? 'line-through text-muted-foreground' : ''}`}>
            {c.name}
          </span>
          <div className="text-xs text-muted-foreground">
            {c.calculation_type === 'percentage' && (
              <span>Ret: {c.retention_percentage}% · Rep: {c.repasse_percentage}%</span>
            )}
            {c.calculation_type === 'mixed' && (
              <span>Ret: {c.retention_percentage}% · Rep: {c.repasse_percentage}% · Fixo: R$ {Number(c.fixed_fee).toFixed(2)}</span>
            )}
            {c.calculation_type === 'fixed_fee' && (
              <span>Fixo: R$ {Number(c.fixed_fee).toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap justify-end">
        {!isChild && (
          <Badge variant={c.is_deduction ? 'destructive' : 'outline'} className="text-[10px] sm:text-xs">
            {c.is_deduction ? 'Dedução (−)' : 'Receita (+)'}
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] sm:text-xs">
          {c.calculation_type === 'percentage' ? 'Percentual' : c.calculation_type === 'mixed' ? 'Misto' : 'Valor Fixo'}
        </Badge>
        <Switch checked={c.active} onCheckedChange={() => handleToggleActive(c.id, c.active)} className="scale-75" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} title="Editar categoria">
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRules(c)} title="Regras por médico">
          <Settings2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(c.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Card className="border-0 shadow-card">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary" />
            Categorias de Pagamento
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Crie convênios (categorias-mãe) e subcategorias (ex: consulta, exame). Marque como dedução se subtrai do total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="space-y-2 lg:col-span-2">
              <Label className="text-xs sm:text-sm">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Unimed, ou Consulta Unimed" required maxLength={100} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Categoria-mãe</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>— Nenhuma (raiz) —</SelectItem>
                  {rootCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Tipo de cálculo</Label>
              <Select value={calcType} onValueChange={v => setCalcType(v as CalcType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual</SelectItem>
                  <SelectItem value="fixed_fee">Valor Fixo</SelectItem>
                  <SelectItem value="mixed">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(calcType === 'percentage' || calcType === 'mixed') && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Retenção padrão (%)</Label>
                  <Input type="number" step="0.01" value={retention} onChange={e => setRetention(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Repasse padrão (%)</Label>
                  <Input type="number" step="0.01" value={repasse} onChange={e => setRepasse(e.target.value)} className="h-9" />
                </div>
              </>
            )}
            {(calcType === 'fixed_fee' || calcType === 'mixed') && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Valor Fixo padrão (R$)</Label>
                <Input type="number" step="0.01" value={fixedFee} onChange={e => setFixedFee(e.target.value)} className="h-9" />
              </div>
            )}
            {parentId === NO_PARENT && (
              <div className="flex items-center gap-2 h-9 mt-auto">
                <Switch checked={isDeduction} onCheckedChange={setIsDeduction} />
                <Label className="text-xs sm:text-sm cursor-pointer" onClick={() => setIsDeduction(!isDeduction)}>
                  É dedução (subtrai do total)
                </Label>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 h-9">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Adicionar
              </Button>
            </div>
          </form>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : categories.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma categoria cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {rootCategories.map(root => (
                <div key={root.id} className="space-y-2">
                  {renderCategoryRow(root)}
                  {(childrenByParent.get(root.id) ?? []).map(child => renderCategoryRow(child, true))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════ EDIT DIALOG ═══════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base sm:text-lg">
              Editar — {editingCategory?.name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Altere os dados padrão dessa categoria. Regras específicas por médico ficam no outro diálogo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} className="h-9" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Categoria-mãe</Label>
                <Select value={editParentId} onValueChange={setEditParentId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>— Nenhuma (raiz) —</SelectItem>
                    {rootCategories
                      .filter(c => c.id !== editingCategory?.id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Tipo de cálculo</Label>
                <Select value={editCalcType} onValueChange={v => setEditCalcType(v as CalcType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    <SelectItem value="fixed_fee">Valor Fixo</SelectItem>
                    <SelectItem value="mixed">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(editCalcType === 'percentage' || editCalcType === 'mixed') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Retenção padrão (%)</Label>
                    <Input type="number" step="0.01" value={editRetention} onChange={e => setEditRetention(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Repasse padrão (%)</Label>
                    <Input type="number" step="0.01" value={editRepasse} onChange={e => setEditRepasse(e.target.value)} className="h-9" />
                  </div>
                </>
              )}

              {(editCalcType === 'fixed_fee' || editCalcType === 'mixed') && (
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs sm:text-sm">Valor Fixo padrão (R$)</Label>
                  <Input type="number" step="0.01" value={editFixedFee} onChange={e => setEditFixedFee(e.target.value)} className="h-9" />
                </div>
              )}

              {editParentId === NO_PARENT && (
                <div className="flex items-center gap-2 h-9 sm:col-span-2">
                  <Switch checked={editIsDeduction} onCheckedChange={setEditIsDeduction} />
                  <Label className="text-xs sm:text-sm cursor-pointer" onClick={() => setEditIsDeduction(!editIsDeduction)}>
                    É dedução (subtrai do total)
                  </Label>
                </div>
              )}
            </div>

            {editingCategory && editCalcType !== editingCategory.calculation_type && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                ⚠️ Você está alterando o tipo de cálculo de{' '}
                <strong>
                  {editingCategory.calculation_type === 'percentage' ? 'Percentual'
                    : editingCategory.calculation_type === 'fixed_fee' ? 'Valor Fixo' : 'Misto'}
                </strong>
                {' '}para{' '}
                <strong>
                  {editCalcType === 'percentage' ? 'Percentual'
                    : editCalcType === 'fixed_fee' ? 'Valor Fixo' : 'Misto'}
                </strong>
                . Lançamentos existentes não serão recalculados automaticamente — edite cada mês para atualizar.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ RULES DIALOG ═══════ */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-base sm:text-lg">
              Regras — {selectedCategory?.name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Valores personalizados por médico. Quando não definido, usa o padrão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Médico</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Unidade</Label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Todas (padrão)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_UNIT}>Todas</SelectItem>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(selectedCategory?.calculation_type === 'percentage' || selectedCategory?.calculation_type === 'mixed') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Retenção (%)</Label>
                    <Input type="number" step="0.01" value={ruleRetention} onChange={e => setRuleRetention(e.target.value)} placeholder={`Padrão: ${selectedCategory.retention_percentage}%`} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Repasse (%)</Label>
                    <Input type="number" step="0.01" value={ruleRepasse} onChange={e => setRuleRepasse(e.target.value)} placeholder={`Padrão: ${selectedCategory.repasse_percentage}%`} className="h-9" />
                  </div>
                </>
              )}
              {(selectedCategory?.calculation_type === 'fixed_fee' || selectedCategory?.calculation_type === 'mixed') && (
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs sm:text-sm">Valor Fixo (R$)</Label>
                  <Input type="number" step="0.01" value={ruleFixedFee} onChange={e => setRuleFixedFee(e.target.value)} placeholder={`Padrão: R$ ${Number(selectedCategory?.fixed_fee || 0).toFixed(2)}`} className="h-9" />
                </div>
              )}
              <div className="sm:col-span-2">
                <Button onClick={handleAddRule} disabled={rulesSaving || !selectedDoctor} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 h-9">
                  {rulesSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                  Salvar Regra
                </Button>
              </div>
            </div>

            {rulesLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : doctorRules.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-2">Nenhuma regra personalizada.</p>
            ) : (
              <div className="space-y-2">
                {doctorRules.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-xs sm:text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{getDoctorName(r.doctor_id)}</span>
                      <span className="text-muted-foreground ml-1 sm:ml-2 text-[10px] sm:text-xs">📍 {getUnitName(r.unit_id)}</span>
                      <span className="text-muted-foreground ml-1 sm:ml-2 block sm:inline">
                        {selectedCategory?.calculation_type === 'percentage'
                          ? `Ret: ${r.retention_percentage ?? '-'}% · Rep: ${r.repasse_percentage ?? '-'}%`
                          : `R$ ${Number(r.fixed_fee ?? 0).toFixed(2)}`}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 shrink-0" onClick={() => handleDeleteRule(r.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}