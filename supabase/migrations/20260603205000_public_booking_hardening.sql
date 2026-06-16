create or replace function public.listar_agendamentos_publicos(
  p_estabelecimento_id uuid
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'estabelecimento_id', a.estabelecimento_id,
        'servico_id', a.servico_id,
        'profissional_id', a.profissional_id,
        'data_hora', a.data_hora,
        'status', a.status,
        'servicos', jsonb_build_object(
          'id', s.id,
          'nome', s.nome,
          'duracao', coalesce(s.duracao, 60),
          'capacidade_simultanea', coalesce(s.capacidade_simultanea, 1)
        )
      )
      order by a.data_hora asc
    ),
    '[]'::jsonb
  )
  from public.agendamentos a
  left join public.servicos s on s.id = a.servico_id
  where a.estabelecimento_id = p_estabelecimento_id
    and a.data_hora >= now() - interval '1 day'
    and a.data_hora <= now() + interval '45 days'
    and lower(coalesce(a.status, '')) in ('pendente', 'confirmado', 'concluído', 'concluido');
$$;

grant execute on function public.listar_agendamentos_publicos(uuid) to anon;

drop policy if exists public_booking_read_appointments on public.agendamentos;

create policy public_booking_read_appointments
  on public.agendamentos
  for select
  to anon
  using (false);

create or replace function public.clientes_duplicados_por_telefone(
  p_estabelecimento_id uuid
)
returns table (
  telefone_chave text,
  total integer,
  cliente_principal_id uuid,
  nomes text
)
language sql
security definer
set search_path = public
as $$
  with normalizados as (
    select
      c.id,
      c.nome,
      right(regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g'), 11) as telefone_chave
    from public.clientes c
    where c.estabelecimento_id = p_estabelecimento_id
  ),
  duplicados as (
    select telefone_chave
    from normalizados
    where length(telefone_chave) >= 10
    group by telefone_chave
    having count(*) > 1
  ),
  ranqueados as (
    select
      n.*,
      row_number() over (
        partition by n.telefone_chave
        order by length(coalesce(n.nome, '')) desc, n.id asc
      ) as ordem
    from normalizados n
    join duplicados d on d.telefone_chave = n.telefone_chave
  )
  select
    r.telefone_chave,
    count(*)::integer as total,
    (array_agg(r.id order by r.ordem))[1] as cliente_principal_id,
    string_agg(r.nome, ' / ' order by r.ordem) as nomes
  from ranqueados r
  group by r.telefone_chave
  order by total desc, nomes asc;
$$;

create or replace function public.mesclar_clientes_por_telefone(
  p_estabelecimento_id uuid,
  p_telefone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  telefone_chave text;
  cliente_principal public.clientes%rowtype;
  ids_duplicados uuid[];
  total_mesclado integer;
begin
  telefone_chave := right(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), 11);

  if length(telefone_chave) < 10 then
    raise exception 'Telefone inválido.';
  end if;

  select *
  into cliente_principal
  from public.clientes c
  where c.estabelecimento_id = p_estabelecimento_id
    and right(regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g'), 11) = telefone_chave
  order by length(coalesce(c.nome, '')) desc, c.id asc
  limit 1;

  if cliente_principal.id is null then
    raise exception 'Nenhuma cliente encontrada para este telefone.';
  end if;

  select array_agg(c.id)
  into ids_duplicados
  from public.clientes c
  where c.estabelecimento_id = p_estabelecimento_id
    and c.id <> cliente_principal.id
    and right(regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g'), 11) = telefone_chave;

  if ids_duplicados is null or array_length(ids_duplicados, 1) is null then
    return jsonb_build_object(
      'cliente_principal_id', cliente_principal.id,
      'telefone', telefone_chave,
      'mesclados', 0
    );
  end if;

  update public.agendamentos
  set cliente_id = cliente_principal.id
  where cliente_id = any(ids_duplicados);

  delete from public.clientes
  where id = any(ids_duplicados);

  total_mesclado := array_length(ids_duplicados, 1);

  return jsonb_build_object(
    'cliente_principal_id', cliente_principal.id,
    'telefone', telefone_chave,
    'mesclados', total_mesclado
  );
end;
$$;

grant execute on function public.clientes_duplicados_por_telefone(uuid) to authenticated;
grant execute on function public.mesclar_clientes_por_telefone(uuid, text) to authenticated;

notify pgrst, 'reload schema';
