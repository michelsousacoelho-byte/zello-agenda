# Checklist de produção

Use este checklist antes de colocar o Zello Agenda na mão de um cliente.

## 1. Ambiente

- Criar projeto Supabase de produção.
- Configurar `VITE_SUPABASE_URL`.
- Configurar `VITE_SUPABASE_ANON_KEY`.
- Configurar `VITE_CHECKOUT_URL` se o checkout do gateway for único para todos os planos.
- Nunca usar service role no frontend.
- Confirmar domínio final do app.
- Configurar variáveis no Vercel ou provedor equivalente.

## 2. Banco de dados

- Rodar todas as migrations obrigatórias em ordem.
- Rodar `notify pgrst, 'reload schema';` após funções/policies.
- Criar usuário admin no Supabase Auth.
- Definir `app_metadata.role = "admin"` no usuário admin.
- Confirmar que o estúdio tem `slug` único.
- Validar policies públicas do link de reserva.
- Conferir planos em `planos_assinatura`.
- Configurar `checkout_url` nos planos, se cada plano tiver checkout próprio.
- Confirmar que o estúdio demo tem assinatura `trial` ou `ativa`.
- Confirmar que a troca de plano funciona em Admin > Assinatura.

## 3. Estúdio cliente

- Cadastrar nome comercial.
- Configurar WhatsApp principal.
- Configurar cores do link público.
- Configurar horário de funcionamento.
- Cadastrar serviços com preço e duração.
- Cadastrar profissionais.
- Vincular serviços aos profissionais.
- Definir comissão padrão de cada profissional.

## 4. Validação funcional

- Abrir home `/`.
- Abrir planos `/planos`.
- Abrir cadastro `/cadastro?plano=pro`.
- Abrir login `/login`.
- Entrar no painel admin.
- Abrir Assinatura no painel.
- Abrir link público `/:slug`.
- Criar reserva pública.
- Confirmar que a reserva aparece na Agenda.
- Confirmar reserva pendente.
- Concluir atendimento.
- Conferir Financeiro.
- Conferir Automação.
- Exportar CSV financeiro.

## 5. Segurança e qualidade

- Testar cliente existente pelo mesmo telefone para evitar duplicata.
- Mesclar duplicatas antigas em Agenda > Clientes.
- Confirmar que o link público não lista dados privados de clientes.
- Confirmar que WhatsApp abre com mensagem correta.
- Rodar `npm run build`.

## 6. Entrega

- Enviar URL do painel admin.
- Enviar URL pública de reservas.
- Entregar login e senha inicial por canal seguro.
- Fazer uma reserva teste junto com o cliente.
- Explicar o fluxo diário: Agenda, Automação e Financeiro.
