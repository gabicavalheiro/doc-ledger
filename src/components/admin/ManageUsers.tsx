import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';

export default function ManageUsers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'doctor'>('doctor');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
    });

    if (signupError) {
      toast({ title: 'Erro ao criar usuário', description: signupError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (signupData.user) {
      const { error: roleError } = await supabase.from('user_roles').insert({ user_id: signupData.user.id, role });
      if (roleError) {
        toast({ title: 'Usuário criado, mas erro ao atribuir papel', description: roleError.message, variant: 'destructive' });
      } else {
        toast({ title: 'Usuário criado!', description: `${name} cadastrado como ${role === 'admin' ? 'Administrador' : 'Médico'}.` });
        setEmail(''); setPassword(''); setName(''); setRole('doctor');
      }
    }
    setLoading(false);
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Criar Novo Usuário
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Cadastre um novo usuário com papel de Admin ou Médico
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="user-name" className="text-xs sm:text-sm">Nome Completo</Label>
            <Input id="user-name" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. João Silva" required maxLength={100} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email" className="text-xs sm:text-sm">Email</Label>
            <Input id="user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com" required maxLength={255} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password" className="text-xs sm:text-sm">Senha</Label>
            <Input id="user-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} maxLength={128} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role" className="text-xs sm:text-sm">Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'doctor')}>
              <SelectTrigger id="user-role" className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">Médico</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 h-9" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Criar Usuário
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
