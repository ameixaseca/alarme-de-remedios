# Copilot Instructions

# DailyMed — Documentação de Requisitos e Design Técnico

> Sistema de controle de aplicação de medicação para pets
> Stack: Next.js · PostgreSQL (Railway/Supabase) · REST API · PWA · Web Push · IA (Claude) · React Native (Expo)

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Requisitos Funcionais](#2-requisitos-funcionais)
3. [Requisitos Não Funcionais](#3-requisitos-não-funcionais)
4. [Modelo de Dados (ERD)](#4-modelo-de-dados-erd)
5. [Arquitetura do Sistema](#5-arquitetura-do-sistema)
6. [Fluxos Principais](#6-fluxos-principais)
7. [Especificação da API REST](#7-especificação-da-api-rest)
8. [Telas e Componentes](#8-telas-e-componentes)
9. [Regras de Negócio](#9-regras-de-negócio)
10. [Estratégia de Deploy](#10-estratégia-de-deploy)
11. [App Mobile React Native](#11-app-mobile-react-native)

---

## 1. Visão Geral

**DailyMed** é uma Progressive Web App (PWA) para controle colaborativo de medicação de animais de estimação. Múltiplos usuários podem pertencer a um mesmo grupo e acompanhar juntos os pacientes (pets) cadastrados naquele grupo, incluindo seus esquemas de medicação, histórico de aplicações e alertas de estoque.

### Personas

| Persona             | Descrição                                            |
| ------------------- | ---------------------------------------------------- |
| **Tutor Principal** | Cria o grupo, cadastra pets e medicações             |
| **Cuidador**        | Entra no grupo via código e registra aplicações      |
| **Veterinário**     | (futuro) visualiza histórico e prescreve tratamentos |

---

## 2. Requisitos Funcionais

### 2.1 Autenticação

- RF-01: O sistema deve permitir cadastro de usuário com nome, e-mail e senha (mínimo 8 caracteres).
- RF-02: O sistema deve autenticar usuários via e-mail e senha armazenados no banco de dados (hash bcrypt, 12 rounds).
- RF-03: A sessão deve ser mantida via JWT (access token 15 min + refresh token 7 dias).
- RF-04: O usuário deve poder fazer logout.
- RF-05: O client-side API wrapper renova o access token automaticamente ao receber 401, usando o refresh token. Se o refresh falhar, redireciona para `/login`.

### 2.2 Grupos

- RF-06: Um usuário pode criar um grupo, tornando-se seu administrador.
- RF-07: Um grupo possui um código único de convite (alfanumérico, 8 caracteres, maiúsculas — gerado via nanoid).
- RF-08: Um usuário pode entrar em um grupo existente informando o código de convite.
- RF-09: Um usuário pode pertencer a múltiplos grupos simultaneamente.
- RF-10: O grupo ativo é selecionado via `GroupSwitcher` no layout e persistido em localStorage (`activeGroupId`).
- RF-11: O administrador do grupo pode remover membros (exceto a si mesmo).
- RF-12: O administrador pode regenerar o código de convite.
- RF-13: O administrador pode renomear o grupo e atualizar a foto do grupo (`photoUrl`).
- RF-14: O administrador pode excluir o grupo.

### 2.3 Pacientes (Pets)

- RF-15: Um membro do grupo pode cadastrar pacientes vinculados àquele grupo.
- RF-16: Cada paciente pertence a exatamente um grupo.
- RF-17: Os dados de um paciente incluem: nome, espécie, raça, gênero, data de nascimento, peso (kg), foto (URL, opcional) e observações.
- RF-18: Qualquer membro do grupo pode visualizar, editar e arquivar pacientes do grupo.
- RF-19: O arquivamento é lógico (`isArchived = true`); pacientes arquivados não aparecem nas listagens normais.

### 2.4 Medicamentos

- RF-20: Um membro pode cadastrar medicamentos com: nome, fabricante, princípio ativo, método de aplicação, unidade de dosagem e quantidade em estoque (opcional).
- RF-21: Medicamentos são globais ao grupo — qualquer membro pode cadastrar e visualizar.
- RF-22: O sistema suporta identificação automática de medicamento a partir de uma foto, usando IA (Claude Haiku). O retorno inclui nome, princípio ativo, fabricante, unidade e método de aplicação.

### 2.5 Prescrições (Medicamento ↔ Paciente)

- RF-23: Um membro pode vincular um medicamento a um paciente, criando uma prescrição.
- RF-24: A prescrição contém: medicamento, paciente, dose por aplicação, fração legível (ex: "1/4"), unidade, frequência em horas, horários de aplicação, duração em dias (opcional), data de início e status.
- RF-25: Ao criar uma prescrição sem `schedule_times`, o sistema sugere automaticamente horários espaçados igualmente, começando às 08:00.
- RF-26: A dose por aplicação pode ser fracionada (ex: "1/4 comprimido"). O sistema aceita decimais e strings de fração.
- RF-27: Se `duration_days` for informado, a data de término é calculada automaticamente.
- RF-28: O status da prescrição pode ser: ativa (`active`), pausada (`paused`), encerrada (`finished`).
- RF-29: Toda criação, edição e exclusão de prescrição é registrada em um audit trail (`PrescriptionLog`) com os valores antes e depois de cada campo alterado.
- RF-30: A exclusão de uma prescrição notifica todos os membros do grupo.

### 2.6 Aplicações (Doses Registradas)

- RF-31: Um membro pode registrar a aplicação de uma dose para um paciente em uma prescrição ativa.
- RF-32: Cada aplicação registra: data/hora de aplicação, data/hora prevista (opcional), dose aplicada, quem aplicou e observações.
- RF-33: Ao registrar uma aplicação, o sistema subtrai a dose do estoque do medicamento (quando estoque estiver definido). Estoque negativo é permitido.
- RF-34: É possível registrar aplicações retroativas (com data/hora no passado).
- RF-35: É possível registrar **aplicações avulso** (`isAdHoc = true`): doses não vinculadas a uma prescrição, diretamente para um paciente e medicamento.
- RF-36: Aplicações offline são enfileiradas no IndexedDB pelo Service Worker e sincronizadas quando a conectividade é restaurada. Ao sincronizar, o grupo é notificado.

### 2.7 Tela Principal (Medicações Pendentes)

- RF-37: A tela `/home` exibe todas as medicações pendentes do dia para o grupo ativo, ordenadas por urgência.
- RF-38: Medicações cujo horário já passou (> 15 min) e não foram aplicadas são destacadas como "atrasadas".
- RF-39: A lista considera o fuso horário do usuário (parâmetro `tz_offset` em minutos do UTC).
- RF-40: A partir dessa tela, o usuário pode registrar uma aplicação diretamente.
- RF-41: A tela atualiza os dados automaticamente a cada 60 segundos.

### 2.8 Dashboard de Estoque e Projeção

- RF-42: Um dashboard exibe todos os medicamentos com estoque e projeção de consumo.
- RF-43: O sistema calcula o consumo diário de cada medicamento com base nas prescrições ativas.
- RF-44: Medicamentos com estoque suficiente para menos de 7 dias são destacados.
- RF-45: O dashboard mostra a data estimada de esgotamento.

### 2.9 Log de Aplicações

- RF-46: Uma tela de log (`/log`) exibe o histórico completo de doses registradas, com filtros por paciente, medicamento, período e grupo.
- RF-47: O log inclui aplicações tanto de prescrições quanto avulsas.
- RF-48: O endpoint suporta paginação (máximo 100 itens por página).

### 2.10 Notificações

- RF-49: O sistema mantém um feed de notificações in-app por usuário.
- RF-50: Os tipos de notificação são: `LATE_APPLICATION` (dose atrasada), `LOW_STOCK` (estoque baixo), `PRESCRIPTION_REMOVED` (prescrição removida), `OFFLINE_APPLICATION` (aplicação offline sincronizada).
- RF-51: O sistema suporta notificações push via Web Push API (VAPID), enviando para todos os dispositivos registrados do usuário.
- RF-52: A subscription push é registrada no primeiro acesso autenticado e salva no servidor.
- RF-53: Notificações possuem deduplicação por `dedupKey` dentro de uma janela de 1 hora.
- RF-54: O usuário pode marcar notificações como lidas individualmente ou em massa.

---

## 3. Requisitos Não Funcionais

- RNF-01: A aplicação deve ser uma PWA com suporte a instalação em dispositivos móveis e desktop.
- RNF-02: A API deve ser RESTful, versionada (`/api/v1/`) e documentada via OpenAPI 3.0 (Swagger UI disponível em `/api/docs`).
- RNF-03: A autenticação da API deve ser via Bearer Token (JWT).
- RNF-04: O banco de dados deve ser PostgreSQL (Railway ou Supabase).
- RNF-05: Senhas devem ser armazenadas com hash bcrypt (12 rounds).
- RNF-06: A aplicação deve funcionar bem em telas mobile (375px+) e desktop.
- RNF-07: O código deve ser estruturado de forma a facilitar o consumo da API REST pelo app React Native (monorepo com pacotes compartilhados de tipos e cliente HTTP).
- RNF-08: A aplicação deve funcionar offline para registro de aplicações, com sincronização automática.
- RNF-09: Notificações push devem ser enviadas via Web Push API (biblioteca `web-push` + chaves VAPID) na web, e via Expo Notifications (APNs/FCM) no mobile.
- RNF-10: Identificação de medicamentos por foto deve usar IA (Claude Haiku via Anthropic API).
- RNF-11: O app mobile deve ter **paridade funcional** com a interface web — todas as funcionalidades disponíveis na web devem estar disponíveis no mobile.
- RNF-12: O app mobile deve ter **paridade visual** com a interface web — mesma paleta de cores (indigo/gray), mesma estrutura de cards, mesmos ícones (Lucide), mesma tipografia e hierarquia visual.

---

## 4. Modelo de Dados (ERD)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          MODELO DE DADOS — DailyMed                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐          ┌──────────────────┐          ┌──────────────────┐
│    users     │          │  group_members   │          │      groups      │
├──────────────┤          ├──────────────────┤          ├──────────────────┤
│ id (UUID)    │──────────│ user_id (FK)     │──────────│ id (UUID)        │
│ name         │    N     │ group_id (FK)    │    N     │ name             │
│ email        │          │ role             │          │ photo_url        │
│ passwordHash │          │   (admin|member) │          │ invite_code      │
│ createdAt    │          │ joinedAt         │          │ created_by (FK)  │
│ updatedAt    │          └──────────────────┘          │ createdAt        │
└──────┬───────┘                                        │ updatedAt        │
       │                                                └──────┬───────────┘
       │ 1                                                     │ 1
       │                                                       │
       │ N                                                     │ N
┌──────▼───────────────┐                             ┌─────────▼────────┐
│    notifications     │                             │     patients     │
├──────────────────────┤                             ├──────────────────┤
│ id (cuid)            │                             │ id (UUID)        │
│ userId (FK)          │                             │ groupId (FK)     │
│ type (string)        │                             │ name             │
│ title, body          │                             │ species, breed   │
│ read (bool)          │                             │ gender           │
│ data (JSON)          │                             │ birthDate        │
│ dedupKey             │                             │ weightKg         │
│ createdAt            │                             │ photoUrl, notes  │
└──────────────────────┘                             │ isArchived       │
                                                     │ createdAt        │
┌──────────────────────┐                             └──────┬───────────┘
│  push_subscriptions  │                                    │ 1
├──────────────────────┤                                    │
│ id (cuid)            │                                    │ N
│ userId (FK)          │   ┌──────────────────────────────▼──────────────────┐
│ endpoint (unique)    │   │              prescriptions                      │
│ p256dh, auth         │   ├─────────────────────────────────────────────────┤
│ createdAt            │   │ id (UUID)                                       │
└──────────────────────┘   │ patientId (FK)                                  │
                           │ medicationId (FK)                               │
                           │ createdBy (FK → users)                          │
┌──────────────┐    N      │ doseQuantity (Float)                            │
│  medications │───────────│ doseFraction (String, nullable) ← ex: "1/4"    │
├──────────────┤    1      │ doseUnit                                        │
│ id (UUID)    │           │ frequencyHours (Float)                          │
│ groupId (FK) │           │ scheduleTimes (JSON: ["08:00","20:00",...])     │
│ name         │           │ durationDays (Int, nullable)                    │
│ manufacturer │           │ startDate, endDate (nullable)                   │
│ activeIngr.. │           │ status: active|paused|finished                  │
│ appMethod    │           │ createdAt, updatedAt                            │
│ doseUnit     │           └──────────────────────────┬──────────────────────┘
│ stockQty     │                                      │ 1
│   (nullable) │                                      │
│ createdAt    │                                      │ N
│ updatedAt    │           ┌──────────────────────────▼──────────────────────┐
└──────────────┘           │                applications                     │
                           ├─────────────────────────────────────────────────┤
                           │ id (UUID)                                       │
                           │ prescriptionId (FK, nullable) ← null = avulso  │
                           │ medicationId (FK, nullable)   ← preench. avulso│
                           │ patientId (FK, nullable)      ← preench. avulso│
                           │ appliedBy (FK → users)                          │
                           │ appliedAt                                       │
                           │ scheduledAt (nullable)                          │
                           │ doseApplied (Float)                             │
                           │ isAdHoc (Boolean)                               │
                           │ notes (nullable)                                │
                           │ createdAt                                       │
                           └─────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          prescription_logs (audit trail)                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ id (cuid) · prescriptionId (nullable) · patientId · patientName             │
│ medicationId · medicationName · action (create|update|delete)               │
│ performedBy (FK → users) · performedAt                                      │
│ changes (JSON: { campo: [antes, depois] }) — null para create/delete        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Tipos e Enums

```
ApplicationMethod: oral | injectable | topical | ophthalmic | otic | inhalation | other
PrescriptionStatus: active | paused | finished
GroupRole:          admin | member
PrescriptionAction: create | update | delete
```

---

## 5. Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                             ARQUITETURA — DailyMed                           │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │                          CLIENT LAYER                              │
  │                                                                    │
  │  ┌──────────────────────────────────┐  ┌────────────────────────┐ │
  │  │         PWA (Next.js)            │  │  Mobile App (Expo RN)  │ │
  │  │  React 19 + Tailwind CSS 4       │  │  Expo Router + EAS     │ │
  │  │  Service Worker (sw.js)          │  │                        │ │
  │  │  ├─ App Shell cache              │  │                        │ │
  │  │  ├─ Network-first para API       │  │                        │ │
  │  │  ├─ Offline queue (IndexedDB)    │  │                        │ │
  │  │  └─ Background Sync + Push       │  │                        │ │
  │  └──────────────┬───────────────────┘  └──────────┬─────────────┘ │
  └─────────────────┼──────────────────────────────────┼───────────────┘
                    │  HTTPS + Bearer JWT               │
                    ▼                                   ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                     SERVER LAYER (Next.js App Router)              │
  │                                                                    │
  │  ┌─────────────────────────────────────────────────────────────┐  │
  │  │  API Routes /api/v1/*                                       │  │
  │  │  ├─ auth/            ├─ patients/      ├─ applications/     │  │
  │  │  ├─ groups/          ├─ medications/   ├─ dashboard/        │  │
  │  │  ├─ prescriptions/   └─ notifications/                      │  │
  │  └──────────────────────────────┬──────────────────────────────┘  │
  │                                 │                                  │
  │  ┌──────────────────────────────▼──────────────────────────────┐  │
  │  │  Service Layer                                              │  │
  │  │  auth.service  │ group.service    │ patient.service         │  │
  │  │  medication.service │ prescription.service                  │  │
  │  │  application.service │ dashboard.service                    │  │
  │  │  notification.service                                       │  │
  │  └──────────────────────────────┬──────────────────────────────┘  │
  │                                 │                                  │
  │  ┌──────────────────────────────▼──────────────────────────────┐  │
  │  │  Data Layer (Prisma ORM 7)                                  │  │
  │  └──────────────────────────────┬──────────────────────────────┘  │
  └─────────────────────────────────┼──────────────────────────────────┘
                                    │
                                    │ Connection Pool
                                    ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                  DATA LAYER (PostgreSQL)                           │
  │  ├─ DATABASE_URL (pooler — Supabase/Railway)                      │
  │  └─ DIRECT_URL  (migrations diretas)                              │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │                  EXTERNAL SERVICES                                 │
  │  ├─ Anthropic API (Claude Haiku) → identificação de medicamentos  │
  │  └─ Web Push API (VAPID)         → notificações push browser      │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │                  CROSS-CUTTING                                     │
  │  JWT Middleware → valida Bearer em todas as rotas /api/v1         │
  │  Swagger UI    → /api/docs                                        │
  │  Zod           → validação de schemas em todos os endpoints       │
  └────────────────────────────────────────────────────────────────────┘
```

### Estrutura de Pastas (Monorepo)

O projeto usa **pnpm workspaces + Turborepo**. O web fica em `apps/web/`, o mobile em `apps/mobile/`. A raiz é apenas orquestração — sem deps de aplicação. Ver `.github/mobile-implementation-plan.md` para detalhes da migração.

```
alarme-de-remedios/              ← workspace root (apenas turbo + pnpm config)
├── package.json                 ← scripts turbo, sem deps de app
├── pnpm-workspace.yaml          ← packages: ["apps/*", "packages/*"]
├── turbo.json                   ← pipelines: build, dev, lint
├── packages/
│   └── shared/
│       ├── types/               ← interfaces TypeScript compartilhadas (Patient, Medication, etc.)
│       └── api-client/          ← wrapper fetch com refresh automático (reutilizado web + mobile)
├── apps/
│   ├── mobile/                  ← app React Native (Expo)
│   │   ├── app/                 ← Expo Router (file-based, espelha rotas do web)
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   └── (app)/
│   │   │       ├── _layout.tsx  ← bottom tabs (Início · Medicamentos · Pacientes · Grupo · Log)
│   │   │       ├── index.tsx    ← /home — medicações pendentes
│   │   │       ├── dashboard.tsx
│   │   │       ├── patients/
│   │   │       ├── medications/
│   │   │       ├── prescriptions/
│   │   │       ├── group.tsx
│   │   │       └── log.tsx
│   │   ├── components/          ← Card, Button, Badge, GroupSwitcher, NotificationBell
│   │   ├── hooks/               ← useAuth, useGroup, usePendingMedications, etc.
│   │   ├── theme.ts             ← tokens de design (cores espelham Tailwind do web)
│   │   ├── app.json             ← configuração Expo
│   │   ├── eas.json             ← perfis de build (development, preview, production)
│   │   └── package.json
│   └── web/                     ← Next.js (migrado da raiz na Fase 0)
│       ├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                    ← layout autenticado
│   │   ├── layout.tsx            ← sidebar, nav mobile, notif bell, group switcher
│   │   ├── home/page.tsx         ← medicações pendentes do dia
│   │   ├── dashboard/page.tsx    ← estoque e projeção
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── prescriptions/new/page.tsx
│   │   ├── medications/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── prescriptions/
│   │   │   └── [id]/page.tsx
│   │   ├── group/page.tsx
│   │   ├── log/page.tsx          ← histórico de aplicações
│   │   └── onboarding/page.tsx
│   ├── api/
│   │   ├── docs/page.tsx         ← Swagger UI
│   │   └── v1/
│   │       ├── auth/{register,login,refresh,logout}/route.ts
│   │       ├── groups/route.ts
│   │       ├── groups/[id]/route.ts
│   │       ├── groups/[id]/members/route.ts
│   │       ├── groups/[id]/members/[userId]/route.ts
│   │       ├── groups/[id]/invite/regenerate/route.ts
│   │       ├── groups/join/route.ts
│   │       ├── patients/route.ts
│   │       ├── patients/[id]/route.ts
│   │       ├── medications/route.ts
│   │       ├── medications/[id]/route.ts
│   │       ├── medications/identify/route.ts  ← IA
│   │       ├── prescriptions/route.ts
│   │       ├── prescriptions/[id]/route.ts
│   │       ├── prescriptions/logs/route.ts    ← audit trail
│   │       ├── applications/route.ts
│   │       ├── applications/[id]/route.ts
│   │       ├── applications/adhoc/route.ts    ← avulso
│   │       ├── applications/log/route.ts      ← histórico avançado
│   │       ├── dashboard/pending/route.ts
│   │       ├── dashboard/stock/route.ts
│   │       ├── notifications/route.ts
│   │       ├── notifications/[id]/route.ts
│   │       └── notifications/push-subscription/route.ts
│   ├── contexts/
│   │   └── group-context.tsx     ← estado do grupo ativo (multi-grupo)
│   ├── components/
│   │   ├── icons.tsx
│   │   ├── loading.tsx
│   │   └── PhotoCropModal.tsx
│   ├── layout.tsx                ← root layout + ServiceWorkerRegistrar
│   └── sw-register.tsx           ← registro do SW + ensurePushSubscription()
├── lib/
│   ├── prisma.ts                 ← singleton Prisma
│   ├── auth.ts                   ← signAccessToken/signRefreshToken/verify*
│   ├── api-helpers.ts            ← unauthorized/badRequest/notFound/forbidden
│   ├── schedule.ts               ← calcSuggestedTimes / parseFraction
│   └── client/
│       └── api.ts                ← wrapper fetch com refresh automático
├── services/
│   ├── auth.service.ts
│   ├── group.service.ts
│   ├── patient.service.ts
│   ├── medication.service.ts
│   ├── prescription.service.ts
│   ├── application.service.ts
│   ├── dashboard.service.ts
│   └── notification.service.ts
├── prisma/
│   └── schema.prisma
└── public/
    ├── manifest.json             ← PWA manifest
    ├── sw.js                     ← Service Worker
    ├── icon-192.png
    └── icon-512.png
```

---

## 6. Fluxos Principais

### 6.1 Fluxo de Autenticação e Grupo

```
Usuário                 Sistema
   │                       │
   │── POST /auth/register ─►│
   │                       │── Valida e-mail único
   │                       │── Hash bcrypt (12 rounds)
   │                       │── Salva no DB
   │◄── 201 + JWT ─────────│
   │                       │
   │── POST /groups ────────►│  (Criar grupo)
   │                       │── Gera invite_code único (nanoid, 8 chars)
   │                       │── Cria GroupMember (role=admin)
   │◄── 201 + { id, name, invite_code } │
   │                       │
   │  [Outro usuário]      │
   │── POST /groups/join ──►│  body: { invite_code }
   │                       │── Valida código
   │                       │── Cria GroupMember (role=member)
   │◄── 200 + group data ──│
```

### 6.2 Fluxo de Criação de Prescrição

```
Usuário                     Sistema
   │                            │
   │── POST /prescriptions ─────►│
   │   { patient_id,            │── Valida paciente no grupo do user
   │     medication_id,         │── Valida medicamento no mesmo grupo
   │     dose_quantity,         │── Calcula schedule_times se não informado:
   │     dose_fraction,         │   24h / frequency_hours = N aplicações/dia
   │     frequency_hours,       │   distribui igualmente a partir de 08:00
   │     duration_days }        │── end_date = start_date + duration_days
   │                            │── Cria PrescriptionLog (action=create)
   │◄── 201 + { ...prescription,│
   │     suggested_times: [...] }│
   │                            │
   │ [Usuário revisa horários]  │
   │── PATCH /prescriptions/:id ►│
   │   { schedule_times: [...] }│── Salva horários; cria PrescriptionLog (action=update)
   │◄── 200 OK ─────────────────│
```

### 6.3 Fluxo de Registro de Aplicação

```
Usuário                         Sistema
   │                                │
   │── POST /applications ──────────►│
   │   { prescription_id,           │── Valida prescrição ativa
   │     applied_at,                │── Valida membro do grupo
   │     dose_applied, notes }      │── Registra Application
   │                                │── Se estoque definido:
   │                                │   stock_quantity -= dose_applied
   │                                │   (gotas → mL: 1 gota = 0,05 mL)
   │                                │── Se estoque < 7 dias de consumo:
   │                                │   notifica grupo (LOW_STOCK, dedup 1/dia)
   │◄── 201 + { application, stockRemaining } │
```

### 6.4 Fluxo de Aplicação Avulsa

```
Usuário                         Sistema
   │                                │
   │── POST /applications/adhoc ────►│
   │   { patient_id,                │── Valida paciente não arquivado
   │     medication_id,             │── Valida medicamento no mesmo grupo
   │     dose_applied, notes }      │── Cria Application (isAdHoc=true)
   │                                │── Mesmo fluxo de estoque/notificação
   │◄── 201 + { application, stockRemaining } │
```

### 6.5 Fluxo de Notificação Push

```
Sistema                             Browser
   │                                    │
   │  [Usuário acessa área autenticada] │
   │◄── ensurePushSubscription() ───────│
   │    navigator.serviceWorker.ready   │
   │    pushManager.subscribe()         │
   │── POST /notifications/push-subscription │
   │   { endpoint, p256dh, auth }       │── Upsert PushSubscription no DB
   │                                    │
   │  [Evento: dose atrasada, estoque baixo...] │
   │── sendPushToUsers(userIds, payload)│
   │   webpush.sendNotification(...)    │── Envia ao endpoint do browser
   │                                    │── [SW recebe push event]
   │                                    │── self.registration.showNotification()
   │                                    │◄── Notificação aparece no OS
```

### 6.6 Fluxo Offline → Sync

```
Usuário (offline)               Service Worker              Servidor
   │                                │                           │
   │── POST /api/v1/applications ──►│                           │
   │                                │── fetch() → falha         │
   │                                │── enqueue() no IndexedDB  │
   │                                │── notifyClients(QUEUE_CHANGED) │
   │◄── 202 Accepted ───────────────│                           │
   │                                │                           │
   │  [Conectividade restaurada]    │                           │
   │── online event ────────────────►│                           │
   │                                │── sync.register("sync-applications") │
   │                                │── flushQueue()            │
   │                                │── POST /applications (payload + offline_sync:true) ──►│
   │                                │                           │── notifyGroupMembers(OFFLINE_APPLICATION)
   │◄── sw-sync-done event ─────────│                           │
```

### 6.7 Lógica de Sugestão de Horários

```
Entrada: frequency_hours (ex: 8 = a cada 8 horas)

Cálculo:
  N = 24 / frequency_hours  →  ex: 24/8 = 3 aplicações/dia
  base_time = 08:00
  interval = 24h / N

  schedule_times = [
    "08:00",
    "08:00" + interval,      →  "16:00"
    "08:00" + interval * 2,  →  "00:00"
  ]

Exemplos:
  frequency_hours = 24  →  ["08:00"]           (1x/dia)
  frequency_hours = 12  →  ["08:00", "20:00"]  (2x/dia)
  frequency_hours = 8   →  ["08:00", "16:00", "00:00"]  (3x/dia)
  frequency_hours < 3   →  rejeitado
```

### 6.8 Lógica de Medicações Pendentes

```
Para cada paciente do grupo (não arquivado):
  Para cada prescrição ativa (dentro do período start_date/end_date):
    Para cada horário em schedule_times (hoje, no fuso do usuário):
      Verificar se existe Application:
        - scheduledAt dentro de ±1 min do horário, OU
        - appliedAt dentro de ±30 min do horário

      Se não existe → PENDENTE
        Se horario < agora - 15min → status = "overdue" (vermelho)
          → Notificação LATE_APPLICATION (dedup 1/hora por prescrição)
        Se horario >= agora - 15min → status = "upcoming"

Ordenação:
  1. overdue (por tempo de atraso — mais antiga primeiro)
  2. upcoming (por horário — mais cedo primeiro)
```

---

## 7. Especificação da API REST

Base URL: `/api/v1`
Autenticação: `Authorization: Bearer <jwt>`
Documentação interativa: `/api/docs`

### Endpoints

#### Auth

| Método | Rota             | Descrição               |
| ------ | ---------------- | ----------------------- |
| POST   | `/auth/register` | Cadastra novo usuário   |
| POST   | `/auth/login`    | Autentica e retorna JWT |
| POST   | `/auth/refresh`  | Renova access token     |
| POST   | `/auth/logout`   | Invalida refresh token  |

#### Grupos

| Método | Rota                            | Descrição                       |
| ------ | ------------------------------- | ------------------------------- |
| GET    | `/groups`                       | Lista grupos do usuário         |
| POST   | `/groups`                       | Cria novo grupo                 |
| GET    | `/groups/:id`                   | Detalhes do grupo + membros     |
| PATCH  | `/groups/:id`                   | Atualiza nome/foto (admin)      |
| DELETE | `/groups/:id`                   | Remove grupo (admin)            |
| POST   | `/groups/join`                  | Entra em grupo via código       |
| GET    | `/groups/:id/members`           | Lista membros                   |
| DELETE | `/groups/:id/members/:userId`   | Remove membro (admin)           |
| POST   | `/groups/:id/invite/regenerate` | Regenera código de convite (admin) |

#### Pacientes

| Método | Rota            | Descrição                |
| ------ | --------------- | ------------------------ |
| GET    | `/patients`     | Lista pacientes do grupo (`?group_id=`) |
| POST   | `/patients`     | Cadastra paciente        |
| GET    | `/patients/:id` | Detalhes do paciente     |
| PATCH  | `/patients/:id` | Atualiza paciente        |
| DELETE | `/patients/:id` | Arquiva paciente (`isArchived=true`) |

#### Medicamentos

| Método | Rota                    | Descrição                              |
| ------ | ----------------------- | -------------------------------------- |
| GET    | `/medications`          | Lista medicamentos do grupo (`?group_id=`) |
| POST   | `/medications`          | Cadastra medicamento                   |
| GET    | `/medications/:id`      | Detalhes                               |
| PATCH  | `/medications/:id`      | Atualiza (incluindo estoque)           |
| DELETE | `/medications/:id`      | Remove                                 |
| POST   | `/medications/identify` | Identifica medicamento por foto (IA)   |

#### Prescrições

| Método | Rota                   | Descrição                                                |
| ------ | ---------------------- | -------------------------------------------------------- |
| GET    | `/prescriptions`       | Lista prescrições (`?patient_id=`, `?status=`)           |
| POST   | `/prescriptions`       | Cria prescrição + retorna `suggested_times`              |
| GET    | `/prescriptions/:id`   | Detalhes                                                 |
| PATCH  | `/prescriptions/:id`   | Atualiza (horários, status, dose, etc.)                  |
| DELETE | `/prescriptions/:id`   | Remove + notifica grupo                                  |
| GET    | `/prescriptions/logs`  | Audit trail paginado (`?patient_id=`, `?limit=`, `?offset=`) |

#### Aplicações

| Método | Rota                 | Descrição                                                     |
| ------ | -------------------- | ------------------------------------------------------------- |
| GET    | `/applications`      | Lista aplicações (`?prescription_id=`, `?date=`)             |
| POST   | `/applications`      | Registra aplicação (suporta `offline_sync: true`)            |
| GET    | `/applications/:id`  | Detalhes                                                      |
| PATCH  | `/applications/:id`  | Corrige aplicação                                             |
| DELETE | `/applications/:id`  | Remove aplicação                                              |
| POST   | `/applications/adhoc`| Registra aplicação avulsa (sem prescrição)                   |
| GET    | `/applications/log`  | Log avançado com filtros (`?patient_id=`, `?medication_id=`, `?from=`, `?to=`, `?group_id=`, `?limit=`, `?offset=`) |

#### Dashboard

| Método | Rota                 | Descrição                                          |
| ------ | -------------------- | -------------------------------------------------- |
| GET    | `/dashboard/pending` | Medicações pendentes do dia (`?tz_offset=`, `?group_id=`) |
| GET    | `/dashboard/stock`   | Projeção de estoque por medicamento (`?group_id=`) |

#### Notificações

| Método | Rota                              | Descrição                              |
| ------ | --------------------------------- | -------------------------------------- |
| GET    | `/notifications`                  | Lista notificações + `unreadCount`     |
| PATCH  | `/notifications`                  | Marca todas como lidas                 |
| GET    | `/notifications/:id`              | Detalhe de uma notificação             |
| PATCH  | `/notifications/:id`              | Marca uma notificação como lida        |
| POST   | `/notifications/push-subscription`| Salva subscription push do browser    |
| DELETE | `/notifications/push-subscription`| Remove subscription push               |

### Exemplos de Payload

**POST /prescriptions**

```json
{
  "patient_id": "uuid",
  "medication_id": "uuid",
  "dose_quantity": 0.25,
  "dose_fraction": "1/4",
  "dose_unit": "comprimido",
  "frequency_hours": 12,
  "duration_days": 10,
  "start_date": "2025-01-15"
}
```

**Resposta 201:**

```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "medication_id": "uuid",
  "dose_quantity": 0.25,
  "dose_fraction": "1/4",
  "frequency_hours": 12,
  "duration_days": 10,
  "start_date": "2025-01-15",
  "end_date": "2025-01-25",
  "status": "active",
  "suggested_times": ["08:00", "20:00"],
  "schedule_times": ["08:00", "20:00"]
}
```

**POST /applications/adhoc**

```json
{
  "patient_id": "uuid",
  "medication_id": "uuid",
  "dose_applied": 2.5,
  "notes": "Dose extra por orientação veterinária"
}
```

**POST /medications/identify**

```json
{
  "image_data": "<base64>",
  "media_type": "image/jpeg"
}
```

**Resposta:**

```json
{
  "name": "Amoxicilina",
  "active_ingredient": "Amoxicilina triidratada 500mg",
  "manufacturer": "Labrador Pharma",
  "dose_unit": "comprimido",
  "application_method": "oral",
  "dose_unit_custom": false
}
```

**GET /dashboard/pending?tz_offset=-180**

```json
{
  "date": "2025-01-15",
  "items": [
    {
      "patient": { "id": "uuid", "name": "Rex", "species": "dog" },
      "prescription": { "id": "uuid" },
      "medication": { "id": "uuid", "name": "Amoxicilina 500mg" },
      "scheduled_at": "2025-01-15T11:00:00.000Z",
      "status": "overdue",
      "dose_quantity": 0.25,
      "dose_fraction": "1/4",
      "dose_unit": "comprimido",
      "applied": false,
      "minutes_overdue": 45
    }
  ]
}
```

**GET /applications/log?group_id=uuid&limit=20**

```json
{
  "total": 247,
  "items": [
    {
      "id": "uuid",
      "appliedAt": "2025-01-15T08:05:00.000Z",
      "scheduledAt": "2025-01-15T08:00:00.000Z",
      "doseApplied": 0.25,
      "doseUnit": "comprimido",
      "notes": null,
      "isAdHoc": false,
      "prescriptionId": "uuid",
      "applier": { "id": "uuid", "name": "Maria" },
      "patient": { "id": "uuid", "name": "Rex", "species": "dog" },
      "medication": { "id": "uuid", "name": "Amoxicilina 500mg" }
    }
  ]
}
```

**GET /prescriptions/logs?patient_id=uuid**

```json
{
  "total": 5,
  "items": [
    {
      "id": "cuid",
      "prescriptionId": "uuid",
      "patientName": "Rex",
      "medicationName": "Amoxicilina",
      "action": "update",
      "performedAt": "2025-01-14T10:00:00.000Z",
      "performer": { "id": "uuid", "name": "João" },
      "changes": {
        "frequency_hours": [8, 12],
        "dose_quantity": [0.5, 0.25]
      }
    }
  ]
}
```

---

## 8. Telas e Componentes

### 8.1 Layout Autenticado (`app/(app)/layout.tsx`)

O layout envolve todas as páginas autenticadas e fornece:

- **Desktop:** sidebar fixa com navegação, group switcher, notification bell, logout
- **Mobile:** header com logo + group switcher + notification bell; bottom nav com sub-menus expansíveis
- **OfflineBanner:** exibe banner quando offline ou há itens na fila de sincronização
- **NotificationBell:** exibe badge com contagem de não lidas, dropdown com lista e ações de leitura
- **GroupSwitcher:** troca o grupo ativo (compact no header mobile, expandido no sidebar)

### 8.2 Tela Inicial — Medicações Pendentes (`/home`)

```
┌──────────────────────────────────────────────────┐
│ DailyMed  |  Grupo: Casa da Vó      [🔔] [Sair] │
├──────────────────────────────────────────────────┤
│ Hoje, 15 Jan                                     │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔴 REX                          ATRASADA    │ │
│ │ Amoxicilina 500mg — 1/4 comprimido          │ │
│ │ Prevista às 08:00 · 1h 23min atrás          │ │
│ │                        [Registrar Aplicação]│ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🟡 MIMI                         EM 2H 10MIN │ │
│ │ Prednisolona 20mg — 1 comprimido            │ │
│ │ Prevista às 12:00                           │ │
│ │                        [Registrar Aplicação]│ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ ✅ BOBI                          APLICADA   │ │
│ │ Omeprazol 10mg — 1/2 comprimido             │ │
│ │ Aplicada às 08:05 por Maria                 │ │
│ └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 8.3 Dashboard de Estoque (`/dashboard`)

```
┌──────────────────────────────────────────────────┐
│ Dashboard de Estoque                             │
├──────────────────────────────────────────────────┤
│ ⚠️  ATENÇÃO — ESTOQUE BAIXO                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ Amoxicilina 500mg                           │ │
│ │ Estoque: 8 comprimidos                      │ │
│ │ Consumo: 2/dia (2 pacientes)                │ │
│ │ Acaba em: ~4 dias (19 Jan)       🔴 URGENTE │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ TODOS OS MEDICAMENTOS                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ Medicamento        Estoque  Consumo  Duração │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Prednisolona 20mg  30 comp  1/dia   30 dias │ │
│ │ Omeprazol 10mg     14 comp  1/dia   14 dias │ │
│ │ Amoxicilina 500mg   8 comp  2/dia    4 dias │ │
│ └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 8.4 Tela de Grupo (`/group`)

- Exibe nome do grupo e foto
- Mostra código de convite com botão de copiar
- Botão "Regenerar código" (admin)
- Lista de membros com papel (admin/member)
- Botão "Remover membro" (admin, exceto para si)
- Form de edição do nome/foto do grupo (admin)

### 8.5 Log de Aplicações (`/log`)

- Filtros: paciente, medicamento, período (data de início/fim)
- Lista paginada de todas as doses registradas
- Distingue aplicações de prescrição vs. avulsas
- Exibe quem aplicou, quando, dose e observações

---

## 9. Regras de Negócio

### RN-01: Cálculo de Dosagem Fracionada

- `dose_quantity` armazena o decimal (ex: `0.25` para 1/4).
- `dose_fraction` armazena a representação string para exibição (ex: `"1/4"`).
- A subtração do estoque usa `dose_quantity` decimal.
- Frações suportadas: 1/4, 1/3, 1/2, 2/3, 3/4 e qualquer decimal.

### RN-02: Cálculo de Projeção de Estoque

```
consumo_diario = Σ (prescrições ativas) [ (24 / frequency_hours) × dose_quantity ]
dias_restantes = stock_quantity / consumo_diario
data_esgotamento = hoje + dias_restantes
alerta = dias_restantes < 7
```

### RN-03: Horários Sugeridos

- Ponto de partida fixo: 08:00.
- Intervalo: `24h / (24 / frequency_hours)`.
- Frequências < 3 horas são rejeitadas.
- Os horários são armazenados em JSONB como array de strings `"HH:MM"`.

### RN-04: Detecção de Medicação Atrasada

- Uma aplicação é **atrasada** se `scheduled_at < now() - 15 min` e não houver Application correspondente.
- Correspondência: `scheduledAt` dentro de ±1 min, ou `appliedAt` dentro de ±30 min.

### RN-05: Permissões por Grupo

- Apenas membros do grupo acessam os dados daquele grupo.
- Apenas o admin pode: renomear/fotoar/excluir o grupo, remover membros, regenerar código.
- Qualquer membro pode: cadastrar pacientes, medicamentos, prescrições e registrar aplicações.

### RN-06: Controle de Estoque Negativo

- O sistema **permite** estoque negativo (não bloqueia aplicações).
- Quando o estoque ≤ 0 ou há < 7 dias de consumo, dispara notificação `LOW_STOCK` (dedup 1/dia).

### RN-07: Conversão de Unidade para Estoque

- Gotas (`gotas`) são convertidas a mL para subtração de estoque: **1 gota = 0,05 mL**.
- Demais unidades são subtraídas diretamente.

### RN-08: Deduplicação de Notificações

- Padrão de `dedupKey`: `"low_stock_{medId}_{YYYY-MM-DD}"` (1 alerta/medicamento/dia).
- `"late_application_{prescriptionId}_{YYYY-MM-DD-HH}"` (1 alerta/prescrição/hora).
- Janela de dedup: 1 hora (verificada contra `createdAt` da Notification mais recente).

### RN-09: Limpeza de Push Subscriptions

- Ao receber HTTP 410 ("Gone") ao tentar enviar push, o endpoint é removido do banco automaticamente.

### RN-10: Audit Trail de Prescrições

- Toda criação, atualização e exclusão de prescrição gera um registro em `PrescriptionLog`.
- Em atualizações, o campo `changes` armazena `{ campo: [valorAntes, valorDepois] }` apenas para campos que mudaram.
- O `prescriptionId` é mantido mesmo após a exclusão (nullable na tabela), para preservar o histórico.

### RN-11: Aplicação Offline

- O Service Worker intercepta `POST /api/v1/applications` quando offline.
- O payload é enfileirado no IndexedDB com o header `Authorization`.
- Ao reconectar, a fila é processada com o flag `offline_sync: true`, que dispara notificação `OFFLINE_APPLICATION` para o grupo.

### RN-12: Multi-grupo

- Um usuário pode pertencer a múltiplos grupos e alternar entre eles via `GroupSwitcher`.
- O grupo ativo é salvo em `localStorage` como `activeGroupId`.
- Todas as queries de dados (pacientes, medicamentos, prescrições) usam o `activeGroup` como contexto.

---

## 10. Estratégia de Deploy

```
┌──────────────────────────────────────────────────────────────────┐
│                       DEPLOY — DailyMed                          │
├──────────────────────────────────────────────────────────────────┤
│  Vercel (recomendado para Next.js)                               │
│  ou Railway (full-stack, mais simples)                           │
│                                                                  │
│  Next.js App              PostgreSQL (Supabase ou Railway)       │
│  ├── PWA estático          ├── DB principal (pooler)             │
│  ├── API Routes            ├── Direct URL (migrations)           │
│  └── SSR/RSC               └── Backups automáticos              │
│                                                                  │
│  Variáveis de Ambiente Necessárias:                              │
│  DATABASE_URL=postgresql://...       (pooler — queries)          │
│  DIRECT_URL=postgresql://...         (sem pooler — migrations)   │
│  JWT_SECRET=...                                                  │
│  JWT_REFRESH_SECRET=...                                          │
│  NEXT_PUBLIC_APP_URL=https://...                                 │
│  NEXT_PUBLIC_VAPID_PUBLIC_KEY=...    (Web Push — client)         │
│  VAPID_PRIVATE_KEY=...               (Web Push — server)         │
│  VAPID_SUBJECT=mailto:admin@...      (Web Push — identidade)     │
│  ANTHROPIC_API_KEY=...               (Claude IA — identificação) │
└──────────────────────────────────────────────────────────────────┘
```

### Geração das chaves VAPID

```bash
npx web-push generate-vapid-keys
```

### Deploy Web (existente)

```
Vercel (recomendado para Next.js) ou Railway (full-stack)
Next.js App  →  PostgreSQL (Supabase ou Railway)
```

### Deploy Mobile — EAS (Expo Application Services)

```
Código → GitHub → EAS Build (cloud) → TestFlight / Google Play Internal → Production
                                   ↓ OTA update (JS bundle via expo-updates)
                            Devices já instalados recebem update automático
```

**Perfis de build (`eas.json`):**

| Perfil        | Uso                           | Distribuição        |
| ------------- | ----------------------------- | ------------------- |
| `development` | Dev build com Expo Dev Client | internal            |
| `preview`     | APK/IPA para testes internos  | internal            |
| `production`  | Build de loja                 | store (iOS/Android) |

**Configurações de ambiente mobile:**

```
EXPO_PUBLIC_API_URL=https://...       ← URL da API Next.js em produção
EXPO_PUBLIC_VAPID_PUBLIC_KEY=...      ← não usado; mobile usa Expo Push Token
```

**Notificações mobile:**
- O mobile usa `expo-notifications` com Expo Push Token (APNs/FCM gerenciados pelo Expo).
- O servidor envia para `https://exp.host/--/api/v2/push/send` em vez de VAPID.
- O endpoint `/notifications/push-subscription` aceita ambos os formatos (Web Push subscription e Expo Push Token).

### Preparação do backend para App Mobile

1. **CORS** configurado para aceitar origens do app mobile (header `Origin: null` para RN).
2. **Push Notifications**: endpoint `/notifications/push-subscription` estendido para aceitar `{ type: "expo", token: "ExponentPushToken[...]" }`.
3. **Offline sync**: mobile enfileira via AsyncStorage e sincroniza ao reconectar; endpoints REST são idênticos.
4. **Versionamento de API**: `/api/v1/` garante compatibilidade futura.

---

## 11. App Mobile React Native

### Princípio de Paridade

> O app mobile é a versão nativa da mesma aplicação web. A experiência do usuário deve ser idêntica em funcionalidade e visualmente reconhecível como o mesmo produto.

- Toda funcionalidade disponível na web deve estar disponível no mobile.
- A paleta de cores, hierarquia visual e vocabulário de UI são os mesmos.
- Os SVG icons do web (`icons.tsx`) são replicados com `react-native-svg` usando os mesmos paths.
- Não criar fluxos alternativos nem simplificar funcionalidades — apenas adaptar os primitivos (View/Text em vez de div/span).

### Stack Mobile

| Decisão              | Tecnologia                                 | Justificativa                                              |
| -------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| Framework            | **Expo SDK** (managed workflow)            | Build na nuvem, OTA updates, sem Xcode/Android Studio local |
| Roteamento           | **Expo Router v3** (file-based)            | Mesmo paradigma do Next.js App Router — consistência      |
| Estilização          | **NativeWind v4** (Tailwind → StyleSheet)  | Reutiliza classes Tailwind do web; paridade visual         |
| Ícones               | **react-native-svg** com paths do web      | Exatos mesmos ícones do web sem dependência adicional      |
| HTTP Client          | `packages/shared/api-client`               | Mesmo cliente com refresh automático, compartilhado       |
| Tipos                | `packages/shared/types`                    | Sem duplicação de interfaces                               |
| Auth storage         | **expo-secure-store**                      | JWT armazenado com segurança (não AsyncStorage)            |
| Notificações         | **expo-notifications**                     | APNs/FCM gerenciados pelo Expo                             |
| Câmera/Foto          | **expo-image-picker**                      | Identificação de medicamento por foto (IA)                 |
| Deploy               | **EAS Build + EAS Submit**                 | CI/CD nativo, builds na nuvem                              |

### Design Tokens (`mobile/theme.ts`)

Os tokens espelham diretamente as cores do Tailwind usadas no web:

```typescript
export const colors = {
  background: "#f9fafb",   // bg-gray-50
  foreground: "#111827",   // text-gray-900
  primary: "#4f46e5",      // indigo-600
  primaryLight: "#eef2ff", // indigo-50
  primaryText: "#4338ca",  // indigo-700
  danger: "#dc2626",       // red-600
  dangerLight: "#fef2f2",  // red-50
  warning: "#d97706",      // amber-600
  warningLight: "#fffbeb", // amber-50
  success: "#16a34a",      // green-600
  successLight: "#f0fdf4", // green-50
  border: "#e5e7eb",       // gray-200
  muted: "#6b7280",        // gray-500
  surface: "#ffffff",      // white
};
```

### Navegação Mobile

A estrutura de tabs espelha o `mobileNavItems` do web:

```
Bottom Tabs:
  ├── Início     (IconHome)       → /home — medicações pendentes
  ├── Remédios   (IconPill)       → stack: medications + dashboard + log
  ├── Pacientes  (IconUsers)      → stack: patients + prescriptions
  └── Grupo      (IconGroup)      → stack: group + onboarding

Header fixo (todas as telas autenticadas):
  ├── Logo + nome do app
  ├── GroupSwitcher (ActionSheet nativo)
  └── NotificationBell (badge + modal de notificações)
```

### Regras de Implementação Mobile

1. **Nunca importar** `services/` diretamente no mobile — sempre via API REST usando `packages/shared/api-client`.
2. **Nunca usar** `AsyncStorage` para dados sensíveis — use `expo-secure-store` para tokens JWT.
3. **Sempre usar** `KeyboardAvoidingView` em formulários com inputs.
4. **Sempre usar** `SafeAreaView` (ou `useSafeAreaInsets`) nos layouts de tela.
5. **Offline**: usar `@react-native-async-storage/async-storage` para fila de aplicações offline, mesma lógica do Service Worker do web.
6. **Imagens**: usar `expo-image` em vez de `Image` nativo para cache e performance.
7. **Pull-to-refresh**: implementar `RefreshControl` na tela `/home` (equivalente ao polling de 60s do web).

### Checklist Mobile antes de PR

- [ ] A funcionalidade existe e funciona na web?
- [ ] A tela usa os mesmos design tokens (`theme.ts`)?
- [ ] Os ícones são os mesmos SVG paths do `icons.tsx` web?
- [ ] Formulários têm `KeyboardAvoidingView` e `SafeAreaView`?
- [ ] Tokens JWT estão em `expo-secure-store`, não `AsyncStorage`?
- [ ] Testado em iOS e Android (simulador)?
- [ ] OTA update compatível (sem native changes desnecessárias)?

---

_Documentação atualizada · DailyMed · Versão 3.0_
