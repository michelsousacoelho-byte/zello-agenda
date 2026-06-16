import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { addDays, differenceInCalendarDays, format, isAfter, isBefore, parseISO, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Copy,
  HeartHandshake,
  MessageCircle,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';

const STATUS_CONCLUIDOS = ['concluído', 'concluido'];
const STATUS_ATIVOS = ['pendente', 'confirmado'];

function normalizarStatus(status) {
  return (status || '').toLowerCase();
}

function formatarTelefone(valor) {
  const apenasNumeros = (valor || '').replace(/\D/g, '');
  if (!apenasNumeros) return '';
  if (apenasNumeros.length <= 10) {
    return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return apenasNumeros.substring(0, 11).replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

function obterTelefoneWhatsapp(cliente) {
  const telefone = (cliente?.telefone || '').replace(/\D/g, '');
  if (!telefone) return '';
  return telefone.startsWith('55') ? telefone : `55${telefone}`;
}

function abrirWhatsapp(cliente, mensagem, toast) {
  const telefone = obterTelefoneWhatsapp(cliente);
  if (!telefone) {
    toast({
      variant: 'destructive',
      title: 'Cliente sem telefone',
      description: 'Cadastre um WhatsApp para usar esta automação.',
    });
    return;
  }

  window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener,noreferrer');
}

function copiarMensagem(mensagem, toast) {
  navigator.clipboard.writeText(mensagem)
    .then(() => toast({ title: 'Mensagem copiada', description: 'Agora é só colar no canal desejado.' }))
    .catch(() => toast({ variant: 'destructive', title: 'Não foi possível copiar', description: mensagem }));
}

function obterDadosAgendamento(agendamento, estabelecimento) {
  const data = agendamento.data_hora ? parseISO(agendamento.data_hora) : null;
  const nomeCliente = agendamento.clientes?.nome || 'cliente';
  const servico = agendamento.servicos?.nome || 'seu atendimento';
  const profissional = agendamento.profissionais?.nome ? ` com ${agendamento.profissionais.nome}` : '';
  const estudio = estabelecimento?.nome_estudio || estabelecimento?.nome || 'Zello Agenda';

  return {
    nomeCliente,
    servico,
    profissional,
    estudio,
    dataLabel: data ? format(data, "dd/MM/yyyy", { locale: ptBR }) : '',
    horaLabel: agendamento.data_hora?.split('T')[1]?.substring(0, 5) || '',
  };
}

function montarMensagem(tipo, agendamento, estabelecimento) {
  const dados = obterDadosAgendamento(agendamento, estabelecimento);

  if (tipo === 'confirmacao') {
    return `Olá, ${dados.nomeCliente}! Aqui é do ${dados.estudio}. Recebemos sua solicitação para ${dados.servico}${dados.profissional} em ${dados.dataLabel} às ${dados.horaLabel}. Podemos confirmar esse horário?`;
  }

  if (tipo === 'lembrete') {
    return `Olá, ${dados.nomeCliente}! Passando para lembrar do seu horário amanhã no ${dados.estudio}: ${dados.servico}${dados.profissional} às ${dados.horaLabel}. Te esperamos!`;
  }

  if (tipo === 'pos_atendimento') {
    return `Olá, ${dados.nomeCliente}! Obrigado por vir ao ${dados.estudio}. Como foi sua experiência com ${dados.servico}? Se quiser, já posso te ajudar a agendar o próximo horário.`;
  }

  return `Olá, ${dados.nomeCliente}! Sentimos sua falta no ${dados.estudio}. Quer que eu te envie novos horários para remarcar ${dados.servico}?`;
}

function AutomationMetric({ titulo, valor, subtitulo, icon: Icon, tone = 'slate' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{titulo}</p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">{valor}</h3>
          <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{subtitulo}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function AutomationQueue({ titulo, descricao, icon: Icon, tone, itens, tipo, estabelecimento, onConfirmar, toast }) {
  const toneClass = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  }[tone] || 'bg-slate-50 text-slate-700 border-slate-100';

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-900">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneClass}`}>
                <Icon className="h-4 w-4" />
              </span>
              {titulo}
            </CardTitle>
            <p className="mt-1 text-xs font-bold text-slate-400">{descricao}</p>
          </div>
          <span className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
            {itens.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {itens.length > 0 ? (
          itens.map((agendamento) => {
            const mensagem = montarMensagem(tipo, agendamento, estabelecimento);
            const data = agendamento.data_hora ? parseISO(agendamento.data_hora) : null;

            return (
              <div key={`${tipo}-${agendamento.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase text-slate-900">
                      {agendamento.clientes?.nome || 'Cliente'}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      {agendamento.servicos?.nome || 'Serviço'} · {agendamento.profissionais?.nome || 'Sem profissional'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                      <Clock className="h-3 w-3" />
                      {data ? format(data, "dd/MM 'às' HH:mm", { locale: ptBR }) : '--'}
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">
                      {formatarTelefone(agendamento.clientes?.telefone) || 'Sem telefone'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:w-[220px]">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => abrirWhatsapp(agendamento.clientes, mensagem, toast)}
                      className="h-9 rounded-xl bg-emerald-600 px-2 text-[10px] font-black uppercase text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copiarMensagem(mensagem, toast)}
                      className="h-9 rounded-xl border-slate-200 bg-white px-2 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-100"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {tipo === 'confirmacao' ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onConfirmar(agendamento)}
                        className="h-9 rounded-xl bg-slate-900 px-2 text-[10px] font-black uppercase text-white hover:bg-slate-800"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copiarMensagem(mensagem, toast)}
                        className="h-9 rounded-xl border-slate-200 bg-white px-2 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-100"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-100 p-8 text-center">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-xs font-bold uppercase text-slate-400">
              Nenhuma ação nesta fila.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Automacoes() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const carregarAutomacoes = useCallback(async () => {
    try {
      setLoading(true);
      const currentSlug = slug || 'studio-demo';

      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('slug', currentSlug)
        .maybeSingle();

      if (!est) return;
      setEstabelecimento(est);

      const inicio = format(subDays(new Date(), 45), 'yyyy-MM-dd');
      const fim = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('agendamentos')
        .select('*, clientes(*), servicos(*), profissionais(*)')
        .eq('estabelecimento_id', est.id)
        .gte('data_hora', `${inicio}T00:00:00`)
        .lte('data_hora', `${fim}T23:59:59`)
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar automações',
        description: err.message || 'Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarAutomacoes();
  }, [carregarAutomacoes]);

  const filas = useMemo(() => {
    const hoje = startOfDay(new Date());
    const amanha = startOfDay(addDays(new Date(), 1));
    const termo = busca.trim().toLowerCase();

    const filtrados = agendamentos.filter((agendamento) => {
      if (!termo) return true;
      return [
        agendamento.clientes?.nome || '',
        agendamento.clientes?.telefone || '',
        agendamento.servicos?.nome || '',
        agendamento.profissionais?.nome || '',
      ].some(valor => valor.toLowerCase().includes(termo));
    });

    const pendentes = [];
    const lembretes = [];
    const posAtendimento = [];
    const recuperacao = [];

    filtrados.forEach((agendamento) => {
      const data = agendamento.data_hora ? parseISO(agendamento.data_hora) : null;
      if (!data) return;

      const status = normalizarStatus(agendamento.status);
      const dia = startOfDay(data);

      if (status === 'pendente' && !isBefore(data, new Date())) {
        pendentes.push(agendamento);
      }

      if (status === 'confirmado' && differenceInCalendarDays(dia, amanha) === 0) {
        lembretes.push(agendamento);
      }

      if (STATUS_CONCLUIDOS.includes(status) && differenceInCalendarDays(hoje, dia) >= 1 && differenceInCalendarDays(hoje, dia) <= 7) {
        posAtendimento.push(agendamento);
      }

      if ((status === 'falta' || (STATUS_ATIVOS.includes(status) && isBefore(data, new Date()))) && isAfter(data, subDays(new Date(), 30))) {
        recuperacao.push(agendamento);
      }
    });

    return { pendentes, lembretes, posAtendimento, recuperacao };
  }, [agendamentos, busca]);

  const confirmarAgendamento = async (agendamento) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'Confirmado' })
        .eq('id', agendamento.id);

      if (error) throw error;

      toast({
        title: 'Agendamento confirmado',
        description: `${agendamento.clientes?.nome || 'Cliente'} saiu da fila de pendentes.`,
      });
      carregarAutomacoes();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao confirmar',
        description: err.message || 'Tente novamente.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Automação</p>
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
            Central de Relacionamento
          </h2>
          <p className="text-xs font-bold text-slate-500">
            {estabelecimento?.nome_estudio || estabelecimento?.nome || 'Estúdio'} · confirmações, lembretes e reativações
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, serviço ou telefone..."
              className="h-10 rounded-xl border-slate-300 bg-white pl-9 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <Button
            type="button"
            onClick={carregarAutomacoes}
            className="h-10 rounded-xl bg-slate-900 px-3 text-[10px] font-black uppercase text-white hover:bg-slate-800"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AutomationMetric titulo="Confirmar" valor={filas.pendentes.length} subtitulo="Reservas pendentes" icon={BellRing} tone="amber" />
        <AutomationMetric titulo="Lembrar" valor={filas.lembretes.length} subtitulo="Atendimentos amanhã" icon={CalendarCheck2} tone="sky" />
        <AutomationMetric titulo="Pós-atendimento" valor={filas.posAtendimento.length} subtitulo="Concluídos recentes" icon={HeartHandshake} tone="emerald" />
        <AutomationMetric titulo="Recuperar" valor={filas.recuperacao.length} subtitulo="Faltas ou vencidos" icon={UserRoundCheck} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AutomationQueue
          titulo="Confirmar Reservas"
          descricao="Solicitações do link público que precisam de confirmação humana."
          icon={BellRing}
          tone="amber"
          itens={filas.pendentes}
          tipo="confirmacao"
          estabelecimento={estabelecimento}
          onConfirmar={confirmarAgendamento}
          toast={toast}
        />
        <AutomationQueue
          titulo="Lembrete de Amanhã"
          descricao="Agenda confirmada para amanhã, pronta para envio pelo WhatsApp."
          icon={CalendarCheck2}
          tone="sky"
          itens={filas.lembretes}
          tipo="lembrete"
          estabelecimento={estabelecimento}
          onConfirmar={confirmarAgendamento}
          toast={toast}
        />
        <AutomationQueue
          titulo="Pós-atendimento"
          descricao="Clientes atendidas recentemente para feedback e próximo agendamento."
          icon={HeartHandshake}
          tone="emerald"
          itens={filas.posAtendimento}
          tipo="pos_atendimento"
          estabelecimento={estabelecimento}
          onConfirmar={confirmarAgendamento}
          toast={toast}
        />
        <AutomationQueue
          titulo="Recuperação"
          descricao="Faltas ou horários vencidos que podem ser remarcados."
          icon={UserRoundCheck}
          tone="rose"
          itens={filas.recuperacao}
          tipo="recuperacao"
          estabelecimento={estabelecimento}
          onConfirmar={confirmarAgendamento}
          toast={toast}
        />
      </div>
    </div>
  );
}
