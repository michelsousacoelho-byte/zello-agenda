import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calendar, Users, DollarSign, TrendingUp, Star, Award, Clock,
  Info, Download, Target, ChevronLeft, ChevronRight, CheckCircle2, CalendarClock
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { format, getDaysInMonth, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Constante de Meta Mensal ────────────────────────────────────────────────
const META_MENSAL_PADRAO = 5000;

// ─── Utilitários ─────────────────────────────────────────────────────────────
function calcVariacao(atual, anterior) {
  if (!anterior || anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

function exportarCSV(stats, carroChefe, mesLabel, ano) {
  const linhas = [
    ['Métrica', 'Valor'],
    ['Período', `${mesLabel} / ${ano}`],
    ['Faturamento Líquido', `R$ ${stats.receitaReal.toFixed(2)}`],
    ['Previsão de Caixa', `R$ ${stats.receitaPrevista.toFixed(2)}`],
    ['Agendamentos', stats.total],
    ['Total de Clientes', stats.clientes],
    ['Atendimentos Hoje', stats.hoje],
    [],
    ['Procedimento', 'Concluídos', 'Agendados', 'Taxa de Conversão (%)'],
    ...carroChefe.map(item => [
      item.nome,
      item.concluidos,
      item.agendados,
      item.total > 0 ? ((item.concluidos / item.total) * 100).toFixed(1) : '0.0'
    ])
  ];

  const csv = linhas.map(l => l.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio_${mesLabel.toLowerCase().replace(/\s/g, '_')}_${ano}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Tooltip Info ─────────────────────────────────────────────────────────────
function InfoTooltip({ texto }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-xs font-medium bg-slate-900 text-white border-0">
          {texto}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── StatCard com variação percentual ────────────────────────────────────────
function StatCard({ title, value, icon: Icon, className = '', tooltip = '', variacao = null }) {
  const variacaoPositiva = variacao !== null && variacao >= 0;
  const variacaoLabel = variacao !== null
    ? `${variacaoPositiva ? '+' : ''}${variacao.toFixed(1)}% vs mês ant.`
    : null;

  return (
    <Card className={`border border-slate-200 bg-white shadow-sm rounded-2xl hover:shadow-md transition-all ${className}`}>
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
            {tooltip && <InfoTooltip texto={tooltip} />}
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">{value}</h3>
          {variacaoLabel && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block ${
              variacaoPositiva
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-500'
            }`}>
              {variacaoLabel}
            </span>
          )}
        </div>
        <div className="p-3 bg-slate-50 rounded-xl text-slate-700 shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Seletor de Período ───────────────────────────────────────────────────────
function SeletorPeriodo({ mes, ano, onChange }) {
  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  const mesLabel = mes === 'todos' ? `Ano todo ${ano}` : `${meses[Number(mes) - 1]} ${ano}`;

  const avancar = () => {
    if (mes === 'todos') {
      onChange('todos', Number(ano) + 1);
    } else {
      const d = new Date(Number(ano), Number(mes) - 1, 1);
      d.setMonth(d.getMonth() + 1);
      onChange(String(d.getMonth() + 1), d.getFullYear());
    }
  };

  const recuar = () => {
    if (mes === 'todos') {
      onChange('todos', Number(ano) - 1);
    } else {
      const d = new Date(Number(ano), Number(mes) - 1, 1);
      d.setMonth(d.getMonth() - 1);
      onChange(String(d.getMonth() + 1), d.getFullYear());
    }
  };

  const toggleTodos = () => {
    if (mes === 'todos') {
      onChange(String(new Date().getMonth() + 1), new Date().getFullYear());
    } else {
      onChange('todos', Number(ano));
    }
  };

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      <button onClick={recuar} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={toggleTodos} className="h-7 px-3 text-xs font-black text-slate-700 hover:bg-white hover:shadow-sm rounded-lg transition-all min-w-[110px] text-center">
        {mesLabel}
      </button>
      <button onClick={avancar} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Tooltip customizado do Recharts ─────────────────────────────────────────
function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl space-y-1 border border-slate-700">
      <p className="font-black text-slate-300 uppercase tracking-wider">Dia {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: R$ {Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { slug } = useParams();
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({ hoje: 0, total: 0, clientes: 0, receitaReal: 0, receitaPrevista: 0 });
  const [statsAntMes, setStatsAntMes] = useState({ receitaReal: 0, receitaPrevista: 0, total: 0 });
  const [carroChefe, setCarroChefe] = useState([]);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Carrega estabelecimento uma única vez ──────────────────────────────────
  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true);
        const currentSlug = slug || 'studio-demo';
        const { data } = await supabase
          .from('estabelecimentos')
          .select('*')
          .eq('slug', currentSlug)
          .maybeSingle();
        if (data) setEstabelecimento(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [slug]);

  // ── Carrega métricas quando estabelecimento ou filtro muda ─────────────────
  const carregarMetricas = useCallback(async () => {
    if (!estabelecimento?.id) return;
    try {
      setLoading(true);

      // Busca todos os agendamentos (atual + mês anterior para comparativo)
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('*, clientes(*), servicos(*)')
        .eq('estabelecimento_id', estabelecimento.id);

      const { data: totalClientesData } = await supabase
        .from('clientes')
        .select('id')
        .eq('estabelecimento_id', estabelecimento.id);

      const hojeStr = new Date().toISOString().split('T')[0];

      // Período atual
      let totalHoje = 0, totalGeral = 0, receitaRealizada = 0, receitaEstimada = 0;
      // Mês anterior
      let receitaRealAnt = 0, receitaEstAnt = 0, totalAnt = 0;

      const contagemServicos = {};
      const mapaDiario = {}; // { 'dia': { real: 0, prevista: 0 } }

      // Calcula período do mês anterior para comparativo
      const mesAntRef = mes === 'todos'
        ? { m: null, a: Number(ano) - 1 }
        : (() => {
            const d = subMonths(new Date(Number(ano), Number(mes) - 1, 1), 1);
            return { m: d.getMonth() + 1, a: d.getFullYear() };
          })();

      agendamentos?.forEach(ag => {
        const dataStr = ag.data_hora ? ag.data_hora.split('T')[0] : '';
        const dataObj = ag.data_hora ? new Date(ag.data_hora) : null;
        const preco = Number(ag.servicos?.preco || 0);
        const statusNorm = ag.status?.toLowerCase();
        const agMes = dataObj ? dataObj.getMonth() + 1 : null;
        const agAno = dataObj ? dataObj.getFullYear() : null;

        // Hoje
        if (dataStr === hojeStr) totalHoje++;

        // Filtro mês atual
        const noMesAtual = mes === 'todos'
          ? agAno === Number(ano)
          : agMes === Number(mes) && agAno === Number(ano);

        if (dataObj && noMesAtual) {
          totalGeral++;
          const dia = dataObj.getDate();
          if (!mapaDiario[dia]) mapaDiario[dia] = { real: 0, prevista: 0 };

          if (statusNorm === 'concluído' || statusNorm === 'concluido') {
            receitaRealizada += preco;
            mapaDiario[dia].real += preco;
          } else if (statusNorm === 'confirmado' || statusNorm === 'pendente') {
            receitaEstimada += preco;
            mapaDiario[dia].prevista += preco;
          }

          // Ranking de serviços com separação concluídos/agendados
          if (ag.servicos?.nome) {
            const nome = ag.servicos.nome;
            if (!contagemServicos[nome]) contagemServicos[nome] = { concluidos: 0, agendados: 0, total: 0 };
            if (statusNorm === 'concluído' || statusNorm === 'concluido') {
              contagemServicos[nome].concluidos++;
            } else if (statusNorm !== 'cancelado' && statusNorm !== 'falta') {
              contagemServicos[nome].agendados++;
            }
            if (statusNorm !== 'cancelado' && statusNorm !== 'falta') {
              contagemServicos[nome].total++;
            }
          }
        }

        // Filtro mês anterior (comparativo)
        const noMesAnt = mes === 'todos'
          ? agAno === mesAntRef.a
          : agMes === mesAntRef.m && agAno === mesAntRef.a;

        if (dataObj && noMesAnt) {
          totalAnt++;
          if (statusNorm === 'concluído' || statusNorm === 'concluido') receitaRealAnt += preco;
          else if (statusNorm === 'confirmado' || statusNorm === 'pendente') receitaEstAnt += preco;
        }
      });

      // Monta dados do gráfico de linha por dia do mês
      const diasNoMes = mes === 'todos' ? 12 : getDaysInMonth(new Date(Number(ano), Number(mes) - 1));
      const grafico = Array.from({ length: diasNoMes }, (_, i) => {
        const dia = i + 1;
        return {
          dia,
          'Receita Real': mapaDiario[dia]?.real || 0,
          'Receita Prevista': mapaDiario[dia]?.prevista || 0,
        };
      });

      const rankingServicos = Object.entries(contagemServicos)
        .map(([nome, v]) => ({ nome, ...v }))
        .sort((a, b) => b.total - a.total);

      setStats({ hoje: totalHoje, total: totalGeral, clientes: totalClientesData?.length || 0, receitaReal: receitaRealizada, receitaPrevista: receitaEstimada });
      setStatsAntMes({ receitaReal: receitaRealAnt, receitaPrevista: receitaEstAnt, total: totalAnt });
      setCarroChefe(rankingServicos);
      setDadosGrafico(grafico);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [estabelecimento, mes, ano]);

  useEffect(() => {
    carregarMetricas();
  }, [carregarMetricas]);

  // ── Computados ─────────────────────────────────────────────────────────────
  const variacaoReceitaReal = useMemo(() => calcVariacao(stats.receitaReal, statsAntMes.receitaReal), [stats.receitaReal, statsAntMes.receitaReal]);
  const variacaoReceitaPrev = useMemo(() => calcVariacao(stats.receitaPrevista, statsAntMes.receitaPrevista), [stats.receitaPrevista, statsAntMes.receitaPrevista]);
  const variacaoTotal = useMemo(() => calcVariacao(stats.total, statsAntMes.total), [stats.total, statsAntMes.total]);
  const progressoMeta = useMemo(() => Math.min((stats.receitaReal / META_MENSAL_PADRAO) * 100, 100), [stats.receitaReal]);

  const mesesLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const mesLabel = mes === 'todos' ? `Ano todo ${ano}` : `${mesesLabel[Number(mes) - 1]} ${ano}`;

  const handlePeriodoChange = (novoMes, novoAno) => {
    setMes(novoMes);
    setAno(novoAno);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Painel de Controle</h2>
          <p className="text-xs text-slate-400 font-bold uppercase">Métricas operacionais e desempenho</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SeletorPeriodo mes={mes} ano={Number(ano)} onChange={handlePeriodoChange} />
          <button
            onClick={() => exportarCSV(stats, carroChefe, mesLabel, ano)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
        </div>
      </div>

      {/* ── StatCards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Líquido"
          value={`R$ ${stats.receitaReal.toFixed(2)}`}
          icon={DollarSign}
          className="border-l-4 border-l-emerald-500"
          tooltip="Soma de todos os atendimentos com status 'Concluído' no período selecionado."
          variacao={variacaoReceitaReal}
        />
        <StatCard
          title="Previsão de Caixa"
          value={`R$ ${stats.receitaPrevista.toFixed(2)}`}
          icon={TrendingUp}
          className="border-l-4 border-l-sky-500"
          tooltip="Soma dos atendimentos 'Confirmados' e 'Pendentes' — receita ainda não realizada."
          variacao={variacaoReceitaPrev}
        />
        <StatCard
          title="Agendamentos"
          value={stats.total}
          icon={Calendar}
          tooltip="Total de agendamentos no período, excluindo cancelamentos e faltas."
          variacao={variacaoTotal}
        />
        <StatCard
          title="Total de Clientes"
          value={stats.clientes}
          icon={Users}
          tooltip="Número de clientes cadastrados no sistema para este estabelecimento."
        />
      </div>

      {/* ── Meta de Faturamento ── */}
      <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Target className="w-4 h-4" /></div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Meta de Faturamento Mensal</p>
                  <InfoTooltip texto={`Meta padrão de R$ ${META_MENSAL_PADRAO.toLocaleString('pt-BR')}. Edite a constante META_MENSAL_PADRAO no código para ajustar.`} />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  R$ {stats.receitaReal.toFixed(2)} / R$ {META_MENSAL_PADRAO.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <span className={`text-sm font-black px-3 py-1 rounded-xl ${
              progressoMeta >= 100 ? 'bg-emerald-500 text-white' :
              progressoMeta >= 70 ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {progressoMeta.toFixed(0)}%
            </span>
          </div>
          <Progress value={progressoMeta} className="h-3 rounded-full bg-slate-100 [&>div]:bg-emerald-500 [&>div]:rounded-full [&>div]:transition-all [&>div]:duration-700" />
          {progressoMeta >= 100 && (
            <p className="text-[10px] font-black text-emerald-600 mt-2 flex items-center gap-1 uppercase">
              <CheckCircle2 className="w-3 h-3" /> Meta atingida! Parabéns!
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Linha 3: Cards + Gráfico ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Cards esquerda */}
        <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-1 gap-4">
          <Card className="border border-slate-200 bg-white p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-5 h-5" /></div>
              <div>
                <h4 className="text-xl font-black text-slate-800">{stats.hoje}</h4>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Atend. para Hoje</p>
                  <InfoTooltip texto="Número de agendamentos marcados para hoje, independente do status." />
                </div>
              </div>
            </div>
          </Card>

          {/* Funil de Conversão */}
          <Card className="border border-slate-200 bg-white p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><Award className="w-4 h-4" /></div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-slate-800 uppercase">Top Procedimentos</h4>
                <InfoTooltip texto="Concluídos = finalizados. Agendados = confirmados/pendentes. Conversão = concluídos ÷ total." />
              </div>
            </div>
            <div className="space-y-3">
              {carroChefe.length > 0 ? (
                carroChefe.slice(0, 3).map((item, index) => {
                  const taxa = item.total > 0 ? ((item.concluidos / item.total) * 100).toFixed(0) : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[130px]">
                          {index + 1}º {item.nome}
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          Number(taxa) >= 70 ? 'bg-emerald-50 text-emerald-600' :
                          Number(taxa) >= 40 ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>{taxa}% conv.</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                          {item.concluidos} concluídos
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-2.5 h-2.5 text-sky-500" />
                          {item.agendados} agendados
                        </span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${taxa}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs italic text-slate-400">Nenhum dado disponível.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Gráfico de Tendência */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200 bg-white rounded-2xl shadow-sm h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  Tendência de Receita — {mesLabel}
                </CardTitle>
                <InfoTooltip texto="Evolução diária da Receita Real (concluída) vs. Receita Prevista (confirmada/pendente) no período." />
              </div>
            </CardHeader>
            <CardContent className="pb-4 pr-2">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dadosGrafico} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `R$${v}`}
                  />
                  <RechartsTooltip content={<CustomChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Receita Real"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Receita Prevista"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Destaque do Período ── */}
      <Card className="border-none shadow-md bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl text-amber-400"><Star className="w-5 h-5 fill-amber-400" /></div>
          <div>
            <h4 className="text-sm font-black uppercase text-white">Destaque do Período</h4>
            <p className="text-xs text-slate-400 font-bold uppercase">Indicador de Performance</p>
          </div>
        </div>
        <div className="flex-1 sm:text-right">
          {carroChefe.length > 0 && stats.total > 0 ? (
            <p className="text-sm font-medium leading-relaxed text-slate-200">
              O procedimento <span className="text-amber-400 font-black underline">"{carroChefe[0].nome}"</span> lidera,
              representando <span className="font-bold text-amber-400">{Math.round((carroChefe[0].total / stats.total) * 100)}%</span> da demanda total,
              com taxa de conversão de <span className="font-bold text-emerald-400">
                {carroChefe[0].total > 0 ? ((carroChefe[0].concluidos / carroChefe[0].total) * 100).toFixed(0) : 0}%
              </span>.
            </p>
          ) : (
            <p className="text-xs italic text-slate-400">Aguardando consolidação.</p>
          )}
        </div>
      </Card>

    </div>
  );
}
