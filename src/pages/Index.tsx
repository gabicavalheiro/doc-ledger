import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import DoctorDashboard from '@/pages/DoctorDashboard';

const Index = () => {
  const { user, isAdmin } = useAuth();

  if (!user) return <LoginPage />;
  if (isAdmin) return <AdminDashboard />;
  return <DoctorDashboard />;
};

export default Index;
