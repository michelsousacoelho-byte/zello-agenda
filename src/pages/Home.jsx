import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero.png';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  MessageSquareText,
  Sparkles,
  WalletCards,
} from 'lucide-react';

const recursos = [
  {
    title: 'Agenda online',
    description: 'Link público com marca do estúdio, serviços, profissionais e horários disponíveis.',
    icon: CalendarCheck2,
  },
  {
    title: 'Financeiro e comissões',
    description: 'Fechamento mensal, faturamento realizado, previsão de caixa e repasse por profissional.',
    icon: WalletCards,
  },
  {
    title: 'Automação assistida',
    description: 'Filas para confirmação, lembrete, pós-atendimento e recuperação via WhatsApp.',
    icon: MessageSquareText,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide">Zello Agenda</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Beauty SaaS</p>
            </div>
          </div>
          <Link to="/login" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-white/15">
            Entrar
          </Link>
        </div>
      </header>

      <section className="relative flex min-h-[92vh] items-end overflow-hidden">
        <img
          src={heroImage}
          alt=""
          className="absolute bottom-8 right-[-40px] h-[58vh] max-h-[520px] min-h-[320px] w-auto opacity-35 sm:right-[4vw] sm:opacity-55 lg:bottom-16"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-20">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950">
              Sistema profissional para estética e beleza
            </p>
            <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Zello Agenda
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-white/72 sm:text-lg">
              Plataforma de agendamento, operação, financeiro e relacionamento para estúdios que querem vender mais horários sem perder controle.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/studio-demo/login">
                <Button className="h-12 w-full rounded-xl bg-white px-6 text-xs font-black uppercase tracking-wide text-slate-950 hover:bg-slate-100 sm:w-auto">
                  Acessar demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/studio-demo">
                <Button variant="outline" className="h-12 w-full rounded-xl border-white/25 bg-white/10 px-6 text-xs font-black uppercase tracking-wide text-white hover:bg-white/15 sm:w-auto">
                  Ver link público
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            {[
              ['Dashboard', 'KPIs e visão executiva'],
              ['Operação', 'Serviços, equipe e agenda inteligente'],
              ['Venda', 'Link público com identidade do estúdio'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-white">{title}</p>
                <p className="mt-1 text-xs font-semibold leading-snug text-white/55">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-3">
          {recursos.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-sm font-black uppercase tracking-wide">{title}</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Pronto para demonstração comercial
            </p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-tight">Mostre o produto funcionando, não uma promessa.</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Use a demo para apresentar o fluxo completo: reserva pública, agenda, automação e financeiro.
            </p>
          </div>
          <Link to="/studio-demo/login">
            <Button className="h-11 rounded-xl bg-slate-950 px-5 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800">
              Abrir painel
              <BarChart3 className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
