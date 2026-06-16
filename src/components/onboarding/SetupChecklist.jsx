import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquareText,
  Sparkles,
  Store,
  UserRoundCheck,
  WalletCards,
} from 'lucide-react';

function obterNomeEstudio(estabelecimento) {
  return estabelecimento?.nome_estudio || estabelecimento?.nome || 'Seu estúdio';
}

function temHorarioConfigurado(estabelecimento) {
  return Boolean(
    (estabelecimento?.horario_inicio || estabelecimento?.hora_abertura || estabelecimento?.horario_abertura) &&
    (estabelecimento?.horario_fim || estabelecimento?.hora_fechamento || estabelecimento?.horario_fechamento)
  );
}

function ChecklistItem({ item }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
        item.done
          ? 'border-emerald-100 bg-emerald-50/70 hover:bg-emerald-50'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        item.done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
      }`}>
        {item.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase text-slate-900">{item.title}</p>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
            item.done ? 'bg-white text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {item.done ? 'Ok' : 'Fazer'}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
          {item.description}
        </p>
      </div>
    </Link>
  );
}

export default function SetupChecklist({ estabelecimento }) {
  const { slug } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({
    servicos: [],
    profissionais: [],
    vinculos: [],
    agendamentos: [],
  });

  const studioSlug = slug || estabelecimento?.slug || 'studio-demo';
  const linkPublico = `${window.location.origin}/${studioSlug}`;

  useEffect(() => {
    let cancelado = false;

    const carregarChecklist = async () => {
      if (!estabelecimento?.id) return;

      try {
        setLoading(true);
        const [{ data: servicos }, { data: profissionais }, { data: vinculos }, { data: agendamentos }] = await Promise.all([
          supabase
            .from('servicos')
            .select('id, nome, preco, duracao, capacidade_simultanea')
            .eq('estabelecimento_id', estabelecimento.id),
          supabase
            .from('profissionais')
            .select('id, nome, ativo')
            .eq('estabelecimento_id', estabelecimento.id),
          supabase
            .from('servico_profissionais')
            .select('servico_id, profissional_id'),
          supabase
            .from('agendamentos')
            .select('id, status')
            .eq('estabelecimento_id', estabelecimento.id)
            .limit(20),
        ]);

        if (!cancelado) {
          setDados({
            servicos: servicos || [],
            profissionais: profissionais || [],
            vinculos: vinculos || [],
            agendamentos: agendamentos || [],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    carregarChecklist();

    return () => {
      cancelado = true;
    };
  }, [estabelecimento]);

  const itens = useMemo(() => {
    const temServico = dados.servicos.length > 0;
    const temProfissionalAtivo = dados.profissionais.some(profissional => profissional.ativo !== false);
    const temVinculo = dados.vinculos.some(vinculo =>
      dados.servicos.some(servico => String(servico.id) === String(vinculo.servico_id)) &&
      dados.profissionais.some(profissional => String(profissional.id) === String(vinculo.profissional_id))
    );
    const temAgendamento = dados.agendamentos.length > 0;
    const temNome = Boolean(obterNomeEstudio(estabelecimento));

    return [
      {
        title: 'Identidade do estúdio',
        description: temNome ? `${obterNomeEstudio(estabelecimento)} está identificado no painel.` : 'Defina nome e identidade básica do estúdio.',
        done: temNome,
        href: `/admin/${studioSlug}/servicos`,
        icon: Store,
      },
      {
        title: 'Horários de operação',
        description: temHorarioConfigurado(estabelecimento) ? 'A agenda inteligente já tem abertura e fechamento.' : 'Configure abertura, fechamento e intervalo de agenda.',
        done: temHorarioConfigurado(estabelecimento),
        href: `/admin/${studioSlug}/servicos`,
        icon: CalendarCheck2,
      },
      {
        title: 'Serviços cadastrados',
        description: temServico ? `${dados.servicos.length} serviço(s) prontos para venda.` : 'Cadastre pelo menos um serviço com duração e preço.',
        done: temServico,
        href: `/admin/${studioSlug}/servicos`,
        icon: Sparkles,
      },
      {
        title: 'Profissional ativo',
        description: temProfissionalAtivo ? 'Existe pelo menos um profissional disponível.' : 'Cadastre a equipe para liberar escolha de profissional.',
        done: temProfissionalAtivo,
        href: `/admin/${studioSlug}/servicos`,
        icon: UserRoundCheck,
      },
      {
        title: 'Serviço vinculado à equipe',
        description: temVinculo ? 'Serviços e profissionais já estão conectados.' : 'Vincule quais serviços cada profissional atende.',
        done: temVinculo,
        href: `/admin/${studioSlug}/servicos`,
        icon: ClipboardCheck,
      },
      {
        title: 'Primeiro agendamento',
        description: temAgendamento ? 'O estúdio já tem histórico operacional.' : 'Crie ou receba o primeiro agendamento para validar a operação.',
        done: temAgendamento,
        href: `/admin/${studioSlug}/agenda`,
        icon: CalendarCheck2,
      },
      {
        title: 'Financeiro pronto',
        description: 'Confira receita, comissão e fechamento antes de vender o sistema.',
        done: temAgendamento,
        href: `/admin/${studioSlug}/financeiro`,
        icon: WalletCards,
      },
      {
        title: 'Automação ativa',
        description: 'Use filas de confirmação, lembrete e recuperação via WhatsApp.',
        done: temAgendamento,
        href: `/admin/${studioSlug}/automacoes`,
        icon: MessageSquareText,
      },
    ];
  }, [dados.agendamentos, dados.profissionais, dados.servicos, dados.vinculos, estabelecimento, studioSlug]);

  const concluidos = itens.filter(item => item.done).length;
  const progresso = itens.length > 0 ? (concluidos / itens.length) * 100 : 0;
  const prontoParaPublicar = progresso >= 75;

  const copiarLinkPublico = async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      toast({ title: 'Link público copiado', description: 'Envie para testar o agendamento online.' });
    } catch {
      toast({ variant: 'destructive', title: 'Não foi possível copiar', description: linkPublico });
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="border-b border-slate-100 bg-slate-950 p-5 text-white lg:border-b-0 lg:border-r lg:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Onboarding
                </p>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  Preparar para venda
                </h3>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Progresso
                  </p>
                  <p className="mt-1 text-3xl font-black">{Math.round(progresso)}%</p>
                </div>
                <span className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase ${
                  prontoParaPublicar ? 'bg-emerald-400 text-slate-950' : 'bg-amber-300 text-slate-950'
                }`}>
                  {prontoParaPublicar ? 'Pronto para teste' : 'Em configuração'}
                </span>
              </div>
              <Progress
                value={progresso}
                className="mt-4 h-3 rounded-full bg-white/10 [&>div]:rounded-full [&>div]:bg-emerald-400"
              />
              <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-300">
                Complete os pontos essenciais para entregar uma experiência profissional para novos estúdios.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Link público
              </p>
              <p className="mt-1 truncate text-xs font-bold text-slate-200">{linkPublico}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={copiarLinkPublico}
                  className="flex h-9 items-center justify-center gap-2 rounded-xl bg-white text-[10px] font-black uppercase text-slate-900 hover:bg-slate-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </button>
                <a
                  href={linkPublico}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 text-[10px] font-black uppercase text-white hover:bg-white/15"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir
                </a>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Checklist de ativação
                </p>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                  {concluidos} de {itens.length} etapas concluídas
                </h3>
              </div>
              {loading ? (
                <span className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Atualizando
                </span>
              ) : (
                <span className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase text-slate-500">
                  <Link2 className="h-3.5 w-3.5" />
                  SaaS ready
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {itens.map(item => <ChecklistItem key={item.title} item={item} />)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
