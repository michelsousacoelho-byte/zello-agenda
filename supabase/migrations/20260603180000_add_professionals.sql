create table if not exists public.profissionais (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  nome text not null,
  telefone text,
  especialidade text,
  horario_inicio time,
  horario_fim time,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.servico_profissionais (
  servico_id uuid not null references public.servicos(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  primary key (servico_id, profissional_id)
);

alter table public.agendamentos
  add column if not exists profissional_id uuid references public.profissionais(id) on delete set null;

create index if not exists profissionais_estabelecimento_id_idx
  on public.profissionais(estabelecimento_id);

create index if not exists servico_profissionais_profissional_id_idx
  on public.servico_profissionais(profissional_id);

create index if not exists agendamentos_profissional_id_idx
  on public.agendamentos(profissional_id);
