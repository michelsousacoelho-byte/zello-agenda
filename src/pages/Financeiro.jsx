import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Download,
  Percent,
  ReceiptText,
  Search,
  TrendingUp,
  UserRound,
  WalletCards,
} from 'lucide-react';

const STATUS_CONCLUIDOS = ['concluído', 'concluido'];
const STATUS_PREVISTOS = ['confirmado', 'pendente'];
const STATUS_INATIVOS = ['cancelado', 'falta'];

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function normalizarStatus(status) {
  return (status || '').toLowerCase();
}

function obterComissaoPercentual(profissional) {
  const valor = Number(profissional?.comissao_percentual);
  return Number.isFinite(valor) ? valor : 40;
}

function obterRangeDoMes(valorMes) {
  const [ano, mes] = valorMes.split('-').map(Number);
  const inicio = new Date(ano, mes - 1, 1, 0, 0, 0);
  const fim = new Date(ano, mes, 0, 23, 59, 59);

  return {
    inicio,
    fim,
    inicioIso: format(inicio, 'yyyy-MM-dd'),
    fimIso: format(fim, 'yyyy-MM-dd'),
    label: format(inicio, 'MMMM yyyy', { locale: ptBR }),
  };
}

function exportarFinanceiroCSV({ periodo, resumo, profissionais, atendimentos }) {
  const linhas = [
    ['Relatório Financeiro', periodo.label],
    [],
    ['Resumo', 'Valor'],
    ['Faturamento realizado', resumo.receitaRealizada.toFixed(2)],
    ['Receita prevista', resumo.receitaPrevista.toFixed(2)],
    ['Comissões a pagar', resumo.comissoes.toFixed(2)],
    ['Líquido estimado', resumo.liquido.toFixed(2)],
    [],
    ['Profissional', 'Atendimentos', 'Receita', 'Comissão %', 'Comissão', 'Líquido'],
    ...profissionais.map(item => [
      item.nome,
      item.atendimentos,
      item.receita.toFixed(2),
      item.comissaoPercentual.toFixed(2),
      item.comissao.toFixed(2),
      item.liquido.toFixed(2),
    ]),
    [],
    ['Data', 'Cliente', 'Serviço', 'Profissional', 'Status', 'Valor', 'Comissão'],
    ...atendimentos.map(item => [
      item.dataLabel,
      item.cliente,
      item.servico,
      item.profissional,
      item.status,
      item.valor.toFixed(2),
      item.comissao.toFixed(2),
    ]),
  ];

  const csv = linhas.map(linha => linha.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `financeiro_${periodo.inicioIso}_${periodo.fimIso}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function FinanceMetricCard({ titulo, valor, subtitulo, icon: Icon, tone = 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {titulo}
          </p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            {valor}
          </h3>
          <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
            {subtitulo}
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Financeiro() {
  const { slug } = useParams();
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesReferencia, setMesReferencia] = useState(format(new Date(), 'yyyy-MM'));
  const [busca, setBusca] = useState('');

  const periodo = useMemo(() => obterRangeDoMes(mesReferencia), [mesReferencia]);

  const carregarFinanceiro = useCallback(async () => {
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

      const [{ data: ag }, { data: prof }] = await Promise.all([
        supabase
          .from('agendamentos')
          .select('*, clientes(*), servicos(*), profissionais(*)')
          .eq('estabelecimento_id', est.id)
          .gte('data_hora', `${periodo.inicioIso}T00:00:00`)
          .lte('data_hora', `${periodo.fimIso}T23:59:59`)
          .order('data_hora', { ascending: false }),
        supabase
          .from('profissionais')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .order('nome', { ascending: true }),
      ]);

      setAgendamentos(ag || []);
      setProfissionais(prof || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [periodo.fimIso, periodo.inicioIso, slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarFinanceiro();
  }, [carregarFinanceiro]);

  const dadosFinanceiros = useMemo(() => {
    const mapaProfissionais = {};
    const mapaServicos = {};
    const registros = [];

    profissionais.forEach((profissional) => {
      mapaProfissionais[profissional.id] = {
        id: profissional.id,
        nome: profissional.nome,
        atendimentos: 0,
        receita: 0,
        comissao: 0,
        comissaoPercentual: obterComissaoPercentual(profissional),
        liquido: 0,
      };
    });

    let receitaRealizada = 0;
    let receitaPrevista = 0;
    let comissoes = 0;
    let atendimentosConcluidos = 0;
    let atendimentosAtivos = 0;

    agendamentos.forEach((agendamento) => {
      const status = normalizarStatus(agendamento.status);
      const concluido = STATUS_CONCLUIDOS.includes(status);
      const previsto = STATUS_PREVISTOS.includes(status);
      const ativo = !STATUS_INATIVOS.includes(status);
      const valor = Number(agendamento.servicos?.preco || 0);
      const profissionalId = agendamento.profissional_id || 'sem-profissional';
      const percentual = obterComissaoPercentual(agendamento.profissionais);
      const comissao = concluido && agendamento.profissional_id
        ? valor * (percentual / 100)
        : 0;

      if (!mapaProfissionais[profissionalId]) {
        mapaProfissionais[profissionalId] = {
          id: profissionalId,
          nome: agendamento.profissionais?.nome || 'Sem profissional',
          atendimentos: 0,
          receita: 0,
          comissao: 0,
          comissaoPercentual: agendamento.profissional_id ? percentual : 0,
          liquido: 0,
        };
      }

      if (concluido) {
        receitaRealizada += valor;
        comissoes += comissao;
        atendimentosConcluidos += 1;
        mapaProfissionais[profissionalId].atendimentos += 1;
        mapaProfissionais[profissionalId].receita += valor;
        mapaProfissionais[profissionalId].comissao += comissao;

        const servico = agendamento.servicos?.nome || 'Serviço não informado';
        if (!mapaServicos[servico]) mapaServicos[servico] = { nome: servico, total: 0, receita: 0 };
        mapaServicos[servico].total += 1;
        mapaServicos[servico].receita += valor;
      } else if (previsto) {
        receitaPrevista += valor;
      }

      if (ativo) atendimentosAtivos += 1;

      registros.push({
        id: agendamento.id,
        dataLabel: agendamento.data_hora
          ? format(parseISO(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
          : '--',
        cliente: agendamento.clientes?.nome || 'Cliente eventual',
        servico: agendamento.servicos?.nome || 'Serviço',
        profissional: agendamento.profissionais?.nome || 'Sem profissional',
        status: agendamento.status || 'Confirmado',
        valor,
        comissao,
      });
    });

    const profissionaisResumo = Object.values(mapaProfissionais)
      .map(item => ({ ...item, liquido: item.receita - item.comissao }))
      .filter(item => item.atendimentos > 0 || item.id !== 'sem-profissional')
      .sort((a, b) => b.receita - a.receita || b.atendimentos - a.atendimentos);

    const servicosResumo = Object.values(mapaServicos)
      .sort((a, b) => b.receita - a.receita || b.total - a.total);

    return {
      resumo: {
        receitaRealizada,
        receitaPrevista,
        comissoes,
        liquido: receitaRealizada - comissoes,
        ticketMedio: atendimentosConcluidos > 0 ? receitaRealizada / atendimentosConcluidos : 0,
        atendimentosConcluidos,
        atendimentosAtivos,
      },
      profissionais: profissionaisResumo,
      servicos: servicosResumo,
      registros,
    };
  }, [agendamentos, profissionais]);

  const termoBusca = busca.trim().toLowerCase();
  const atendimentosFiltrados = useMemo(() => {
    if (!termoBusca) return dadosFinanceiros.registros;
    return dadosFinanceiros.registros.filter(item => {
      return [
        item.cliente,
        item.servico,
        item.profissional,
        item.status,
      ].some(valor => valor.toLowerCase().includes(termoBusca));
    });
  }, [dadosFinanceiros.registros, termoBusca]);

  const maiorReceitaProfissional = Math.max(
    ...dadosFinanceiros.profissionais.map(item => item.receita),
    1
  );

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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Financeiro
          </p>
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
            Fechamento e Comissões
          </h2>
          <p className="text-xs font-bold text-slate-500">
            {estabelecimento?.nome_estudio || estabelecimento?.nome || 'Estúdio'} · {periodo.label}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Input
            type="month"
            value={mesReferencia}
            onChange={(e) => setMesReferencia(e.target.value)}
            className="h-10 rounded-xl border-slate-300 bg-white text-xs font-bold text-slate-900"
          />
          <Button
            type="button"
            onClick={() => exportarFinanceiroCSV({
              periodo,
              resumo: dadosFinanceiros.resumo,
              profissionais: dadosFinanceiros.profissionais,
              atendimentos: dadosFinanceiros.registros,
            })}
            className="h-10 rounded-xl bg-slate-900 px-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-slate-800"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetricCard
          titulo="Faturamento realizado"
          valor={moeda(dadosFinanceiros.resumo.receitaRealizada)}
          subtitulo="Atendimentos concluídos"
          icon={Banknote}
          tone="emerald"
        />
        <FinanceMetricCard
          titulo="Receita prevista"
          valor={moeda(dadosFinanceiros.resumo.receitaPrevista)}
          subtitulo="Confirmados + pendentes"
          icon={TrendingUp}
          tone="sky"
        />
        <FinanceMetricCard
          titulo="Comissões a pagar"
          valor={moeda(dadosFinanceiros.resumo.comissoes)}
          subtitulo="Sobre concluídos"
          icon={Percent}
          tone="amber"
        />
        <FinanceMetricCard
          titulo="Líquido estimado"
          valor={moeda(dadosFinanceiros.resumo.liquido)}
          subtitulo={`Ticket médio ${moeda(dadosFinanceiros.resumo.ticketMedio)}`}
          icon={WalletCards}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
              <UserRound className="h-4 w-4 text-slate-500" />
              Repasse por Profissional
            </CardTitle>
            <span className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
              {dadosFinanceiros.resumo.atendimentosConcluidos} concluídos
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {dadosFinanceiros.profissionais.length > 0 ? (
              dadosFinanceiros.profissionais.map((profissional) => (
                <div key={profissional.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black uppercase text-slate-900">
                        {profissional.nome}
                      </h3>
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        {profissional.atendimentos} atendimento(s) · {profissional.comissaoPercentual.toFixed(1).replace('.0', '')}% comissão
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-right">
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400">Receita</p>
                        <p className="text-xs font-black text-slate-900">{moeda(profissional.receita)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400">Comissão</p>
                        <p className="text-xs font-black text-amber-700">{moeda(profissional.comissao)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400">Líquido</p>
                        <p className="text-xs font-black text-emerald-700">{moeda(profissional.liquido)}</p>
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={(profissional.receita / maiorReceitaProfissional) * 100}
                    className="mt-3 h-2 rounded-full bg-white [&>div]:rounded-full [&>div]:bg-slate-900"
                  />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-100 p-8 text-center">
                <ReceiptText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-xs font-bold uppercase text-slate-400">
                  Nenhum atendimento concluído neste período.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
              <ReceiptText className="h-4 w-4 text-slate-500" />
              Serviços no Caixa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dadosFinanceiros.servicos.length > 0 ? (
              dadosFinanceiros.servicos.slice(0, 6).map((servico, index) => (
                <div key={servico.nome} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase text-slate-800">
                      {index + 1}. {servico.nome}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      {servico.total} concluído(s)
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-black text-slate-900">
                    {moeda(servico.receita)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-slate-100 p-6 text-center text-xs font-bold uppercase text-slate-400">
                Sem serviços concluídos.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            Conferência de Atendimentos
          </CardTitle>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, serviço ou profissional..."
              className="h-9 rounded-xl border-slate-300 bg-white pl-9 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {atendimentosFiltrados.length > 0 ? (
            atendimentosFiltrados.map((item) => {
              const status = normalizarStatus(item.status);
              const concluido = STATUS_CONCLUIDOS.includes(status);
              const previsto = STATUS_PREVISTOS.includes(status);

              return (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase text-slate-900">
                        {item.cliente}
                      </p>
                      <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase ${
                        concluido
                          ? 'bg-emerald-50 text-emerald-700'
                          : previsto
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      {item.dataLabel} · {item.servico} · {item.profissional}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left sm:w-56 sm:text-right">
                    <div className="rounded-xl bg-white p-2">
                      <p className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 sm:justify-end">
                        <ArrowUpRight className="h-3 w-3" />
                        Valor
                      </p>
                      <p className="text-xs font-black text-slate-900">{moeda(item.valor)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <p className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 sm:justify-end">
                        <ArrowDownRight className="h-3 w-3" />
                        Comissão
                      </p>
                      <p className="text-xs font-black text-amber-700">{moeda(item.comissao)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-100 p-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs font-bold uppercase text-slate-400">
                Nenhum atendimento encontrado para o filtro atual.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
