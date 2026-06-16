do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profissionais'
      and policyname = 'public_booking_read_professionals'
  ) then
    create policy public_booking_read_professionals
      on public.profissionais
      for select
      to anon
      using (ativo = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'servico_profissionais'
      and policyname = 'public_booking_read_service_professionals'
  ) then
    create policy public_booking_read_service_professionals
      on public.servico_profissionais
      for select
      to anon
      using (true);
  end if;
end $$;
