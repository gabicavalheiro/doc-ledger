import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Shield, Stethoscope, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface UserRow {
  user_id: string;
  role: 'admin' | 'doctor';
  full_name: string | null;
  email: string | null;
}

export default function ManageUsers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      toast({ title: 'Erro', description: 'Não foi possível carregar usuários.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name');

    const profileMap = new Map<string, string | null>();
    profiles?.forEach(p => profileMap.set(p.user_id, p.full_name));

    const merged: UserRow[] = (roles || []).map(r => ({
      user_id: r.user_id,
      role: r.role as 'admin' | 'doctor',
      full_name: profileMap.get(r.user_id) || null,
      email: null,
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'doctor') => {
    setUpdatingId(userId);

    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível alterar o papel.', variant: 'destructive' });
    } else {
      toast({ title: 'Papel atualizado!', description: `Usuário agora é ${newRole === 'admin' ? 'Administrador' : 'Médico'}.` });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    }
    setUpdatingId(null);
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="font-display text-base sm:text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Gerenciar Usuários
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Visualize e altere o papel dos usuários cadastrados
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Papel Atual</TableHead>
                  <TableHead className="text-xs text-right">Alterar Papel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.user_id}>
                    <TableCell className="text-xs sm:text-sm font-medium">
                      {user.full_name || 'Sem nome'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="text-xs gap-1"
                      >
                        {user.role === 'admin' ? (
                          <><Shield className="w-3 h-3" /> Admin</>
                        ) : (
                          <><Stethoscope className="w-3 h-3" /> Médico</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleRoleChange(user.user_id, v as 'admin' | 'doctor')}
                        disabled={updatingId === user.user_id}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Médico</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
