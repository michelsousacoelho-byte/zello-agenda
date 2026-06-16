do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'estabelecimentos'
      and policyname = 'public_booking_read_establishments'
  ) then
    create policy public_booking_read_establishments
      on public.estabelecimentos
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'servicos'
      and policyname = 'public_booking_read_services'
  ) then
    create policy public_booking_read_services
      on public.servicos
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agendamentos'
      and policyname = 'public_booking_read_appointments'
  ) then
    create policy public_booking_read_appointments
      on public.agendamentos
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clientes'
      and policyname = 'public_booking_create_clients'
  ) then
    create policy public_booking_create_clients
      on public.clientes
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agendamentos'
      and policyname = 'public_booking_create_appointments'
  ) then
    create policy public_booking_create_appointments
      on public.agendamentos
      for insert
      to anon
      with check (status = 'Pendente');
  end if;
end $$;
