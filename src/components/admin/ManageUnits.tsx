import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Plus, Trash2 } from 'lucide-react';

interface Unit { id: string; name: string; active: boolean; }

export default function ManageUnits() {
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const fetchUnits = async () => {
    const { data } = await supabase.from('units').select('*').order('name');
    if (data) setUnits(data);
    setLoading(false);
  };

  useEffect(() => { fetchUnits(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('units').insert({ name: name.trim() });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Unidade criada!', description: `${name} adicionada.` }); setName(''); fetchUnits(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); }
    else { fetchUnits(); }
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Unidades
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Cadastre as unidades/locais de atendimento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-4 sm:px-6">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="space-y-2 w-full sm:flex-1">
            <Label className="text-xs sm:text-sm">Nome da Unidade</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Clínica Centro" required maxLength={100} className="h-9" />
          </div>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 h-9">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Adicionar
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : units.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhuma unidade cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {units.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm truncate">{u.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 shrink-0" onClick={() => handleDelete(u.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
