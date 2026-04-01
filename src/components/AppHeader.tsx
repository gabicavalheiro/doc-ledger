import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Stethoscope, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AppHeader() {
  const { user, logout, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <header className="border-b bg-card shadow-card">
      <div className="container max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold font-display">MedFinance</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isAdmin ? 'default' : 'secondary'} className="gap-1">
            {isAdmin ? <Shield className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
            {user.name}
          </Badge>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
