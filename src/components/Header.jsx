import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { LogOut, User, Calendar } from 'lucide-react';

export default function Header() {
  const { slug } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSair = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* LADO ESQUERDO: LOGO E IDENTIDADE */}
        <div className="flex items-center gap-3">
          {/* Ícone sutil, sem fundo chamativo e sem o amarelo antigo */}
          <Calendar className="w-6 h-6 text-slate-300" />
          
          <div>
            {/* Texto inserido diretamente de forma estática para vencer o cache */}
            <h1 className="text-xl font-black uppercase tracking-wider text-white">
              Zello Agenda
            </h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase font-bold">
              Painel Administrativo
            </p>
          </div>
        </div>

        {/* LADO DIREITO: USUÁRIO E BOTÃO SAIR */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300 font-medium">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <span>Administrador</span>
          </div>

          <button
            onClick={handleSair}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 font-bold text-xs uppercase tracking-wider transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}