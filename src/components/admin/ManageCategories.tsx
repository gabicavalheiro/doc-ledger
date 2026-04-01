import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Tags, Plus, Trash2, Settings2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  calculation_type: string;
  retention_percentage: number;
  repasse_percentage: number;
  fixed_fee: number;
  active: boolean;
}

interface Doctor {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
}

interface DoctorRule {
  id: string;
  doctor_id: string;
  category_id: string;
  unit_id: string | null;
  retention_percentage: number | null;
  repasse_percentage: number | null;
  fixed_fee: number | null;
}

export default function ManageCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [calcType, setCalcType] = useState<'percentage' | 'fixed_fee'>('percentage');
  const [retention, setRetention] = useState('15');
  const [repasse, setRepasse] = useState('50');
  const [fixedFee, setFixedFee] = useState('0');

  // Doctor rules dialog
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [doctorRules, setDoctorRules] = useState<DoctorRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [ruleRetention, setRuleRetention] = useState('');
  const [ruleRepasse, setRuleRepasse] = useState('');
  const [ruleFixedFee, setRuleFixedFee] = useState('');

  const fetchData = async () => {
    const [catRes, docRes] = await Promise.all([
      supabase.from('payment_categories').select('*').order('name'),
      supabase.from('doctors').select('id, name').eq('active', true).order('name'),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (docRes.data) setDoctors(docRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('payment_categories').insert({
      name: name.trim(),
      calculation_type: calcType,
      retention_percentage: parseFloat(retention) || 0,
      repasse_percentage: parseFloat(repasse) || 0,
      fixed_fee: parseFloat(fixedFee) || 0,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Categoria criada!', description: `${name} adicionada.` });
      setName('');
      setRetention('15');
      setRepasse('50');
      setFixedFee('0');
      setCalcType('percentage');
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('payment_categories').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      fetchData();
    }
  };

  const openRules = async (cat: Category) => {
    setSelectedCategory(cat);
    setRulesOpen(true);
    setRulesLoading(true);
    const { data } = await supabase
      .from('doctor_category_rules')
      .select('*')
      .eq('category_id', cat.id);
    setDoctorRules(data || []);
    setRulesLoading(false);
  };

  const handleAddRule = async () => {
    if (!selectedDoctor || !selectedCategory) return;
    setRulesSaving(true);

    const payload: any = {
      doctor_id: selectedDoctor,
      category_id: selectedCategory.id,
    };
    if (ruleRetention.trim()) payload.retention_percentage = parseFloat(ruleRetention);
    if (ruleRepasse.trim()) payload.repasse_percentage = parseFloat(ruleRepasse);
    if (ruleFixedFee.trim()) payload.fixed_fee = parseFloat(ruleFixedFee);

    const { error } = await supabase
      .from('doctor_category_rules')
      .upsert(payload, { onConflict: 'doctor_id,category_id' });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Regra salva!' });
      setSelectedDoctor('');
      setRuleRetention('');
      setRuleRepasse('');
      setRuleFixedFee('');
      const { data } = await supabase
        .from('doctor_category_rules')
        .select('*')
        .eq('category_id', selectedCategory.id);
      setDoctorRules(data || []);
    }
    setRulesSaving(false);
  };

  const handleDeleteRule = async (ruleId: string) => {
    await supabase.from('doctor_category_rules').delete().eq('id', ruleId);
    if (selectedCategory) {
      const { data } = await supabase
        .from('doctor_category_rules')
        .select('*')
        .eq('category_id', selectedCategory.id);
      setDoctorRules(data || []);
    }
  };

  const getDoctorName = (doctorId: string) => doctors.find(d => d.id === doctorId)?.name || doctorId;

  return (
    <>
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary" />
            Categorias de Pagamento
          </CardTitle>
          <CardDescription>
            Defina categorias com regras de cálculo (percentual ou valor fixo) e personalize por médico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Exames" required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cálculo</Label>
                <Select value={calcType} onValueChange={(v) => setCalcType(v as 'percentage' | 'fixed_fee')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    <SelectItem value="fixed_fee">Valor Fixo (Honorário)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {calcType === 'percentage' ? (
                <>
                  <div className="space-y-2">
                    <Label>Retenção (%)</Label>
                    <Input type="number" step="0.01" min="0" max="100" value={retention} onChange={e => setRetention(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Repasse (%)</Label>
                    <Input type="number" step="0.01" min="0" max="100" value={repasse} onChange={e => setRepasse(e.target.value)} />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Valor Fixo (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={fixedFee} onChange={e => setFixedFee(e.target.value)} />
                </div>
              )}
              <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
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
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tags className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium text-sm">{c.name}</span>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {c.calculation_type === 'percentage' ? (
                          <span>Retenção: {c.retention_percentage}% · Repasse: {c.repasse_percentage}%</span>
                        ) : (
                          <span>Valor fixo: R$ {Number(c.fixed_fee).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {c.calculation_type === 'percentage' ? 'Percentual' : 'Valor Fixo'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRules(c)} title="Regras por médico">
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              Regras por Médico — {selectedCategory?.name}
            </DialogTitle>
            <DialogDescription>
              Defina valores personalizados para cada médico. Quando não definido, usa o padrão da categoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-2 col-span-2">
                <Label>Médico</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCategory?.calculation_type === 'percentage' ? (
                <>
                  <div className="space-y-2">
                    <Label>Retenção (%)</Label>
                    <Input type="number" step="0.01" value={ruleRetention} onChange={e => setRuleRetention(e.target.value)} placeholder={`Padrão: ${selectedCategory.retention_percentage}%`} />
                  </div>
                  <div className="space-y-2">
                    <Label>Repasse (%)</Label>
                    <Input type="number" step="0.01" value={ruleRepasse} onChange={e => setRuleRepasse(e.target.value)} placeholder={`Padrão: ${selectedCategory.repasse_percentage}%`} />
                  </div>
                </>
              ) : (
                <div className="space-y-2 col-span-2">
                  <Label>Valor Fixo (R$)</Label>
                  <Input type="number" step="0.01" value={ruleFixedFee} onChange={e => setRuleFixedFee(e.target.value)} placeholder={`Padrão: R$ ${Number(selectedCategory?.fixed_fee || 0).toFixed(2)}`} />
                </div>
              )}
              <div className="col-span-2">
                <Button onClick={handleAddRule} disabled={rulesSaving || !selectedDoctor} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                  {rulesSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                  Salvar Regra
                </Button>
              </div>
            </div>

            {rulesLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : doctorRules.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-2">Nenhuma regra personalizada. Todos usam o padrão.</p>
            ) : (
              <div className="space-y-2">
                {doctorRules.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                    <div>
                      <span className="font-medium">{getDoctorName(r.doctor_id)}</span>
                      <span className="text-muted-foreground ml-2">
                        {selectedCategory?.calculation_type === 'percentage'
                          ? `Ret: ${r.retention_percentage ?? '-'}% · Rep: ${r.repasse_percentage ?? '-'}%`
                          : `R$ ${Number(r.fixed_fee ?? 0).toFixed(2)}`}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDeleteRule(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
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
