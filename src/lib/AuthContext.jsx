import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função interna para tratar o usuário e mapear a role administrativa correta
  const mapearUsuarioComRole = (supabaseUser) => {
    if (!supabaseUser) return null;

    // Captura a role customizada que injetamos via SQL no app_metadata
    const roleCustomizada = supabaseUser.app_metadata?.role;

    return {
      ...supabaseUser,
      // Se houver a role customizada (ex: 'admin'), usa ela. Caso contrário, mantém a nativa do Supabase
      role: roleCustomizada || supabaseUser.role
    };
  };

  useEffect(() => {
    // 1. Verifica se já existe uma sessão ativa ao abrir o app
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(mapearUsuarioComRole(session?.user));
      setLoading(false);
    };

    getSession();

    // 2. ESCUTA REAL: Atualiza o estado automaticamente ao logar ou deslogar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapearUsuarioComRole(session?.user));
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};