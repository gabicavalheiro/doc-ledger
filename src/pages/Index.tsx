import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import DoctorDashboard from '@/pages/DoctorDashboard';
import ProfileSettings from '@/pages/ProfileSettings';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isAdmin, loading } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (showProfile) return <ProfileSettings onBack={() => setShowProfile(false)} />;
  if (isAdmin) return <AdminDashboard onOpenProfile={() => setShowProfile(true)} />;
  return <DoctorDashboard onOpenProfile={() => setShowProfile(true)} />;
};

export default Index;
