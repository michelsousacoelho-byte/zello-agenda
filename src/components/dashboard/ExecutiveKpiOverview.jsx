import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CalendarCheck,
  Clock3,
  DollarSign,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function MetricTile({ title, value, description, icon: Icon, tone = 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 min-h-8 text-xs font-semibold leading-snug text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function ExecutiveKpiOverview({ metrics }) {
  const recorrentesTotal = metrics.clientesRecorrentes + metrics.clientesNovos;
  const recorrentesPercent =
    recorrentesTotal > 0 ? (metrics.clientesRecorrentes / recorrentesTotal) * 100 : 0;
  const novosPercent =
    recorrentesTotal > 0 ? (metrics.clientesNovos / recorrentesTotal) * 100 : 0;

  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Visao executiva
            </p>
            <h2 className="text-lg font-black tracking-tight text-slate-950">
              Saude do estudio em tempo real
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            <CalendarCheck className="h-4 w-4 text-slate-500" />
            {metrics.periodoLabel}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            title="Faturamento hoje"
            value={formatCurrency(metrics.faturamentoHoje)}
            description={`${metrics.atendimentosHoje} atendimento(s) na agenda de hoje.`}
            icon={DollarSign}
            tone="emerald"
          />
          <MetricTile
            title="Faturamento do mes"
            value={formatCurrency(metrics.faturamentoMes)}
            description="Receita concluida no mes corrente, pronta para decisao de caixa."
            icon={TrendingUp}
            tone="sky"
          />
          <MetricTile
            title="Ocupacao"
            value={`${Math.round(metrics.ocupacaoAgenda)}%`}
            description={`${metrics.horasOcupadas.toFixed(1)}h ocupadas da capacidade comercial.`}
            icon={Clock3}
            tone="amber"
          />
          <MetricTile
            title="Base ativa"
            value={`${metrics.clientesRecorrentes} / ${metrics.clientesNovos}`}
            description="Clientes recorrentes vs. novos clientes no periodo."
            icon={Users}
            tone="slate"
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Ocupacao da agenda
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  Quanto da capacidade esta vendida
                </p>
              </div>
              <span className="rounded-lg bg-white px-3 py-1 text-sm font-black text-slate-900 shadow-sm">
                {Math.round(metrics.ocupacaoAgenda)}%
              </span>
            </div>
            <Progress
              value={metrics.ocupacaoAgenda}
              className="mt-4 h-3 rounded-full bg-white [&>div]:rounded-full [&>div]:bg-slate-900"
            />
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Recorrencia de clientes
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  Sinal de fidelizacao e aquisicao
                </p>
              </div>
              <UserPlus className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white">
              <div className="bg-slate-900" style={{ width: `${recorrentesPercent}%` }} />
              <div className="bg-emerald-500" style={{ width: `${novosPercent}%` }} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
              <div className="rounded-lg bg-white p-3">
                <span className="block text-[10px] uppercase tracking-wide text-slate-400">
                  Recorrentes
                </span>
                <span className="text-slate-950">{metrics.clientesRecorrentes}</span>
              </div>
              <div className="rounded-lg bg-white p-3">
                <span className="block text-[10px] uppercase tracking-wide text-slate-400">
                  Novos
                </span>
                <span className="text-emerald-600">{metrics.clientesNovos}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
