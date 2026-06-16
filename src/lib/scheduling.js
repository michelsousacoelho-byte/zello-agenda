const STATUS_BLOQUEADOS = ['confirmado', 'pendente', 'concluído', 'concluido'];

export function normalizarStatusAgenda(status) {
  return (status || '').toLowerCase();
}

export function horarioParaMinutos(valor, fallback = 0) {
  if (!valor || typeof valor !== 'string') return fallback;
  const [hora, minuto = '0'] = valor.split(':');
  const h = Number(hora);
  const m = Number(minuto);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return h * 60 + m;
}

export function minutosParaHorario(totalMinutos) {
  const hora = Math.floor(totalMinutos / 60);
  const minuto = totalMinutos % 60;
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

export function obterDuracaoServico(servico, fallback = 60) {
  const duracao = Number(servico?.duracao || servico?.duracao_minutos || servico?.duration || fallback);
  return Number.isFinite(duracao) && duracao > 0 ? duracao : fallback;
}

export function obterConfiguracaoAgenda(estabelecimento = {}, profissional = null) {
  const inicio =
    profissional?.horario_inicio ||
    estabelecimento.horario_inicio ||
    estabelecimento.hora_abertura ||
    estabelecimento.horario_abertura ||
    estabelecimento.inicio_expediente ||
    '08:00';
  const fim =
    profissional?.horario_fim ||
    estabelecimento.horario_fim ||
    estabelecimento.hora_fechamento ||
    estabelecimento.horario_fechamento ||
    estabelecimento.fim_expediente ||
    '18:00';
  const intervalo = Number(
    estabelecimento.intervalo_agenda ||
    estabelecimento.intervalo_minutos ||
    estabelecimento.slot_interval ||
    30
  );

  return {
    inicio,
    fim,
    intervalo: Number.isFinite(intervalo) && intervalo > 0 ? intervalo : 30,
    inicioMinutos: horarioParaMinutos(inicio, 8 * 60),
    fimMinutos: horarioParaMinutos(fim, 18 * 60),
  };
}

export function dataLocalISO(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.split('T')[0];
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function obterInicioAgendamentoMinutos(agendamento) {
  const hora = agendamento?.data_hora?.split('T')[1]?.substring(0, 5);
  return horarioParaMinutos(hora, 0);
}

function intervalosSobrepostos(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && fimA > inicioB;
}

export function gerarHorariosDisponiveis({
  data,
  servico,
  agendamentos = [],
  estabelecimento = {},
  profissional = null,
  idAgendamentoIgnorado = null,
}) {
  if (!data || !servico) return [];

  const dataAlvo = dataLocalISO(data);
  const config = obterConfiguracaoAgenda(estabelecimento, profissional);
  const duracaoSelecionada = obterDuracaoServico(servico);
  const capacidadeSelecionada = Math.max(Number(servico.capacidade_simultanea || 1), 1);
  const profissionalId = profissional?.id || profissional?.profissional_id || null;
  const horarios = [];

  for (
    let inicioSlot = config.inicioMinutos;
    inicioSlot + duracaoSelecionada <= config.fimMinutos;
    inicioSlot += config.intervalo
  ) {
    const fimSlot = inicioSlot + duracaoSelecionada;
    const conflitos = agendamentos.filter((ag) => {
      if (!ag?.data_hora || ag.id === idAgendamentoIgnorado) return false;
      if (dataLocalISO(ag.data_hora) !== dataAlvo) return false;
      if (!STATUS_BLOQUEADOS.includes(normalizarStatusAgenda(ag.status))) return false;
      if (profissionalId && ag.profissional_id && String(ag.profissional_id) !== String(profissionalId)) return false;

      const inicioAgendamento = obterInicioAgendamentoMinutos(ag);
      const fimAgendamento = inicioAgendamento + obterDuracaoServico(ag.servicos);
      return intervalosSobrepostos(inicioSlot, fimSlot, inicioAgendamento, fimAgendamento);
    });

    const disponivel = profissionalId
      ? conflitos.length === 0
      : (() => {
          const conflitoOutroServico = conflitos.some((ag) => String(ag.servico_id) !== String(servico.id));
          const conflitosMesmoServico = conflitos.filter((ag) => String(ag.servico_id) === String(servico.id)).length;
          return !conflitoOutroServico && conflitosMesmoServico < capacidadeSelecionada;
        })();

    horarios.push({
      hora: minutosParaHorario(inicioSlot),
      fim: minutosParaHorario(fimSlot),
      disponivel,
      conflitos: conflitos.length,
    });
  }

  return horarios;
}

export function agruparHorariosPorPeriodo(horarios) {
  return {
    manha: horarios.filter((slot) => horarioParaMinutos(slot.hora) < 12 * 60),
    tarde: horarios.filter((slot) => {
      const minutos = horarioParaMinutos(slot.hora);
      return minutos >= 12 * 60 && minutos < 18 * 60;
    }),
    noite: horarios.filter((slot) => horarioParaMinutos(slot.hora) >= 18 * 60),
  };
}
