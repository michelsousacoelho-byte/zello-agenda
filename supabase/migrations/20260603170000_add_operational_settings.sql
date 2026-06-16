alter table public.estabelecimentos
  add column if not exists horario_inicio time default '08:00',
  add column if not exists horario_fim time default '18:00',
  add column if not exists intervalo_agenda integer default 30;

alter table public.servicos
  add column if not exists duracao integer default 60,
  add column if not exists capacidade_simultanea integer default 1;
