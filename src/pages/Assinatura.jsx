import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  PLANOS_FALLBACK,
  descreverStatusAssinatura,
  formatarPrecoMensal,
  normalizarRecursos,
  obterPlano,
} from '@/lib/subscription';

function montarCheckoutUrl(plano, estabelecimento) {
  const baseUrl = plano?.checkout_url || import.meta.env.VITE_CHECKOUT_URL;
  if (!baseUrl) return null;

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('plan', plano.id);
    url.searchParams.set('studio', estabelecimento?.slug || '');
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export default function Assinatura() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [salvandoPlano, setSalvandoPlano] = useState(null);
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [assinatura, setAssinatura] = useState(null);
  const [planos, setPlanos] = useState(PLANOS_FALLBACK);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);

      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('id, slug, nome_estudio, assinatura_status, plano_assinatura, trial_termina_em')
        .eq('slug', slug)
        .single();

      setEstabelecimento(est || null);

      const [{ data: planosData }, { data: assinaturaData }] = await Promise.all([
        supabase.from('planos_assinatura').select('*').eq('ativo', true).order('ordem', { ascending: true }),
        est?.id
          ? supabase
              .from('assinaturas_estabelecimento')
              .select('*, planos_assinatura(*)')
              .eq('estabelecimento_id', est.id)
              .order('created_at', { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [] }),
      ]);

      if (planosData?.length) setPlanos(planosData);

      const assinaturaAtual = assinaturaData?.[0] || (est ? {
        status: est.assinatura_status,
        plano_id: est.plano_assinatura,
        trial_termina_em: est.trial_termina_em,
      } : null);

      setAssinatura(assinaturaAtual);
      setLoading(false);
    };

    carregar();
  }, [slug]);

  const planoAtual = useMemo(() => (
    assinatura?.planos_assinatura || obterPlano(planos, assinatura?.plano_id || estabelecimento?.plano_assinatura)
  ), [assinatura, estabelecimento, planos]);

  const status = useMemo(() => descreverStatusAssinatura(assinatura), [assinatura]);
  const checkoutUrl = useMemo(() => montarCheckoutUrl(planoAtual, estabelecimento), [planoAtual, estabelecimento]);

  const atualizarPlano = async (plano) => {
    if (!estabelecimento?.id || plano.id === planoAtual?.id) return;

    setSalvandoPlano(plano.id);

    try {
      const { error } = await supabase.rpc('atualizar_plano_assinatura', {
        p_estabelecimento_id: estabelecimento.id,
        p_plano_id: plano.id,
      });

      if (error) throw error;

      setAssinatura((atual) => ({
        ...(atual || {}),
        plano_id: plano.id,
        planos_assinatura: plano,
        status: atual?.status || estabelecimento.assinatura_status || 'trial',
      }));
      setEstabelecimento((atual) => ({
        ...(atual || {}),
        plano_assinatura: plano.id,
      }));

      toast({
        title: 'Plano atualizado',
        description: `O estúdio agora está no plano ${plano.nome}.`,
      });

      const url = montarCheckoutUrl(plano, estabelecimento);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível alterar o plano',
        description: error.message || 'Tente novamente.',
      });
    } finally {
      setSalvandoPlano(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Assinatura SaaS
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 sm:text-3xl">
              Plano e cobrança
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
              Controle o plano do estúdio e direcione o cliente para o checkout seguro do gateway de pagamento.
            </p>
          </div>

          <div className={`rounded-2xl border px-4 py-3 ${
            status.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : status.tone === 'danger'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            <p className="text-[10px] font-black uppercase tracking-widest">Status</p>
            <p className="mt-1 text-sm font-black uppercase tracking-wide">{status.label}</p>
            <p className="mt-1 text-xs font-bold opacity-75">{status.description}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plano atual</p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">{planoAtual?.nome || 'Pro'}</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{planoAtual?.descricao}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mensalidade</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {formatarPrecoMensal(planoAtual?.preco_mensal)}
              <span className="ml-1 text-xs font-black uppercase tracking-wide text-slate-400">/mês</span>
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {planoAtual?.limite_profissionais ? `Até ${planoAtual.limite_profissionais} profissionais.` : 'Profissionais ilimitados.'}
            </p>
          </div>

          {checkoutUrl ? (
            <a href={checkoutUrl} target="_blank" rel="noreferrer">
              <Button className="mt-5 h-12 w-full rounded-xl bg-slate-950 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800">
                Abrir checkout seguro
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-amber-800">Checkout ainda não conectado</p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-amber-700">
                    Configure `checkout_url` no plano ou a variável `VITE_CHECKOUT_URL` no deploy para direcionar o cliente ao gateway.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recursos liberados</p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-950">O que este plano entrega</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {normalizarRecursos(planoAtual?.recursos).map((recurso) => (
              <div key={recurso} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="text-sm font-bold leading-snug text-slate-600">{recurso}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <ShieldCheck className="h-5 w-5 text-sky-700" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-sky-900">Integração recomendada</p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-sky-700">
              Use Stripe, Mercado Pago, Asaas ou Pagar.me para armazenar cartão, emitir cobrança recorrente e enviar webhooks ao Supabase.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planos disponíveis</p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-950">Escolha ou altere a assinatura</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
              Estes são os planos comerciais do Zello. A troca atualiza o plano do estúdio; quando o checkout estiver conectado, o cliente será enviado para pagamento.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {planos.map((plano) => {
            const planoSelecionado = plano.id === planoAtual?.id;
            const planoCheckoutUrl = montarCheckoutUrl(plano, estabelecimento);

            return (
              <article key={plano.id} className={`rounded-3xl border p-5 ${
                planoSelecionado
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : plano.destaque
                    ? 'border-sky-200 bg-sky-50 text-slate-950'
                    : 'border-slate-200 bg-slate-50 text-slate-950'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${planoSelecionado ? 'text-white/45' : 'text-slate-400'}`}>
                      {planoSelecionado ? 'Plano atual' : plano.destaque ? 'Recomendado' : 'Disponível'}
                    </p>
                    <h3 className="mt-2 text-xl font-black uppercase tracking-tight">{plano.nome}</h3>
                    <p className={`mt-2 text-sm font-semibold leading-relaxed ${planoSelecionado ? 'text-white/60' : 'text-slate-500'}`}>
                      {plano.descricao}
                    </p>
                  </div>
                  {planoSelecionado && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />}
                </div>

                <p className="mt-5 text-3xl font-black tracking-tight">
                  {formatarPrecoMensal(plano.preco_mensal)}
                  <span className={`ml-1 text-xs font-black uppercase tracking-wide ${planoSelecionado ? 'text-white/45' : 'text-slate-400'}`}>/mês</span>
                </p>

                <div className="mt-5 space-y-3">
                  {normalizarRecursos(plano.recursos).slice(0, 5).map((recurso) => (
                    <div key={recurso} className="flex items-start gap-2">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${planoSelecionado ? 'text-emerald-300' : 'text-emerald-600'}`} />
                      <span className={`text-sm font-bold leading-snug ${planoSelecionado ? 'text-white/70' : 'text-slate-600'}`}>{recurso}</span>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  disabled={planoSelecionado || salvandoPlano === plano.id}
                  onClick={() => atualizarPlano(plano)}
                  className={`mt-6 h-11 w-full rounded-xl text-xs font-black uppercase tracking-wide ${
                    planoSelecionado
                      ? 'bg-white/10 text-white hover:bg-white/10'
                      : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  {salvandoPlano === plano.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : planoSelecionado ? (
                    'Selecionado'
                  ) : planoCheckoutUrl ? (
                    'Selecionar e pagar'
                  ) : (
                    'Selecionar plano'
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
