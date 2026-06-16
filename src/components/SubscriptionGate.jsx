import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { assinaturaPermiteAcesso, descreverStatusAssinatura, obterPlano, PLANOS_FALLBACK } from '@/lib/subscription';

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
        Verificando assinatura
      </div>
    </div>
  );
}

function BlockedState({ assinatura, plano, slug }) {
  const status = descreverStatusAssinatura(assinatura);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
      <div className="w-full rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-amber-700">
          Acesso administrativo pausado
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-950">
          Regularize sua assinatura
        </h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
          {status.description} O link público continua preservado, mas o painel administrativo exige uma assinatura ativa para operação.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-700">Status atual</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{status.label}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <CreditCard className="h-5 w-5 text-sky-600" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-700">Plano</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{plano?.nome || 'Pro'}</p>
          </div>
        </div>

        <Link to={`/admin/${slug}/assinatura`}>
          <Button className="mt-6 h-12 w-full rounded-xl bg-slate-950 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800">
            Ver assinatura
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function SubscriptionGate({ children }) {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [assinatura, setAssinatura] = useState(null);
  const [plano, setPlano] = useState(null);

  useEffect(() => {
    let ativo = true;

    const carregarAssinatura = async () => {
      setLoading(true);

      const { data: estabelecimento, error: estabelecimentoError } = await supabase
        .from('estabelecimentos')
        .select('id, slug, nome_estudio, assinatura_status, plano_assinatura, trial_termina_em')
        .eq('slug', slug)
        .single();

      if (!ativo) return;

      if (estabelecimentoError || !estabelecimento) {
        setAssinatura(null);
        setPlano(null);
        setLoading(false);
        return;
      }

      const { data: assinaturas } = await supabase
        .from('assinaturas_estabelecimento')
        .select('*, planos_assinatura(*)')
        .eq('estabelecimento_id', estabelecimento.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!ativo) return;

      const assinaturaAtual = assinaturas?.[0] || {
        status: estabelecimento.assinatura_status,
        plano_id: estabelecimento.plano_assinatura,
        trial_termina_em: estabelecimento.trial_termina_em,
      };

      setAssinatura(assinaturaAtual);
      setPlano(assinaturaAtual?.planos_assinatura || obterPlano(PLANOS_FALLBACK, assinaturaAtual?.plano_id || estabelecimento.plano_assinatura));
      setLoading(false);
    };

    carregarAssinatura();

    return () => {
      ativo = false;
    };
  }, [slug]);

  const permiteAcesso = useMemo(() => assinaturaPermiteAcesso(assinatura), [assinatura]);

  if (loading) return <LoadingState />;
  if (!permiteAcesso) return <BlockedState assinatura={assinatura} plano={plano} slug={slug} />;

  return children;
}
