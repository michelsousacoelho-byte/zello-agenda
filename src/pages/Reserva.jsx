import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addDays, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  Phone,
  Sparkles,
  Store,
  User,
  UserCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  agruparHorariosPorPeriodo,
  gerarHorariosDisponiveis,
  obterDuracaoServico,
} from '@/lib/scheduling';

const ETAPAS = {
  SERVICO: 1,
  PROFISSIONAL: 2,
  HORARIO: 3,
  CLIENTE: 4,
  CONFIRMACAO: 5,
  SUCESSO: 6,
};

function formatarTelefone(valor) {
  if (!valor) return '';
  const apenasNumeros = valor.replace(/\D/g, '');
  if (apenasNumeros.length <= 2) return apenasNumeros.replace(/^(\d{0,2})/, '($1');
  if (apenasNumeros.length <= 6) return apenasNumeros.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  if (apenasNumeros.length <= 10) return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return apenasNumeros.substring(0, 11).replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

function telefoneNumerico(valor) {
  return (valor || '').replace(/\D/g, '').substring(0, 11);
}

function obterNomeEstudio(estabelecimento) {
  return estabelecimento?.nome_estudio || estabelecimento?.nome || 'Zello Agenda';
}

function obterMensagemPublica(estabelecimento) {
  return estabelecimento?.mensagem_publica || 'Escolha seu procedimento e reserve o melhor horário para você.';
}

function obterWhatsAppPublico(estabelecimento) {
  const telefone = (estabelecimento?.whatsapp || estabelecimento?.telefone || '').replace(/\D/g, '');
  if (!telefone) return '';
  return telefone.startsWith('55') ? telefone : `55${telefone}`;
}

function obterMensagemErroReserva(erro) {
  const mensagem = erro?.message || '';

  if (mensagem.toLowerCase().includes('telefone')) {
    return 'Confira o WhatsApp informado e tente novamente.';
  }

  if (mensagem.toLowerCase().includes('schema cache') || mensagem.toLowerCase().includes('function')) {
    return 'A agenda está atualizando. Tente novamente em alguns segundos.';
  }

  if (mensagem.toLowerCase().includes('permission') || mensagem.toLowerCase().includes('policy')) {
    return 'Não foi possível registrar a reserva por uma configuração de acesso.';
  }

  return 'Não foi possível confirmar sua reserva. Tente novamente.';
}

export default function Reserva() {
  const { slug } = useParams();
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [vinculosProfissionais, setVinculosProfissionais] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [etapa, setEtapa] = useState(ETAPAS.SERVICO);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [clienteCriado, setClienteCriado] = useState(null);
  const [selecionado, setSelecionado] = useState({
    servico: null,
    profissional: null,
    data: addDays(new Date(), 1),
    hora: '',
  });
  const [cliente, setCliente] = useState({
    nome: '',
    telefone: '',
  });
  const corPrimaria = estabelecimento?.cor_primaria || '#0f172a';
  const corSecundaria = estabelecimento?.cor_secundaria || '#10b981';
  const corFundo = estabelecimento?.cor_fundo || '#f8fafc';
  const nomeEstudio = obterNomeEstudio(estabelecimento);
  const whatsappPublico = obterWhatsAppPublico(estabelecimento);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setErro('');
      const currentSlug = slug || 'studio-demo';
      const { data: est, error: errEst } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('slug', currentSlug)
        .maybeSingle();

      if (errEst) throw errEst;
      if (!est) {
        setErro('Página de agendamento não encontrada.');
        return;
      }

      setEstabelecimento(est);

      const [
        { data: srv, error: errSrv },
        { data: ag, error: errAg },
        { data: prof, error: errProf },
        { data: vinc, error: errVinc },
      ] = await Promise.all([
        supabase
          .from('servicos')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .order('nome', { ascending: true }),
        supabase
          .rpc('listar_agendamentos_publicos', { p_estabelecimento_id: est.id }),
        supabase
          .from('profissionais')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .eq('ativo', true)
          .order('nome', { ascending: true }),
        supabase
          .from('servico_profissionais')
          .select('*'),
      ]);

      if (errSrv) throw errSrv;
      if (errAg) throw errAg;
      if (errProf) throw errProf;
      if (errVinc) throw errVinc;

      setServicos(srv || []);
      setAgendamentos(ag || []);
      setProfissionais(prof || []);
      setVinculosProfissionais(vinc || []);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível carregar a agenda. Tente novamente em alguns instantes.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDados();
  }, [carregarDados]);

  const proximosDias = useMemo(
    () => Array.from({ length: 14 }, (_, index) => addDays(new Date(), index)),
    []
  );

  const horariosDisponiveis = useMemo(() => gerarHorariosDisponiveis({
    data: selecionado.data,
    servico: selecionado.servico,
    agendamentos,
    estabelecimento,
    profissional: selecionado.profissional,
  }), [agendamentos, estabelecimento, selecionado.data, selecionado.profissional, selecionado.servico]);

  const horariosPorPeriodo = useMemo(
    () => agruparHorariosPorPeriodo(horariosDisponiveis),
    [horariosDisponiveis]
  );

  const selecionarServico = (servico) => {
    const profissionaisDoServico = vinculosProfissionais
      .filter(v => String(v.servico_id) === String(servico.id))
      .map(v => profissionais.find(p => String(p.id) === String(v.profissional_id)))
      .filter(Boolean);

    setSelecionado({
      servico,
      profissional: profissionaisDoServico.length === 1 ? profissionaisDoServico[0] : null,
      data: selecionado.data || addDays(new Date(), 1),
      hora: '',
    });
    setEtapa(profissionaisDoServico.length > 1 ? ETAPAS.PROFISSIONAL : ETAPAS.HORARIO);
  };

  const profissionaisDoServicoSelecionado = useMemo(() => {
    if (!selecionado.servico) return [];
    return vinculosProfissionais
      .filter(v => String(v.servico_id) === String(selecionado.servico.id))
      .map(v => profissionais.find(p => String(p.id) === String(v.profissional_id)))
      .filter(Boolean);
  }, [profissionais, selecionado.servico, vinculosProfissionais]);

  const selecionarProfissional = (profissional) => {
    setSelecionado(prev => ({ ...prev, profissional, hora: '' }));
    setEtapa(ETAPAS.HORARIO);
  };

  const selecionarData = (data) => {
    setSelecionado(prev => ({ ...prev, data, hora: '' }));
  };

  const selecionarHorario = (hora) => {
    const disponivel = horariosDisponiveis.some(slot => slot.hora === hora && slot.disponivel);
    if (!disponivel) return;
    setSelecionado(prev => ({ ...prev, hora }));
    setEtapa(ETAPAS.CLIENTE);
  };

  const voltar = () => {
    if (etapa === ETAPAS.PROFISSIONAL) setEtapa(ETAPAS.SERVICO);
    if (etapa === ETAPAS.HORARIO) setEtapa(profissionaisDoServicoSelecionado.length > 1 ? ETAPAS.PROFISSIONAL : ETAPAS.SERVICO);
    if (etapa === ETAPAS.CLIENTE) setEtapa(ETAPAS.HORARIO);
    if (etapa === ETAPAS.CONFIRMACAO) setEtapa(ETAPAS.CLIENTE);
  };

  const avancarCliente = (e) => {
    e.preventDefault();
    if (!cliente.nome.trim() || telefoneNumerico(cliente.telefone).length < 10) {
      setErro('Informe nome e telefone para continuar.');
      return;
    }
    setErro('');
    setEtapa(ETAPAS.CONFIRMACAO);
  };

  const criarClientePublico = async () => {
    const telefone = telefoneNumerico(cliente.telefone);
    const payload = {
      p_estabelecimento_id: estabelecimento.id,
      p_nome: cliente.nome.trim(),
      p_telefone: telefone,
    };

    const { data: clienteExistenteOuNovo, error: errRpc } = await supabase
      .rpc('buscar_ou_criar_cliente_publico', payload);

    if (errRpc) throw errRpc;
    if (!clienteExistenteOuNovo?.id) {
      throw new Error('Não foi possível identificar ou criar a cliente pelo telefone.');
    }

    setClienteCriado(clienteExistenteOuNovo);
    return clienteExistenteOuNovo;
  };

  const confirmarReserva = async () => {
    try {
      setEnviando(true);
      setErro('');

      const { data: agAtualizados, error: errAg } = await supabase
        .rpc('listar_agendamentos_publicos', { p_estabelecimento_id: estabelecimento.id });

      if (errAg) throw errAg;

      const slotLivre = gerarHorariosDisponiveis({
        data: selecionado.data,
        servico: selecionado.servico,
        agendamentos: agAtualizados || [],
        estabelecimento,
        profissional: selecionado.profissional,
      }).some(slot => slot.hora === selecionado.hora && slot.disponivel);

      if (!slotLivre) {
        setAgendamentos(agAtualizados || []);
        setErro('Este horário acabou de ser reservado. Escolha outro horário disponível.');
        setEtapa(ETAPAS.HORARIO);
        return;
      }

      const clienteFinal = await criarClientePublico();
      const { error: errReserva } = await supabase
        .from('agendamentos')
        .insert([{
          estabelecimento_id: estabelecimento.id,
          cliente_id: clienteFinal.id,
          servico_id: selecionado.servico.id,
          profissional_id: selecionado.profissional?.id || null,
          data_hora: `${format(selecionado.data, 'yyyy-MM-dd')}T${selecionado.hora}:00`,
          status: 'Pendente',
        }]);

      if (errReserva) throw errReserva;
      setEtapa(ETAPAS.SUCESSO);
      carregarDados();
    } catch (e) {
      console.error(e);
      setErro(obterMensagemErroReserva(e));
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (erro && !estabelecimento) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <Card className="max-w-sm p-6 border-slate-200 bg-white shadow-sm">
          <Store className="w-8 h-8 mx-auto text-slate-400 mb-3" />
          <h1 className="text-lg font-black text-slate-900">Agenda indisponível</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{erro}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-800 antialiased" style={{ background: corFundo }}>
      <header className="sticky top-0 z-40 text-white shadow-sm" style={{ background: corPrimaria }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10" style={{ color: corSecundaria }}>
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                Agendamento online
              </p>
              <h1 className="truncate text-sm font-black uppercase tracking-wide">
                {nomeEstudio}
              </h1>
            </div>
          </div>
          {whatsappPublico && (
            <a
              href={`https://wa.me/${whatsappPublico}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15"
              aria-label="Falar no WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-5">
        {etapa === ETAPAS.SERVICO && (
          <section className="mb-5 overflow-hidden rounded-3xl text-white shadow-sm" style={{ background: corPrimaria }}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    Reserve online
                  </p>
                  <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">
                    {nomeEstudio}
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">
                    {obterMensagemPublica(estabelecimento)}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10" style={{ color: corSecundaria }}>
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase text-white/70">
                <span className="rounded-xl bg-white/10 px-3 py-1.5">Confirmação rápida</span>
                <span className="rounded-xl bg-white/10 px-3 py-1.5">Horários disponíveis</span>
              </div>
            </div>
            <div className="h-1.5" style={{ background: corSecundaria }} />
          </section>
        )}

        {etapa !== ETAPAS.SERVICO && etapa !== ETAPAS.SUCESSO && (
          <button
            type="button"
            onClick={voltar}
            className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-600 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}

        {erro && estabelecimento && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
            {erro}
          </div>
        )}

        {etapa === ETAPAS.SERVICO && (
          <section className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Passo 1 de 4
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Escolha o procedimento
              </h2>
            </div>

            {servicos.length > 0 ? (
              <div className="space-y-3">
                {servicos.map((servico) => (
                  <button
                    key={servico.id}
                    type="button"
                    onClick={() => selecionarServico(servico)}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-slate-400"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: corPrimaria }}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black uppercase text-slate-950">
                          {servico.nome}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {obterDuracaoServico(servico)} min
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black" style={{ color: corPrimaria }}>
                        R$ {Number(servico.preco || 0).toFixed(0)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-slate-200 bg-white p-6 text-center">
                <p className="text-sm font-bold text-slate-500">
                  Nenhum procedimento disponível no momento.
                </p>
              </Card>
            )}
          </section>
        )}

        {etapa === ETAPAS.PROFISSIONAL && (
          <section className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Passo 2 de 5
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Escolha o profissional
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {selecionado.servico?.nome}
              </p>
            </div>

            <div className="space-y-3">
              {profissionaisDoServicoSelecionado.map((profissional) => (
                <button
                  key={profissional.id}
                  type="button"
                  onClick={() => selecionarProfissional(profissional)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-slate-400"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: corPrimaria }}>
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black uppercase text-slate-950">
                        {profissional.nome}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {profissional.especialidade || 'Profissional do estúdio'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </section>
        )}

        {etapa === ETAPAS.HORARIO && (
          <section className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Passo {profissionaisDoServicoSelecionado.length > 1 ? '3' : '2'} de {profissionaisDoServicoSelecionado.length > 1 ? '5' : '4'}
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Escolha data e horário
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {selecionado.servico?.nome} · {obterDuracaoServico(selecionado.servico)} min
                {selecionado.profissional ? ` · ${selecionado.profissional.nome}` : ''}
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {proximosDias.map((dia) => (
                <button
                  key={dia.toISOString()}
                  type="button"
                  onClick={() => selecionarData(dia)}
                  className={`flex min-w-[76px] flex-col items-center rounded-xl border p-3 transition-all ${
                    isSameDay(selecionado.data, dia)
                      ? 'text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                  style={isSameDay(selecionado.data, dia) ? { background: corPrimaria, borderColor: corPrimaria } : undefined}
                >
                  <span className="text-[9px] font-black uppercase opacity-70">
                    {format(dia, 'EEE', { locale: ptBR })}
                  </span>
                  <span className="mt-0.5 text-lg font-black">
                    {format(dia, 'dd')}
                  </span>
                </button>
              ))}
            </div>

            <Card className="space-y-4 border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                <CalendarCheck className="h-4 w-4" />
                {format(selecionado.data, "dd 'de' MMMM", { locale: ptBR })}
              </div>

              {[
                ['Manhã', horariosPorPeriodo.manha],
                ['Tarde', horariosPorPeriodo.tarde],
                ['Noite', horariosPorPeriodo.noite],
              ].filter(([, slots]) => slots.length > 0).map(([periodo, slots]) => (
                <div key={periodo} className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {periodo}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot.hora}
                        type="button"
                        disabled={!slot.disponivel}
                        onClick={() => selecionarHorario(slot.hora)}
                        className={`h-11 rounded-xl border text-xs font-black transition-colors ${
                          slot.disponivel
                            ? 'border-slate-200 bg-slate-50 text-slate-900 hover:text-white'
                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 line-through'
                        }`}
                        style={slot.disponivel ? { '--tw-ring-color': corPrimaria } : undefined}
                        onMouseEnter={(e) => {
                          if (slot.disponivel) e.currentTarget.style.background = corPrimaria;
                        }}
                        onMouseLeave={(e) => {
                          if (slot.disponivel) e.currentTarget.style.background = '';
                        }}
                      >
                        {slot.hora}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {!horariosDisponiveis.some(slot => slot.disponivel) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-bold text-amber-700">
                  Não há horários livres para esse procedimento nesta data.
                </div>
              )}
            </Card>
          </section>
        )}

        {etapa === ETAPAS.CLIENTE && (
          <section className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Passo {profissionaisDoServicoSelecionado.length > 1 ? '4' : '3'} de {profissionaisDoServicoSelecionado.length > 1 ? '5' : '4'}
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Seus dados
              </h2>
            </div>

            <Card className="border-slate-200 bg-white p-4 shadow-sm">
              <form onSubmit={avancarCliente} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={cliente.nome}
                      onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                      placeholder="Digite seu nome"
                      className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-sm font-bold text-slate-900"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={cliente.telefone}
                      onChange={(e) => setCliente({ ...cliente, telefone: formatarTelefone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-sm font-bold text-slate-900"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="h-11 w-full rounded-xl text-xs font-black uppercase text-white" style={{ background: corPrimaria }}>
                  Continuar
                </Button>
              </form>
            </Card>
          </section>
        )}

        {etapa === ETAPAS.CONFIRMACAO && (
          <section className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Passo {profissionaisDoServicoSelecionado.length > 1 ? '5' : '4'} de {profissionaisDoServicoSelecionado.length > 1 ? '5' : '4'}
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Confirmar reserva
              </h2>
            </div>

            <Card className="border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-3 text-sm font-bold text-slate-600">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>Procedimento</span>
                  <span className="text-right font-black text-slate-950">{selecionado.servico?.nome}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>Data</span>
                  <span className="font-black text-slate-950">{format(selecionado.data, 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>Horário</span>
                  <span className="font-black text-slate-950">{selecionado.hora}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>Profissional</span>
                  <span className="text-right font-black text-slate-950">
                    {selecionado.profissional?.nome || 'Definido pelo estúdio'}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span>Cliente</span>
                  <span className="text-right font-black text-slate-950">{cliente.nome}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1">
                  <span>Valor</span>
                  <span className="text-base font-black text-slate-950">
                    R$ {Number(selecionado.servico?.preco || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                disabled={enviando}
                onClick={confirmarReserva}
                className="mt-5 h-12 w-full rounded-xl text-xs font-black uppercase text-white"
                style={{ background: corSecundaria }}
              >
                {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar agendamento'}
              </Button>
            </Card>
          </section>
        )}

        {etapa === ETAPAS.SUCESSO && (
          <section className="mx-auto max-w-sm py-8 text-center">
            <Card className="space-y-4 border-slate-200 bg-white p-8 shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase text-slate-950">
                  Pedido recebido
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                  Seu horário foi enviado para {nomeEstudio} e aparecerá na agenda como pendente.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
                {clienteCriado?.nome || cliente.nome} · {formatarTelefone(cliente.telefone)}
              </div>
              <Button
                onClick={() => {
                  setEtapa(ETAPAS.SERVICO);
                  setSelecionado({ servico: null, profissional: null, data: addDays(new Date(), 1), hora: '' });
                  setCliente({ nome: '', telefone: '' });
                  setClienteCriado(null);
                }}
                className="h-11 w-full rounded-xl text-xs font-black uppercase text-white"
                style={{ background: corPrimaria }}
              >
                Fazer nova reserva
              </Button>
              {whatsappPublico && (
                <a
                  href={`https://wa.me/${whatsappPublico}?text=${encodeURIComponent(`Olá! Acabei de solicitar uma reserva pelo link do ${nomeEstudio}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-black uppercase text-emerald-700 hover:bg-emerald-100"
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar no WhatsApp
                </a>
              )}
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
