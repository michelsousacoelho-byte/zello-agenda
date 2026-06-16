# Zello Agenda

SaaS de agendamento e gestão para estúdios de beleza, estética e bem-estar.

O Zello Agenda reúne link público de reservas, agenda inteligente, gestão de serviços/profissionais, clientes, automações assistidas por WhatsApp, dashboard executivo e financeiro com comissões.

## Principais módulos

- **Home comercial**: apresentação do produto em `/`.
- **Link público**: reserva online em `/:slug`.
- **Dashboard**: KPIs, checklist de ativação e roteiro de demo.
- **Operação**: branding, horários, serviços, profissionais e comissões.
- **Agenda**: agendamentos, clientes, histórico, status e WhatsApp.
- **Automação**: confirmação, lembrete, pós-atendimento e recuperação.
- **Financeiro**: faturamento, previsão, comissões, líquido e CSV.

## Rodar localmente

```bash
npm install
npm run dev
```

Crie um `.env` local com:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Existe um modelo seguro em `.env.example`.

## Build de produção

```bash
npm run build
```

O projeto é uma SPA Vite/React. Em produção, configure rewrites para `index.html`; o `vercel.json` já cobre isso.

## Supabase

Rode as migrations em ordem:

1. `20260603170000_add_operational_settings.sql`
2. `20260603173000_public_booking_policies.sql`
3. `20260603180000_add_professionals.sql`
4. `20260603181000_public_professional_policies.sql`
5. `20260603200000_add_professional_commissions.sql`
6. `20260603203000_add_public_branding.sql`
7. `20260603204000_public_client_dedup.sql`
8. `20260603205000_public_booking_hardening.sql`
9. `20260603210000_seed_studio_demo.sql` apenas para demo

## Documentação operacional

- [Demo e implantação](docs/demo-e-implantacao.md)
- [Checklist de produção](docs/producao-checklist.md)
- [Onboarding de cliente](docs/onboarding-cliente.md)
