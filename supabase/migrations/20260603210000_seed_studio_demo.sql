do $$
declare
  v_est_id uuid;
  v_servico_russo uuid;
  v_servico_brasileiro uuid;
  v_servico_sobrancelha uuid;
  v_prof_joana uuid;
  v_prof_camila uuid;
  v_cliente_aylana uuid;
  v_cliente_marina uuid;
  v_cliente_luiza uuid;
  v_cliente_renata uuid;
begin
  select id into v_est_id
  from public.estabelecimentos
  where slug = 'studio-demo'
  limit 1;

  if v_est_id is null then
    insert into public.estabelecimentos (
      slug,
      nome_estudio,
      horario_inicio,
      horario_fim,
      intervalo_agenda,
      cor_primaria,
      cor_secundaria,
      cor_fundo,
      mensagem_publica,
      whatsapp
    )
    values (
      'studio-demo',
      'Studio Demo Beauty',
      '08:00',
      '19:00',
      30,
      '#1e293b',
      '#0ea5e9',
      '#f8fafc',
      'Reserve seu horário online com praticidade. Escolha o procedimento, profissional e melhor horário.',
      '11999998888'
    )
    returning id into v_est_id;
  else
    update public.estabelecimentos
    set
      nome_estudio = coalesce(nome_estudio, 'Studio Demo Beauty'),
      horario_inicio = coalesce(horario_inicio, '08:00'),
      horario_fim = coalesce(horario_fim, '19:00'),
      intervalo_agenda = coalesce(intervalo_agenda, 30),
      cor_primaria = coalesce(cor_primaria, '#1e293b'),
      cor_secundaria = coalesce(cor_secundaria, '#0ea5e9'),
      cor_fundo = coalesce(cor_fundo, '#f8fafc'),
      mensagem_publica = coalesce(mensagem_publica, 'Reserve seu horário online com praticidade. Escolha o procedimento, profissional e melhor horário.'),
      whatsapp = coalesce(whatsapp, '11999998888')
    where id = v_est_id;
  end if;

  insert into public.servicos (estabelecimento_id, nome, preco, duracao, capacidade_simultanea)
  select v_est_id, 'Extensão de Cílios - Russo', 180, 180, 1
  where not exists (select 1 from public.servicos where estabelecimento_id = v_est_id and nome = 'Extensão de Cílios - Russo')
  returning id into v_servico_russo;
  if v_servico_russo is null then
    select id into v_servico_russo from public.servicos where estabelecimento_id = v_est_id and nome = 'Extensão de Cílios - Russo' limit 1;
  end if;

  insert into public.servicos (estabelecimento_id, nome, preco, duracao, capacidade_simultanea)
  select v_est_id, 'Extensão de Cílios - Brasileiro', 150, 180, 1
  where not exists (select 1 from public.servicos where estabelecimento_id = v_est_id and nome = 'Extensão de Cílios - Brasileiro')
  returning id into v_servico_brasileiro;
  if v_servico_brasileiro is null then
    select id into v_servico_brasileiro from public.servicos where estabelecimento_id = v_est_id and nome = 'Extensão de Cílios - Brasileiro' limit 1;
  end if;

  insert into public.servicos (estabelecimento_id, nome, preco, duracao, capacidade_simultanea)
  select v_est_id, 'Design de Sobrancelhas', 100, 60, 1
  where not exists (select 1 from public.servicos where estabelecimento_id = v_est_id and nome = 'Design de Sobrancelhas')
  returning id into v_servico_sobrancelha;
  if v_servico_sobrancelha is null then
    select id into v_servico_sobrancelha from public.servicos where estabelecimento_id = v_est_id and nome = 'Design de Sobrancelhas' limit 1;
  end if;

  insert into public.profissionais (estabelecimento_id, nome, telefone, especialidade, horario_inicio, horario_fim, ativo, comissao_percentual)
  select v_est_id, 'Joana Santos', '11988887777', 'Cílios', '08:00', '18:00', true, 45
  where not exists (select 1 from public.profissionais where estabelecimento_id = v_est_id and nome = 'Joana Santos')
  returning id into v_prof_joana;
  if v_prof_joana is null then
    select id into v_prof_joana from public.profissionais where estabelecimento_id = v_est_id and nome = 'Joana Santos' limit 1;
  end if;

  insert into public.profissionais (estabelecimento_id, nome, telefone, especialidade, horario_inicio, horario_fim, ativo, comissao_percentual)
  select v_est_id, 'Camila Rocha', '11977776666', 'Sobrancelhas', '09:00', '19:00', true, 40
  where not exists (select 1 from public.profissionais where estabelecimento_id = v_est_id and nome = 'Camila Rocha')
  returning id into v_prof_camila;
  if v_prof_camila is null then
    select id into v_prof_camila from public.profissionais where estabelecimento_id = v_est_id and nome = 'Camila Rocha' limit 1;
  end if;

  insert into public.servico_profissionais (servico_id, profissional_id)
  values
    (v_servico_russo, v_prof_joana),
    (v_servico_brasileiro, v_prof_joana),
    (v_servico_sobrancelha, v_prof_camila)
  on conflict do nothing;

  insert into public.clientes (estabelecimento_id, nome, telefone)
  select v_est_id, 'Aylana Coelho', '11922334455'
  where not exists (select 1 from public.clientes where estabelecimento_id = v_est_id and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11) = '11922334455')
  returning id into v_cliente_aylana;
  if v_cliente_aylana is null then
    select id into v_cliente_aylana from public.clientes where estabelecimento_id = v_est_id and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11) = '11922334455' order by length(coalesce(nome, '')) desc limit 1;
  end if;

  insert into public.clientes (estabelecimento_id, nome, telefone)
  select v_est_id, 'Marina Alves', '11955550101'
  where not exists (select 1 from public.clientes where estabelecimento_id = v_est_id and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11) = '11955550101')
  returning id into v_cliente_marina;
  if v_cliente_marina is null then
    select id into v_cliente_marina from public.clientes where estabelecimento_id = v_est_id and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11) = '11955550101' limit 1;
  end if;

  insert into public.clientes (estabelecimento_id, nome, telefone)
  select v_est_id, 'Luiza Martins', '11955550202'
  where not exists (select 1 from public.clientes where estabelecimento_id = v_est_id and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11) = '11955550202')
  returning id into v_cliente_luiza;
  if v_cliente_luiza is null then
    select id into v_cliente_luiza from public.clientes where estabelecimento_id = v_est_id and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11) = '11955550202' limit 1;
  end if;

  insert into public.clientes (estabelecimento_id, nome, telefone)
  select v_est_id, 'Renata Lima', '11955550303'
  where not exists (select 1 from public.clientes where estabelecimento_id = v_est_id and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11) = '11955550303')
  returning id into v_cliente_renata;
  if v_cliente_renata is null then
    select id into v_cliente_renata from public.clientes where estabelecimento_id = v_est_id and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 11) = '11955550303' limit 1;
  end if;

  insert into public.agendamentos (estabelecimento_id, cliente_id, servico_id, profissional_id, data_hora, status)
  select v_est_id, v_cliente_marina, v_servico_russo, v_prof_joana, date_trunc('day', now()) + interval '10 hours', 'Concluído'
  where not exists (select 1 from public.agendamentos where estabelecimento_id = v_est_id and cliente_id = v_cliente_marina and data_hora = date_trunc('day', now()) + interval '10 hours');

  insert into public.agendamentos (estabelecimento_id, cliente_id, servico_id, profissional_id, data_hora, status)
  select v_est_id, v_cliente_luiza, v_servico_sobrancelha, v_prof_camila, date_trunc('day', now()) + interval '15 hours', 'Confirmado'
  where not exists (select 1 from public.agendamentos where estabelecimento_id = v_est_id and cliente_id = v_cliente_luiza and data_hora = date_trunc('day', now()) + interval '15 hours');

  insert into public.agendamentos (estabelecimento_id, cliente_id, servico_id, profissional_id, data_hora, status)
  select v_est_id, v_cliente_aylana, v_servico_brasileiro, v_prof_joana, date_trunc('day', now()) + interval '1 day 9 hours', 'Pendente'
  where not exists (select 1 from public.agendamentos where estabelecimento_id = v_est_id and cliente_id = v_cliente_aylana and data_hora = date_trunc('day', now()) + interval '1 day 9 hours');

  insert into public.agendamentos (estabelecimento_id, cliente_id, servico_id, profissional_id, data_hora, status)
  select v_est_id, v_cliente_renata, v_servico_sobrancelha, v_prof_camila, date_trunc('day', now()) - interval '1 day' + interval '11 hours', 'Falta'
  where not exists (select 1 from public.agendamentos where estabelecimento_id = v_est_id and cliente_id = v_cliente_renata and data_hora = date_trunc('day', now()) - interval '1 day' + interval '11 hours');
end $$;
