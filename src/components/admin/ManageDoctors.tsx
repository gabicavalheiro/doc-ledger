import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Stethoscope, Plus, Trash2 } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
  crm: string | null;
  active: boolean;
}

export default function ManageDoctors() {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [crm, setCrm] = useState('');

  const fetchDoctors = async () => {
    const { data, error } = await supabase.from('doctors').select('id, name, specialty, crm, active').order('name');
    if (!error && data) setDoctors(data);
    setLoading(false);
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('doctors').insert({ name: name.trim(), specialty: specialty.trim() || null, crm: crm.trim() || null });
    if (error) {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Médico cadastrado!', description: `${name} adicionado com sucesso.` });
      setName(''); setSpecialty(''); setCrm('');
      fetchDoctors();
    }
    setSaving(false);
  };

  const handleToggle = async (doctor: Doctor) => {
    const { error } = await supabase.from('doctors').update({ active: !doctor.active }).eq('id', doctor.id);
    if (!error) fetchDoctors();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    } else {
      fetchDoctors();
    }
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          Gerenciar Médicos
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Cadastre e gerencie os médicos do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-4 sm:px-6">
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. João Silva" required maxLength={100} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Especialidade</Label>
            <Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Oftalmologia" maxLength={100} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">CRM</Label>
            <Input value={crm} onChange={e => setCrm(e.target.value)} placeholder="12345/SP" maxLength={20} className="h-9" />
          </div>
          <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-90 h-9">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Adicionar
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : doctors.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum médico cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {doctors.map(d => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-sm block truncate">{d.name}</span>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {d.specialty && <span>{d.specialty}</span>}
                      {d.crm && <span>CRM: {d.crm}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Badge variant={d.active ? 'default' : 'secondary'} className="cursor-pointer text-[10px] sm:text-xs" onClick={() => handleToggle(d)}>
                    {d.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
