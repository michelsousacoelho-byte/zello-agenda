drop function if exists public.buscar_ou_criar_cliente_publico(uuid, text, text);

create function public.buscar_ou_criar_cliente_publico(
  p_estabelecimento_id uuid,
  p_nome text,
  p_telefone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  telefone_limpo text;
  telefone_chave text;
  cliente_existente public.clientes%rowtype;
  cliente_novo public.clientes%rowtype;
begin
  telefone_limpo := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  telefone_chave := right(telefone_limpo, 11);

  if p_estabelecimento_id is null then
    raise exception 'Estabelecimento obrigatório.';
  end if;

  if trim(coalesce(p_nome, '')) = '' then
    raise exception 'Nome obrigatório.';
  end if;

  if length(telefone_chave) < 10 then
    raise exception 'Telefone inválido.';
  end if;

  select *
  into cliente_existente
  from public.clientes c
  where c.estabelecimento_id = p_estabelecimento_id
    and right(regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g'), 11) = telefone_chave
  order by length(coalesce(c.nome, '')) desc, c.id asc
  limit 1;

  if cliente_existente.id is not null then
    return jsonb_build_object(
      'id', cliente_existente.id,
      'nome', cliente_existente.nome,
      'telefone', cliente_existente.telefone
    );
  end if;

  insert into public.clientes (estabelecimento_id, nome, telefone)
  values (p_estabelecimento_id, trim(p_nome), telefone_chave)
  returning * into cliente_novo;

  return jsonb_build_object(
    'id', cliente_novo.id,
    'nome', cliente_novo.nome,
    'telefone', cliente_novo.telefone
  );
end;
$$;

grant execute on function public.buscar_ou_criar_cliente_publico(uuid, text, text) to anon;
