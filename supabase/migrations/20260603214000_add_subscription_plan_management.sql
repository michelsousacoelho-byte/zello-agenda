create or replace function public.atualizar_plano_assinatura(
  p_estabelecimento_id uuid,
  p_plano_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assinatura public.assinaturas_estabelecimento%rowtype;
  v_plano public.planos_assinatura%rowtype;
  v_status text;
begin
  if not exists (
    select 1
    from public.estabelecimentos e
    where e.id = p_estabelecimento_id
      and (e.owner_user_id = auth.uid() or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  ) then
    raise exception 'Você não tem permissão para alterar este plano.';
  end if;

  select *
  into v_plano
  from public.planos_assinatura
  where id = p_plano_id
    and ativo = true;

  if v_plano.id is null then
    raise exception 'Plano inválido.';
  end if;

  select *
  into v_assinatura
  from public.assinaturas_estabelecimento
  where estabelecimento_id = p_estabelecimento_id
  order by created_at desc
  limit 1;

  v_status := coalesce(v_assinatura.status, 'trial');

  if v_assinatura.id is null then
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
      p_estabelecimento_id,
      p_plano_id,
      'trial',
      'checkout_pendente',
      now(),
      now() + interval '14 days',
      now() + interval '14 days'
    )
    returning * into v_assinatura;
  else
    update public.assinaturas_estabelecimento
    set
      plano_id = p_plano_id,
      gateway = case when gateway = 'manual' then 'checkout_pendente' else gateway end,
      updated_at = now()
    where id = v_assinatura.id
    returning * into v_assinatura;
  end if;

  update public.estabelecimentos
  set
    plano_assinatura = p_plano_id,
    assinatura_status = v_status,
    trial_termina_em = coalesce(trial_termina_em, now() + interval '14 days')
  where id = p_estabelecimento_id;

  return jsonb_build_object(
    'assinatura_id', v_assinatura.id,
    'estabelecimento_id', p_estabelecimento_id,
    'plano_id', p_plano_id,
    'status', v_status
  );
end;
$$;

grant execute on function public.atualizar_plano_assinatura(uuid, text) to authenticated;

update public.estabelecimentos
set plano_assinatura = 'pro'
where slug = 'studio-demo'
  and coalesce(plano_assinatura, 'starter') = 'starter';

update public.assinaturas_estabelecimento a
set
  plano_id = 'pro',
  updated_at = now()
from public.estabelecimentos e
where a.estabelecimento_id = e.id
  and e.slug = 'studio-demo'
  and a.plano_id = 'starter';

notify pgrst, 'reload schema';
