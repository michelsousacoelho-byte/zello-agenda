# Zello Agenda: demo e implantação

## Roteiro de demo

1. Abra a home comercial em `/` e mostre a proposta do Zello.
2. Entre em `/studio-demo/login` e acesse o painel.
3. No Dashboard, mostre KPIs, checklist de ativação e roteiro comercial.
4. Abra o link público `/studio-demo` e simule uma reserva.
5. Volte para Agenda, confirme a reserva pendente e marque um atendimento como concluído.
6. Abra Automação e mostre confirmação, lembrete, pós-atendimento e recuperação.
7. Abra Financeiro e mostre faturamento, comissões e exportação CSV.

## Dados demo

Rode a migration `20260603210000_seed_studio_demo.sql` somente para preparar o `studio-demo`.
Ela é idempotente: cria registros que faltam sem apagar dados existentes.

## Checklist de implantação

- Configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Rodar todas as migrations em ordem.
- Confirmar policies públicas de reserva.
- Testar `/studio-demo`, `/login` e `/admin/studio-demo/dashboard`.
- Criar pelo menos um usuário admin no Supabase Auth com `app_metadata.role = "admin"`.
- Validar fluxo público: serviço, profissional, horário, cliente, confirmação.
- Validar agenda: pendente, confirmar, concluir, cancelar e falta.
- Validar financeiro: comissão por profissional e CSV.
- Validar automações: WhatsApp abre com mensagem correta.
- Revisar o checklist completo em `docs/producao-checklist.md`.
- Usar `docs/onboarding-cliente.md` para implantar novos estúdios.

## Pontos de atenção antes de vender

- Trocar dados demo por dados reais do primeiro cliente.
- Revisar nome, cores, WhatsApp e mensagem pública do estúdio.
- Remover duplicatas antigas pela aba Agenda > Clientes.
- Confirmar que o link público está no domínio certo.
