alter table public.estabelecimentos
  add column if not exists mensagem_publica text,
  add column if not exists whatsapp text;
