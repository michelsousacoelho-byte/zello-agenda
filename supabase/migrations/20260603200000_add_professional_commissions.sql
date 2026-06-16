alter table public.profissionais
  add column if not exists comissao_percentual numeric(5,2) not null default 40,
  add column if not exists comissao_tipo text not null default 'percentual';

update public.profissionais
set comissao_percentual = 40
where comissao_percentual is null
  or comissao_percentual < 0
  or comissao_percentual > 100;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profissionais_comissao_percentual_check'
  ) then
    alter table public.profissionais
      add constraint profissionais_comissao_percentual_check
      check (comissao_percentual >= 0 and comissao_percentual <= 100);
  end if;
end $$;
