import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Loader2, Lock, Mail, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { PLANOS_FALLBACK, formatarPrecoMensal, obterPlano } from '@/lib/subscription';

function criarSlug(valor) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
}

export default function CadastroAssinatura() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const planoId = params.get('plano') || 'pro';
  const plano = useMemo(() => obterPlano(PLANOS_FALLBACK, planoId), [planoId]);

  const [form, setForm] = useState({
    nomeEstudio: '',
    slug: '',
    email: '',
    senha: '',
  });
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(null);

  const atualizarCampo = (campo, valor) => {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
      ...(campo === 'nomeEstudio' && !atual.slug ? { slug: criarSlug(valor) } : {}),
    }));
  };

  const criarEstudio = async () => {
    const { data, error } = await supabase.rpc('criar_estabelecimento_saas', {
      p_nome_estudio: form.nomeEstudio,
      p_slug: form.slug,
      p_plano_id: plano.id,
    });

    if (error) throw error;
    return data;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          data: {
            role: 'admin',
            nome_estudio: form.nomeEstudio,
            plano_assinatura: plano.id,
          },
        },
      });

      if (error) throw error;

      localStorage.setItem('zello_pending_signup', JSON.stringify({
        nomeEstudio: form.nomeEstudio,
        slug: form.slug,
        planoId: plano.id,
      }));

      if (!data.session) {
        setSucesso({
          tipo: 'email',
          titulo: 'Confirme seu e-mail',
          descricao: 'Criamos seu acesso. Confirme o e-mail e depois entre para finalizar a criação do estúdio.',
        });
        return;
      }

      const resultado = await criarEstudio();
      const slugCriado = resultado?.slug || form.slug;
      localStorage.removeItem('zello_pending_signup');

      toast({
        title: 'Estúdio criado!',
        description: 'Seu trial foi ativado e o painel já está liberado.',
      });

      navigate(`/admin/${slugCriado}/dashboard`, { replace: true });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível criar a assinatura',
        description: error.message || 'Revise os dados e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-950">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-black uppercase tracking-tight">{sucesso.titulo}</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{sucesso.descricao}</p>
          <Link to="/login">
            <Button className="mt-6 h-11 w-full rounded-xl bg-slate-950 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800">
              Ir para login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-950 antialiased">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="hidden border-r border-white/10 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <Link to="/planos" className="inline-flex w-fit items-center gap-2 text-xs font-black uppercase tracking-wide text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Planos
          </Link>
          <div>
            <p className="mb-4 inline-flex rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950">
              Novo estúdio
            </p>
            <h1 className="text-5xl font-black uppercase leading-none tracking-tight">
              Ative o Zello por assinatura.
            </h1>
            <p className="mt-5 text-base font-semibold leading-relaxed text-white/60">
              O cadastro já nasce com trial. Depois, basta conectar o checkout do gateway para cobrar mensalmente no cartão.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Plano escolhido</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">{plano.nome}</h2>
            <p className="mt-2 text-sm font-semibold text-white/55">{plano.descricao}</p>
            <p className="mt-5 text-3xl font-black">{formatarPrecoMensal(plano.preco_mensal)}<span className="text-xs text-white/45">/mês</span></p>
          </div>
        </aside>

        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-xl">
            <div className="mb-6 flex items-center justify-between">
              <Link to="/planos" className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                Planos
              </Link>
              <Link to="/login" className="text-xs font-black uppercase tracking-wide text-slate-500 hover:text-slate-900">
                Já tenho conta
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Cadastro SaaS
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
                  Criar assinatura
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                  Plano {plano.nome}: {formatarPrecoMensal(plano.preco_mensal)} por mês após o trial.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Nome do estúdio</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <Input value={form.nomeEstudio} onChange={(event) => atualizarCampo('nomeEstudio', event.target.value)} className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 font-bold text-slate-900" placeholder="Studio Bella" required />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Link público</label>
                  <Input value={form.slug} onChange={(event) => atualizarCampo('slug', criarSlug(event.target.value))} className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-slate-900" placeholder="studio-bella" minLength={3} required />
                  <p className="mt-1 text-xs font-semibold text-slate-400">Seu link ficará assim: /{form.slug || 'studio-bella'}</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <Input type="email" value={form.email} onChange={(event) => atualizarCampo('email', event.target.value)} className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 font-bold text-slate-900" placeholder="voce@estudio.com" required />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <Input type="password" value={form.senha} onChange={(event) => atualizarCampo('senha', event.target.value)} className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 font-bold text-slate-900" placeholder="Mínimo 6 caracteres" minLength={6} required />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-xl bg-slate-950 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar conta e ativar trial'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <p className="mt-4 text-center text-xs font-semibold leading-relaxed text-slate-400">
                O cartão será processado pelo gateway de pagamento conectado ao checkout. O Zello Agenda não armazena dados de cartão.
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
