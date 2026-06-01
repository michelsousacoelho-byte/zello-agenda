import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function UserNotRegisteredError() {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Acesso Restrito</h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-6">Sua conta não possui permissões administrativas.</p>
        
        <div className="p-4 bg-slate-50 rounded-xl text-left border border-slate-200 text-xs text-slate-700 space-y-2 font-medium">
          <p className="font-black uppercase text-slate-800 tracking-wider">Verificações importantes:</p>
          <ul className="list-disc list-inside space-y-1 opacity-90">
            <li>Confirme se este e-mail está cadastrado na equipe.</li>
            <li>Solicite o vínculo do seu ID ao estabelecimento correto.</li>
          </ul>
        </div>

        <Button onClick={() => logout?.()} className="mt-6 w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-md">
          Desconectar e Tentar Novamente
        </Button>
      </div>
    </div>
  );
}