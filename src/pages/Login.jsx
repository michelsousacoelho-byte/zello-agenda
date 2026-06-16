import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import heroImage from '@/assets/hero.png';
import { ArrowLeft, CalendarCheck2, Lock, Mail, Loader2, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function Login({ onLoginSuccess }) {
  const { slug } = useParams(); 
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
    <div className="min-h-screen bg-slate-950 text-slate-950 antialiased">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex">
          <img src={heroImage} alt="" className="absolute bottom-10 right-8 h-[58vh] max-h-[520px] opacity-45" />
          <div className="absolute inset-0 bg-slate-950/65" />
          <div className="relative z-10 flex w-full flex-col justify-between p-10">
            <Link to="/" className="inline-flex w-fit items-center gap-2 text-xs font-black uppercase tracking-wide text-white/70 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Zello Agenda
            </Link>
            <div className="max-w-xl">
              <p className="mb-4 inline-flex rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950">
                Painel profissional
              </p>
              <h1 className="text-5xl font-black uppercase leading-none tracking-tight">
                Gestão pronta para operar e vender.
              </h1>
              <div className="mt-7 grid grid-cols-1 gap-3">
                {[
                  [CalendarCheck2, 'Agenda inteligente e link público'],
                  [WalletCards, 'Financeiro com comissões'],
                  [ShieldCheck, 'Base de clientes sem duplicidade'],
                ].map(([Icon, text]) => (
                  <div key={text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <Icon className="h-4 w-4 text-emerald-300" />
                    <span className="text-sm font-bold text-white/75">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                Início
              </Link>
              <Link to="/studio-demo" className="text-xs font-black uppercase tracking-wide text-slate-500 hover:text-slate-900">
                Link público
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Acesso administrativo
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
                  Entrar no Zello
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                  Acesse o painel do estúdio para gerenciar agenda, operação, financeiro e relacionamento.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <Input type="email" placeholder="nome@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 font-bold text-slate-900" required />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <Input type="password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 font-bold text-slate-900" required />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-slate-950 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-slate-800">
                  {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Entrar no painel"}
                </Button>
              </form>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Demonstração
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  Use o acesso demo configurado no Supabase para apresentar o produto a um estúdio.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
