import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  ClipboardList,
  MessageSquareText,
  MousePointerClick,
  WalletCards,
} from 'lucide-react';

const etapasDemo = [
  {
    title: '1. Abra pelo Dashboard',
    description: 'Mostre KPIs, checklist de ativação e saúde do estúdio.',
    path: 'dashboard',
    icon: BarChart3,
  },
  {
    title: '2. Simule o link público',
    description: 'Mostre o agendamento white-label com marca do estúdio.',
    path: null,
    publicLink: true,
    icon: MousePointerClick,
  },
  {
    title: '3. Confirme na Agenda',
    description: 'Aprove a reserva pendente e conclua um atendimento.',
    path: 'agenda',
    icon: CalendarCheck2,
  },
  {
    title: '4. Mostre automações',
    description: 'Use filas de confirmação, lembrete e recuperação.',
    path: 'automacoes',
    icon: MessageSquareText,
  },
  {
    title: '5. Feche no Financeiro',
    description: 'Apresente faturamento, comissão e exportação CSV.',
    path: 'financeiro',
    icon: WalletCards,
  },
];

export default function DemoPresentationChecklist() {
  const { slug } = useParams();
  const studioSlug = slug || 'studio-demo';

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Roteiro comercial
            </p>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
              Demo vendável em 5 minutos
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase text-slate-500">
            <ClipboardList className="h-4 w-4" />
            Apresentação
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-5">
          {etapasDemo.map(({ title, description, path, publicLink, icon: Icon }) => {
            const href = publicLink ? `/${studioSlug}` : `/admin/${studioSlug}/${path}`;

            return (
              <Link
                key={title}
                to={href}
                target={publicLink ? '_blank' : undefined}
                className="group rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </div>
                <p className="mt-3 text-xs font-black uppercase leading-tight text-slate-900">
                  {title}
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
                  {description}
                </p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
