import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Loader2, Sparkles } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function Login({ onLoginSuccess }) {
  const { slug } = useParams(); 
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ variant: "destructive", title: "Erro no acesso", description: "E-mail ou senha incorretos." });
      } else {
        toast({ title: "Acesso autorizado!", description: "Carregando painel..." });
        const estudioSlug = slug || 'studio-demo';
        if (onLoginSuccess) onLoginSuccess(null, estudioSlug);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-md mb-3"><Sparkles className="w-6 h-6" /></div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Autenticação Restrita</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Painel Administrativo Geral</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <Input type="email" placeholder="nome@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11 h-11 bg-slate-50 border-slate-200 text-slate-800 font-bold" required />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-11 h-11 bg-slate-50 border-slate-200 text-slate-800 font-bold" required />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-md">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Entrar no Painel"}
          </Button>
        </form>
      </div>
    </div>
  );
}