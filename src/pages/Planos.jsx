import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { PLANOS_FALLBACK, formatarPrecoMensal, normalizarRecursos } from '@/lib/subscription';

export default function Planos() {
  const [planos, setPlanos] = useState(PLANOS_FALLBACK);

  useEffect(() => {
    const carregarPlanos = async () => {
      const { data, error } = await supabase
        .from('planos_assinatura')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (!error && data?.length) {
        setPlanos(data);
      }
    };

    carregarPlanos();
  }, []);

  const planoDestaque = useMemo(() => planos.find((plano) => plano.destaque) || planos[1], [planos]);

  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide">Zello Agenda</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Planos SaaS</p>
            </div>
          </Link>
          <Link to="/login" className="hidden rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-white/15 sm:inline-flex">
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/55 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Início
        </Link>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950">
              Assinatura mensal
            </p>
            <h1 className="text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              Venda agenda profissional por recorrência.
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-white/65">
              Comece com trial, escolha o plano e conecte o checkout do gateway para cobrar cartão todo mês com segurança.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                [CreditCard, 'Cartão no gateway', 'O Zello não armazena dados sensíveis de cartão.'],
                [ShieldCheck, 'Acesso por status', 'Trial, ativa, pendente ou cancelada controlam o painel.'],
              ].map(([Icon, title, text]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Icon className="h-5 w-5 text-sky-300" />
                  <p className="mt-3 text-xs font-black uppercase tracking-wide">{title}</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-white/50">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-sky-300/30 bg-sky-400/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-200">Mais recomendado</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">{planoDestaque?.nome || 'Pro'}</h2>
            <p className="mt-2 text-sm font-semibold text-white/60">{planoDestaque?.descricao}</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-4xl font-black tracking-tight">{formatarPrecoMensal(planoDestaque?.preco_mensal)}</span>
              <span className="pb-1 text-xs font-black uppercase tracking-wide text-white/45">/mês</span>
            </div>
            <Link to={`/cadastro?plano=${planoDestaque?.id || 'pro'}`}>
              <Button className="mt-6 h-12 w-full rounded-xl bg-white text-xs font-black uppercase tracking-wide text-slate-950 hover:bg-slate-100">
                Começar agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {planos.map((plano) => {
            const recursos = normalizarRecursos(plano.recursos);

            return (
              <article key={plano.id} className={`rounded-3xl border p-5 ${plano.destaque ? 'border-sky-300 bg-white text-slate-950' : 'border-white/10 bg-white/5 text-white'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{plano.nome}</h2>
                    <p className={`mt-2 text-sm font-semibold leading-relaxed ${plano.destaque ? 'text-slate-500' : 'text-white/55'}`}>
                      {plano.descricao}
                    </p>
                  </div>
                  {plano.destaque && (
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      Pro
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  <span className="text-3xl font-black tracking-tight">{formatarPrecoMensal(plano.preco_mensal)}</span>
                  <span className={`ml-1 text-xs font-black uppercase tracking-wide ${plano.destaque ? 'text-slate-400' : 'text-white/40'}`}>/mês</span>
                </div>

                <p className={`mt-2 text-xs font-bold ${plano.destaque ? 'text-slate-500' : 'text-white/45'}`}>
                  {plano.limite_profissionais ? `Até ${plano.limite_profissionais} profissionais` : 'Profissionais ilimitados'}
                </p>

                <div className="mt-6 space-y-3">
                  {recursos.map((recurso) => (
                    <div key={recurso} className="flex items-start gap-2">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plano.destaque ? 'text-emerald-600' : 'text-sky-300'}`} />
                      <span className={`text-sm font-bold leading-snug ${plano.destaque ? 'text-slate-700' : 'text-white/70'}`}>{recurso}</span>
                    </div>
                  ))}
                </div>

                <Link to={`/cadastro?plano=${plano.id}`}>
                  <Button className={`mt-6 h-11 w-full rounded-xl text-xs font-black uppercase tracking-wide ${plano.destaque ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-slate-100'}`}>
                    Escolher plano
                  </Button>
                </Link>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
