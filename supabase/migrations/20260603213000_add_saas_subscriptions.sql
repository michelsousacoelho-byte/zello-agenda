alter table public.estabelecimentos
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists assinatura_status text default 'trial',
  add column if not exists plano_assinatura text default 'starter',
  add column if not exists trial_termina_em timestamptz;

create table if not exists public.planos_assinatura (
  id text primary key,
  nome text not null,
  descricao text,
  preco_mensal numeric(10, 2) not null default 0,
  limite_profissionais integer,
  recursos jsonb not null default '[]'::jsonb,
  checkout_url text,
  ativo boolean not null default true,
  destaque boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.assinaturas_estabelecimento (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  plano_id text not null references public.planos_assinatura(id),
  status text not null default 'trial' check (status in ('trial', 'ativa', 'pendente', 'past_due', 'cancelada', 'expirada')),
  gateway text not null default 'manual',
  gateway_customer_id text,
  gateway_subscription_id text,
  checkout_url text,
  periodo_inicio timestamptz not null default now(),
  periodo_fim timestamptz,
  trial_termina_em timestamptz,
  cancelada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assinaturas_estabelecimento_estabelecimento_idx
  on public.assinaturas_estabelecimento (estabelecimento_id, created_at desc);

create index if not exists estabelecimentos_owner_user_idx
  on public.estabelecimentos (owner_user_id);

insert into public.planos_assinatura (
  id,
  nome,
  descricao,
  preco_mensal,
  limite_profissionais,
  recursos,
  checkout_url,
  destaque,
  ordem
)
values
  (
    'starter',
    'Starter',
    'Para estúdios que querem agenda online profissional.',
    79.00,
    2,
    '["Agenda online", "Link público personalizado", "Cadastro de clientes", "Dashboard básico"]'::jsonb,
    null,
    false,
    1
  ),
  (
    'pro',
    'Pro',
    'Para operação completa com financeiro, automação e equipe.',
    149.00,
    6,
    '["Tudo do Starter", "Financeiro e comissões", "Automação via WhatsApp", "Agenda por profissional", "Checklist de implantação"]'::jsonb,
    null,
    true,
    2
  ),
  (
    'premium',
    'Premium',
    'Para clínicas com mais volume, suporte e implantação assistida.',
    249.00,
    null,
    '["Tudo do Pro", "Profissionais ilimitados", "Acompanhamento de implantação", "Prioridade em melhorias", "Relatórios avançados"]'::jsonb,
    null,
    false,
    3
  )
on conflict (id) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco_mensal = excluded.preco_mensal,
  limite_profissionais = excluded.limite_profissionais,
  recursos = excluded.recursos,
  destaque = excluded.destaque,
  ordem = excluded.ordem;

update public.estabelecimentos
set
  assinatura_status = coalesce(assinatura_status, 'trial'),
  plano_assinatura = coalesce(plano_assinatura, 'starter'),
  trial_termina_em = coalesce(trial_termina_em, now() + interval '14 days')
where slug = 'studio-demo';

insert into public.assinaturas_estabelecimento (
  estabelecimento_id,
  plano_id,
  status,
  gateway,
  periodo_inicio,
  periodo_fim,
  trial_termina_em
)
select
  e.id,
  coalesce(e.plano_assinatura, 'starter'),
  coalesce(e.assinatura_status, 'trial'),
  'manual',
  now(),
  coalesce(e.trial_termina_em, now() + interval '14 days'),
  coalesce(e.trial_termina_em, now() + interval '14 days')
from public.estabelecimentos e
where e.slug = 'studio-demo'
  and not exists (
    select 1
    from public.assinaturas_estabelecimento a
    where a.estabelecimento_id = e.id
  );

alter table public.planos_assinatura enable row level security;
alter table public.assinaturas_estabelecimento enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'planos_assinatura'
      and policyname = 'public_read_active_subscription_plans'
  ) then
    create policy public_read_active_subscription_plans
      on public.planos_assinatura
      for select
      to anon, authenticated
      using (ativo = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'assinaturas_estabelecimento'
      and policyname = 'owners_read_own_subscriptions'
  ) then
    create policy owners_read_own_subscriptions
      on public.assinaturas_estabelecimento
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.estabelecimentos e
          where e.id = assinaturas_estabelecimento.estabelecimento_id
            and (e.owner_user_id = auth.uid() or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        )
      );
  end if;
end $$;

create or replace function public.criar_estabelecimento_saas(
  p_nome_estudio text,
  p_slug text,
  p_plano_id text default 'pro'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_estabelecimento_id uuid;
  v_assinatura_id uuid;
  v_slug text;
  v_plano_id text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_plano_id := coalesce(nullif(trim(p_plano_id), ''), 'pro');

  if not exists (select 1 from public.planos_assinatura where id = v_plano_id and ativo = true) then
    raise exception 'Plano inválido.';
  end if;

  v_slug := lower(trim(coalesce(p_slug, '')));
  v_slug := regexp_replace(v_slug, '[^a-z0-9-]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);

  if length(v_slug) < 3 then
    raise exception 'Slug inválido. Use pelo menos 3 caracteres.';
  end if;

  if exists (select 1 from public.estabelecimentos where slug = v_slug) then
    raise exception 'Este link público já está em uso.';
  end if;

  insert into public.estabelecimentos (
    slug,
    nome_estudio,
    owner_user_id,
    horario_inicio,
    horario_fim,
    intervalo_agenda,
    cor_primaria,
    cor_secundaria,
    cor_fundo,
    mensagem_publica,
    assinatura_status,
    plano_assinatura,
    trial_termina_em
  )
  values (
    v_slug,
    nullif(trim(p_nome_estudio), ''),
    v_user_id,
    '08:00',
    '18:00',
    30,
    '#1e293b',
    '#0ea5e9',
    '#f8fafc',
    'Reserve seu horário online com praticidade.',
    'trial',
    v_plano_id,
    now() + interval '14 days'
  )
  returning id into v_estabelecimento_id;

  insert into public.assinaturas_estabelecimento (
    estabelecimento_id,
    plano_id,
    status,
    gateway,
    periodo_inicio,
    periodo_fim,
    trial_termina_em
  )
  values (
    v_estabelecimento_id,
    v_plano_id,
    'trial',
    'checkout_pendente',
    now(),
    now() + interval '14 days',
    now() + interval '14 days'
  )
  returning id into v_assinatura_id;

  return jsonb_build_object(
    'estabelecimento_id', v_estabelecimento_id,
    'assinatura_id', v_assinatura_id,
    'slug', v_slug,
    'plano_id', v_plano_id,
    'status', 'trial'
  );
end;
$$;

grant execute on function public.criar_estabelecimento_saas(text, text, text) to authenticated;

notify pgrst, 'reload schema';
