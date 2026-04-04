import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Stethoscope, Shield, Settings, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

interface AppHeaderProps {
  onOpenProfile?: () => void;
}

export default function AppHeader({ onOpenProfile }: AppHeaderProps) {
  const { user, logout, isAdmin, displayName } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="border-b bg-card shadow-card">
      <div className="container max-w-[1600px] mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
          <span className="text-base sm:text-lg font-bold font-display">MedFinance</span>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          <Badge variant={isAdmin ? 'default' : 'secondary'} className="gap-1">
            {isAdmin ? <Shield className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
            <span className="max-w-[120px] truncate">{displayName}</span>
          </Badge>
          {onOpenProfile && (
            <Button variant="ghost" size="sm" onClick={onOpenProfile} className="text-muted-foreground">
              <Settings className="w-4 h-4 mr-1" />
              Perfil
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1" />
            Sair
          </Button>
        </div>

        {/* Mobile */}
        <div className="sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-4 pt-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={isAdmin ? 'default' : 'secondary'} className="gap-1">
                    {isAdmin ? <Shield className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                    <span className="max-w-[140px] truncate">{displayName}</span>
                  </Badge>
                </div>
                {onOpenProfile && (
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setOpen(false); onOpenProfile(); }}>
                    <Settings className="w-4 h-4 mr-2" />
                    Perfil
                  </Button>
                )}
                <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { setOpen(false); logout(); }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
