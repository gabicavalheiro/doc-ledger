import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import DoctorDashboard from '@/pages/DoctorDashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (isAdmin) return <AdminDashboard />;
  return <DoctorDashboard />;
};

export default Index;
