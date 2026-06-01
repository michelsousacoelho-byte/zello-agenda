import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

import Dashboard from '@/pages/Dashboard';
import Servicos from '@/pages/Servicos';
import Agenda from '@/pages/Agenda';
import Reserva from '@/pages/Reserva';
import Login from '@/pages/Login'; 
import PageNotFound from './lib/PageNotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

const TEXTO_HOME_DESC = "Plataforma profissional de agendamento e gestão para estúdios de estética e bem-estar.";

function ThemeProvider({ children }) {
  const { slug } = useParams();
  const [estiloCustomizado, setEstiloCustomizado] = useState(null);

  useEffect(() => {
    const carregarBrandingEstudio = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from('estabelecimentos')
        .select('cor_primaria, cor_secundaria, cor_fundo')
        .eq('slug', slug)
        .single();

      if (!error && data) {
        setEstiloCustomizado({
          '--cor-primaria': data.cor_primaria || '#1E293B',
          '--cor-secundaria': data.cor_secundaria || '#0EA5E9',
          '--cor-fundo': data.cor_fundo || '#F8FAFC',
        });
      }
    };
    carregarBrandingEstudio();
  }, [slug]);

  return (
    <div style={estiloCustomizado || {
      '--cor-primaria': '#1E293B',
      '--cor-secundaria': '#0EA5E9',
      '--cor-fundo': '#F8FAFC',
    }} className="min-h-screen flex flex-col w-full">
      {children}
    </div>
  );
}

function AdminLayout({ children }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 flex flex-col w-full text-slate-800 antialiased">
        <Header />
        <Navigation />
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/:slug" element={<ThemeProvider><Reserva /></ThemeProvider>} />
      <Route path="/:slug/login" element={<ThemeProvider><Login onLoginSuccess={(u, currentSlug) => navigate(`/admin/${currentSlug || 'studio-demo'}/dashboard`, { replace: true })} /></ThemeProvider>} />
      <Route path="/login" element={<Login onLoginSuccess={(u, currentSlug) => navigate(`/admin/${currentSlug || 'studio-demo'}/dashboard`, { replace: true })} />} />
      
      <Route path="/admin/:slug/dashboard" element={
        <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />}>
          <AdminLayout><Dashboard /></AdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/admin/:slug/servicos" element={
        <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />}>
          <AdminLayout><Servicos /></AdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/admin/:slug/agenda" element={
        <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />}>
          <AdminLayout><Agenda /></AdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/admin/:slug/*" element={<Navigate to="dashboard" replace />} />
      
      <Route path="/" element={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Zello Agenda</h1>
          <p className="text-slate-600 max-w-sm mb-6">{TEXTO_HOME_DESC}</p>
          <Link to="/studio-demo/login">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl transition-colors">Acessar Painel Demo</Button>
          </Link>
        </div>
      } />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <TooltipProvider>
          <Router>
            <AppRoutes />
          </Router>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}