export const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'ativa',
  PENDING: 'pendente',
  PAST_DUE: 'past_due',
  CANCELED: 'cancelada',
  EXPIRED: 'expirada',
};

export const PLANOS_FALLBACK = [
  {
    id: 'starter',
    nome: 'Starter',
    descricao: 'Para estúdios que querem agenda online profissional.',
    preco_mensal: 79,
    limite_profissionais: 2,
    destaque: false,
    recursos: ['Agenda online', 'Link público personalizado', 'Cadastro de clientes', 'Dashboard básico'],
  },
  {
    id: 'pro',
    nome: 'Pro',
    descricao: 'Para operação completa com financeiro, automação e equipe.',
    preco_mensal: 149,
    limite_profissionais: 6,
    destaque: true,
    recursos: ['Tudo do Starter', 'Financeiro e comissões', 'Automação via WhatsApp', 'Agenda por profissional', 'Checklist de implantação'],
  },
  {
    id: 'premium',
    nome: 'Premium',
    descricao: 'Para clínicas com mais volume, suporte e implantação assistida.',
    preco_mensal: 249,
    limite_profissionais: null,
    destaque: false,
    recursos: ['Tudo do Pro', 'Profissionais ilimitados', 'Acompanhamento de implantação', 'Prioridade em melhorias', 'Relatórios avançados'],
  },
];

export function formatarPrecoMensal(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function normalizarRecursos(recursos) {
  if (Array.isArray(recursos)) return recursos;
  if (typeof recursos === 'string') {
    try {
      const parsed = JSON.parse(recursos);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function obterPlano(planos, planoId) {
  return (planos || PLANOS_FALLBACK).find((plano) => plano.id === planoId) || PLANOS_FALLBACK[1];
}

export function diasAte(data) {
  if (!data) return null;
  const destino = new Date(data);
  if (Number.isNaN(destino.getTime())) return null;
  return Math.ceil((destino.getTime() - Date.now()) / 86400000);
}

export function assinaturaPermiteAcesso(assinatura) {
  if (!assinatura) return true;

  const status = assinatura.status || assinatura.assinatura_status;
  if ([SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(status)) {
    const limite = assinatura.periodo_fim || assinatura.trial_termina_em;
    const diasRestantes = diasAte(limite);
    return diasRestantes === null || diasRestantes >= 0;
  }

  return false;
}

export function descreverStatusAssinatura(assinatura) {
  if (!assinatura) {
    return {
      label: 'Sem assinatura',
      tone: 'warning',
      description: 'Escolha um plano para liberar o painel do estúdio.',
    };
  }

  const status = assinatura.status || assinatura.assinatura_status;
  const diasRestantes = diasAte(assinatura.periodo_fim || assinatura.trial_termina_em);

  if (status === SUBSCRIPTION_STATUS.ACTIVE) {
    return {
      label: 'Assinatura ativa',
      tone: 'success',
      description: diasRestantes !== null ? `Próxima renovação em ${Math.max(diasRestantes, 0)} dias.` : 'Cobrança recorrente ativa.',
    };
  }

  if (status === SUBSCRIPTION_STATUS.TRIAL) {
    return {
      label: 'Trial ativo',
      tone: diasRestantes !== null && diasRestantes <= 3 ? 'warning' : 'success',
      description: diasRestantes !== null ? `${Math.max(diasRestantes, 0)} dias restantes para ativar a assinatura.` : 'Período de teste em andamento.',
    };
  }

  if (status === SUBSCRIPTION_STATUS.PAST_DUE) {
    return {
      label: 'Pagamento pendente',
      tone: 'danger',
      description: 'Regularize a cobrança para liberar o painel.',
    };
  }

  if (status === SUBSCRIPTION_STATUS.CANCELED) {
    return {
      label: 'Assinatura cancelada',
      tone: 'danger',
      description: 'Escolha um plano para reativar o estúdio.',
    };
  }

  return {
    label: 'Checkout pendente',
    tone: 'warning',
    description: 'Finalize a assinatura para manter o acesso ao sistema.',
  };
}
