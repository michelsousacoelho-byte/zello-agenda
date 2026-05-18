import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

import Dashboard from '@/pages/Dashboard';
import Servicos from '@/pages/Servicos';
import Agenda from '@/pages/Agenda';
import Reserva from '@/pages/Reserva';
import Login from '@/pages/Login'; 
import PageNotFound from './lib/PageNotFound';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF8F2]">
      <Loader2 className="w-10 h-10 animate-spin text-[#8A6D3B] mb-4" />
      <div className="text-[#4A3721] font-bold uppercase tracking-widest text-xs">Sincronizando...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = async () => {
    localStorage.removeItem('supabase.auth.token');
    await supabase.auth.signOut();
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen bg-[#FDF8F2]">
      <header className="bg-gradient-to-r from-[#4A3721] to-[#8A6D3B] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
              <div className="flex flex-col text-white">
                <span className="font-bold text-xl uppercase tracking-tighter leading-none">Andréia Moura</span>
                <span className="text-[10px] opacity-80 uppercase tracking-[0.2em] font-light">Bronze & Estética</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-2 ml-4">
              <Link to="/admin/dashboard"><Button variant="ghost" className={`rounded-lg px-6 ${location.pathname.includes('dashboard') ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>Dashboard</Button></Link>
              <Link to="/admin/servicos"><Button variant="ghost" className={`rounded-lg px-6 ${location.pathname.includes('servicos') ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>Serviços</Button></Link>
              <Link to="/admin/agenda"><Button variant="ghost" className={`rounded-lg px-6 ${location.pathname.includes('agenda') ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}>Agenda</Button></Link>
            </nav>
          </div>
          <Button onClick={handleLogout} variant="outline" className="bg-white/10 border-white/20 hover:bg-red-500/20 text-white gap-2 rounded-xl">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-8">{children}</main>
    </div>
  );
};

function AppRoutes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Se o usuário logou, mas o navigate não funcionou, esse useEffect força a entrada
    if (user && !loading && window.location.pathname === '/login') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Reserva />} />
      <Route path="/login" element={<Login onLoginSuccess={() => navigate('/admin/dashboard')} />} />
      <Route path="/admin/*" element={
        <ProtectedRoute>
          <AdminLayout>
            <Routes>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="servicos" element={<Servicos />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}