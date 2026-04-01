import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DOCTORS, ADMIN_USER, User } from '@/types/billing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Stethoscope } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4">
            <Stethoscope className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-display text-primary-foreground">MedFinance</h1>
          <p className="text-sidebar-foreground mt-1">Painel de Faturamento Médico</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-display">Entrar no Sistema</CardTitle>
            <CardDescription>Selecione seu perfil para acessar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full h-12 bg-gradient-primary text-primary-foreground hover:opacity-90 font-medium"
              onClick={() => login(ADMIN_USER)}
            >
              <Shield className="w-5 h-5 mr-2" />
              Entrar como Administrador
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou entre como médico</span>
              </div>
            </div>

            {DOCTORS.map(doc => (
              <Button
                key={doc.id}
                variant="outline"
                className="w-full h-11 justify-start font-medium"
                onClick={() => login(doc)}
              >
                <Stethoscope className="w-4 h-4 mr-2 text-accent" />
                {doc.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
