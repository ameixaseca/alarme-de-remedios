# Copilot Instructions

# DailyMed — Documentação de Requisitos e Design Técnico

> Sistema de controle de aplicação de medicação para pets  
> Stack: Next.js · PostgreSQL (Railway) · REST API documentada

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
11. [Prompt de Implementação](#11-prompt-de-implementação)

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

- RF-01: O sistema deve permitir cadastro de usuário com nome, e-mail e senha.
- RF-02: O sistema deve autenticar usuários via e-mail e senha armazenados no banco de dados (hash bcrypt).
- RF-03: A sessão deve ser mantida via JWT (access token + refresh token).
- RF-04: O usuário deve poder fazer logout.

### 2.2 Grupos

- RF-05: Um usuário pode criar um grupo, tornando-se seu administrador.
- RF-06: Um grupo possui um código único de convite (alfanumérico, 8 caracteres).
- RF-07: Um usuário pode entrar em um grupo existente informando o código de convite.
- RF-08: Um usuário pode pertencer a múltiplos grupos.
- RF-09: O administrador do grupo pode remover membros.
- RF-10: O administrador pode regenerar o código de convite.

### 2.3 Pacientes (Pets)

- RF-11: Um usuário membro de um grupo pode cadastrar pacientes vinculados àquele grupo.
- RF-12: Cada paciente pertence a exatamente um grupo.
- RF-13: Os dados de um paciente incluem: nome, espécie, raça, data de nascimento, peso, foto (opcional) e observações.
- RF-14: Qualquer membro do grupo pode visualizar, editar e arquivar pacientes do grupo.

### 2.4 Medicamentos

- RF-15: Um usuário pode cadastrar medicamentos com: nome, fabricante, princípio ativo, método de aplicação (oral, injetável, tópico, etc.), unidade de dosagem (mg, ml, comprimido, etc.) e dosagem padrão por unidade.
- RF-16: Um medicamento pode ter uma quantidade em estoque (opcional), expressa na unidade definida.
- RF-17: Medicamentos são globais ao grupo — qualquer membro pode cadastrar e visualizar.

### 2.5 Prescrições (Medicamento ↔ Paciente)

- RF-18: Um membro do grupo pode vincular um medicamento a um paciente, criando uma prescrição.
- RF-19: A prescrição deve conter: medicamento, paciente, dose por aplicação, frequência, horários sugeridos/confirmados e duração em dias (opcional).
- RF-20: Ao definir a frequência, o sistema deve sugerir automaticamente uma sequência de horários espaçados igualmente ao longo do dia, que o usuário pode editar ou confirmar.
- RF-21: A dose por aplicação pode ser uma fração da unidade do medicamento (ex.: 1/4 de comprimido). O sistema deve aceitar frações e valores decimais.
- RF-22: Uma prescrição pode ter data de início e, se a duração em dias for informada, uma data de término calculada automaticamente.
- RF-23: O status da prescrição pode ser: ativa, pausada, encerrada.

### 2.6 Aplicações

- RF-24: Um membro pode registrar a aplicação de uma dose para um paciente em uma prescrição.
- RF-25: Cada aplicação deve registrar: data/hora, dose aplicada, quem aplicou e observações opcionais.
- RF-26: Ao registrar uma aplicação, o sistema deve subtrair automaticamente a dose aplicada do estoque do medicamento (quando estoque estiver definido).
- RF-27: É possível registrar aplicações retroativas (com data/hora no passado).
- RF-28: É possível registrar aplicações fracionadas — o usuário informa a fração/quantidade real ministrada.

### 2.7 Tela Inicial (Dashboard de Aplicações)

- RF-29: A tela inicial (após login) exibe todos os pacientes do grupo com medicações pendentes no dia, ordenados por proximidade do próximo horário de aplicação.
- RF-30: Medicações cujo horário já passou e não foram aplicadas devem ser destacadas visualmente em vermelho com a label "Não aplicada".
- RF-31: A lista deve atualizar automaticamente a cada 60 segundos (ou via WebSocket/SSE).
- RF-32: A partir dessa tela, o usuário deve conseguir registrar uma aplicação com um clique.

### 2.8 Dashboard de Estoque e Projeção

- RF-33: Um dashboard deve exibir todos os medicamentos do grupo com seu estoque atual.
- RF-34: O sistema deve calcular a projeção de consumo diário de cada medicamento com base nas prescrições ativas.
- RF-35: Medicamentos com estoque suficiente para menos de 7 dias de consumo devem aparecer em destaque (seção "Atenção — Estoque Baixo").
- RF-36: O dashboard deve mostrar a data estimada de esgotamento de cada medicamento.

---

## 3. Requisitos Não Funcionais

- RNF-01: A aplicação deve ser uma PWA com suporte a instalação em dispositivos móveis e desktop.
- RNF-02: A API deve ser RESTful, versionada (`/api/v1/`) e documentada via OpenAPI 3.0 (Swagger UI disponível em `/api/docs`).
- RNF-03: A autenticação da API deve ser via Bearer Token (JWT) para facilitar integração com app mobile futuro.
- RNF-04: O banco de dados deve ser PostgreSQL (Railway).
- RNF-05: Senhas devem ser armazenadas com hash bcrypt (mínimo 12 rounds).
- RNF-06: A aplicação deve funcionar bem em telas mobile (375px+) e desktop.
- RNF-07: Tempos de resposta da API devem ser inferiores a 500ms para operações comuns.
- RNF-08: O código deve ser estruturado de forma a facilitar a extração da camada de API para consumo por um app React Native ou Flutter futuramente.

---

## 4. Modelo de Dados (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODELO DE DADOS — DailyMed                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
│    users     │          │  group_members   │          │    groups    │
├──────────────┤          ├──────────────────┤          ├──────────────┤
│ id (PK)      │──────────│ user_id (FK)     │──────────│ id (PK)      │
│ name         │    N     │ group_id (FK)    │    N     │ name         │
│ email        │          │ role             │          │ invite_code  │
│ password_hash│          │   (admin|member) │          │ created_by   │
│ created_at   │          │ joined_at        │          │ created_at   │
│ updated_at   │          └──────────────────┘          │ updated_at   │
└──────────────┘                                        └──────┬───────┘
                                                               │ 1
                                                               │
                                                               │ N
                                                        ┌──────▼───────┐
                                                        │   patients   │
                                                        ├──────────────┤
                                                        │ id (PK)      │
                                                        │ group_id (FK)│
                                                        │ name         │
                                                        │ species      │
                                                        │ breed        │
                                                        │ birth_date   │
                                                        │ weight_kg    │
                                                        │ photo_url    │
                                                        │ notes        │
                                                        │ is_archived  │
                                                        │ created_at   │
                                                        └──────┬───────┘
                                                               │ 1
                                                               │
                                                               │ N
┌──────────────────┐    N  ┌──────────────────────────────────▼────────────────┐
│  medications     │───────│           prescriptions                           │
├──────────────────┤  1    ├────────────────────────────────────────────────────┤
│ id (PK)          │       │ id (PK)                                            │
│ group_id (FK)    │       │ patient_id (FK)                                    │
│ name             │       │ medication_id (FK)                                 │
│ manufacturer     │       │ dose_quantity    ← quantidade por aplicação        │
│ active_ingredient│       │ dose_fraction    ← ex: "1/4", "0.5" (nullable)    │
│ application_method       │ dose_unit        ← herdado do medicamento          │
│   (oral|inject.. │       │ frequency_hours  ← de X em X horas                │
│    topical|other)│       │ schedule_times   ← JSONB: ["08:00","20:00",...]   │
│ dose_unit        │       │ duration_days    ← nullable                        │
│   (mg|ml|tablet..)       │ start_date                                         │
│ stock_quantity   │       │ end_date         ← calculado                       │
│   (nullable)     │       │ status           ← active|paused|finished          │
│ stock_unit       │       │ created_by (FK→users)                              │
│ created_at       │       │ created_at                                         │
│ updated_at       │       │ updated_at                                         │
└──────────────────┘       └───────────────────────────┬────────────────────────┘
                                                       │ 1
                                                       │
                                                       │ N
                           ┌───────────────────────────▼────────────────────────┐
                           │                   applications                     │
                           ├────────────────────────────────────────────────────┤
                           │ id (PK)                                             │
                           │ prescription_id (FK)                               │
                           │ applied_by (FK→users)                              │
                           │ applied_at      ← data/hora real da aplicação      │
                           │ scheduled_at    ← horário previsto                 │
                           │ dose_applied    ← pode diferir da dose prescrita   │
                           │ notes                                               │
                           │ created_at                                          │
                           └────────────────────────────────────────────────────┘
```

### Tipos e Enums

```sql
-- Enum: método de aplicação
CREATE TYPE application_method AS ENUM (
  'oral', 'injectable', 'topical', 'ophthalmic', 'otic', 'inhalation', 'other'
);

-- Enum: status da prescrição
CREATE TYPE prescription_status AS ENUM ('active', 'paused', 'finished');

-- Enum: papel no grupo
CREATE TYPE group_role AS ENUM ('admin', 'member');
```

---

## 5. Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA — DailyMed                             │
└──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────┐
  │                     CLIENT LAYER                         │
  │                                                          │
  │  ┌─────────────────────┐    ┌──────────────────────┐    │
  │  │   PWA (Next.js)     │    │  Mobile App (futuro) │    │
  │  │   React + Tailwind  │    │  React Native/Flutter│    │
  │  │   Service Worker    │    │                      │    │
  │  └──────────┬──────────┘    └──────────┬───────────┘    │
  └─────────────┼─────────────────────────┼────────────────┘
                │                         │
                │  HTTPS + Bearer JWT     │
                ▼                         ▼
  ┌──────────────────────────────────────────────────────────┐
  │                    SERVER LAYER (Next.js)                │
  │                                                          │
  │  ┌───────────────────────────────────────────────────┐  │
  │  │              Next.js App Router                   │  │
  │  │                                                   │  │
  │  │  ┌──────────────────┐  ┌───────────────────────┐ │  │
  │  │  │  Pages / RSC     │  │   API Routes          │ │  │
  │  │  │  (SSR + Client)  │  │   /api/v1/*           │ │  │
  │  │  └──────────────────┘  └──────────┬────────────┘ │  │
  │  │                                   │              │  │
  │  │  ┌────────────────────────────────▼────────────┐ │  │
  │  │  │           Service Layer                     │ │  │
  │  │  │  auth.service  │  group.service             │ │  │
  │  │  │  patient.service│  medication.service       │ │  │
  │  │  │  prescription.service│  application.service │ │  │
  │  │  │  stock.service │  dashboard.service         │ │  │
  │  │  └────────────────────────────────┬────────────┘ │  │
  │  │                                   │              │  │
  │  │  ┌────────────────────────────────▼────────────┐ │  │
  │  │  │           Data Layer (Prisma ORM)           │ │  │
  │  │  └────────────────────────────────┬────────────┘ │  │
  │  └───────────────────────────────────┼──────────────┘  │
  └──────────────────────────────────────┼─────────────────┘
                                         │
                                         │ Connection Pool
                                         ▼
  ┌──────────────────────────────────────────────────────────┐
  │                  DATA LAYER (Railway)                    │
  │                                                          │
  │              PostgreSQL Database                         │
  │              (gerenciado pelo Railway)                   │
  └──────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────┐
  │                  CROSS-CUTTING                           │
  │                                                          │
  │  JWT Middleware → valida token em todas as rotas /api/v1 │
  │  Swagger UI    → /api/docs (gerado via zod-to-openapi)  │
  │  Rate Limiting → via middleware Next.js                  │
  │  Logging       → estruturado (pino)                      │
  └──────────────────────────────────────────────────────────┘
```

### Estrutura de Pastas (Next.js App Router)

```
Dailymed/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                    ← layout autenticado
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← tela inicial: medicações pendentes
│   │   ├── dashboard/page.tsx    ← estoque e projeção
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── medications/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── prescriptions/
│   │   │   └── [id]/page.tsx
│   │   └── group/page.tsx
│   └── api/
│       ├── docs/route.ts         ← Swagger UI
│       └── v1/
│           ├── auth/
│           │   ├── register/route.ts
│           │   ├── login/route.ts
│           │   └── refresh/route.ts
│           ├── groups/route.ts
│           ├── groups/[id]/
│           │   ├── route.ts
│           │   ├── join/route.ts
│           │   └── members/route.ts
│           ├── patients/route.ts
│           ├── patients/[id]/route.ts
│           ├── medications/route.ts
│           ├── medications/[id]/route.ts
│           ├── prescriptions/route.ts
│           ├── prescriptions/[id]/route.ts
│           ├── applications/route.ts
│           └── dashboard/
│               ├── pending/route.ts
│               └── stock/route.ts
├── lib/
│   ├── prisma.ts
│   ├── auth.ts                   ← JWT helpers
│   ├── middleware.ts             ← auth middleware
│   └── schedule.ts              ← lógica de sugestão de horários
├── services/
│   ├── auth.service.ts
│   ├── group.service.ts
│   ├── patient.service.ts
│   ├── medication.service.ts
│   ├── prescription.service.ts
│   ├── application.service.ts
│   └── dashboard.service.ts
├── prisma/
│   └── schema.prisma
└── public/
    ├── manifest.json             ← PWA manifest
    └── sw.js                    ← Service Worker
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
   │                       │── Gera invite_code único
   │                       │── Cria group_member (role=admin)
   │◄── 201 + { invite_code }│
   │                       │
   │  [Outro usuário]      │
   │── POST /groups/join ──►│  body: { invite_code }
   │                       │── Valida código
   │                       │── Cria group_member (role=member)
   │◄── 200 + group data ──│
```

### 6.2 Fluxo de Criação de Prescrição

```
Usuário                     Sistema
   │                            │
   │── POST /prescriptions ─────►│
   │   {                        │
   │     patient_id,            │── Valida paciente no grupo do user
   │     medication_id,         │── Valida medicamento no grupo
   │     dose_quantity,         │── Processa dose_fraction se informada
   │     dose_fraction,         │
   │     frequency_hours,       │── Calcula schedule_times sugeridos:
   │     duration_days          │   24h / frequency_hours = N aplicações/dia
   │   }                        │   distribui igualmente a partir de 08:00
   │                            │
   │◄── 201 + { ...prescription,│
   │     suggested_times: [     │
   │       "08:00","16:00",...  │
   │     ]}                     │
   │                            │
   │ [Usuário revisa horários]  │
   │── PATCH /prescriptions/:id ►│
   │   { schedule_times: [...] }│── Salva horários confirmados
   │◄── 200 OK ─────────────────│
```

### 6.3 Fluxo de Registro de Aplicação

```
Usuário                         Sistema
   │                                │
   │── POST /applications ──────────►│
   │   {                            │
   │     prescription_id,           │── Valida prescrição ativa
   │     applied_at,                │── Valida membro do grupo
   │     dose_applied,              │── Registra aplicação
   │     notes                      │
   │   }                            │── Se estoque definido:
   │                                │   stock_quantity -= dose_applied
   │                                │   (converte unidades se necessário)
   │◄── 201 + { application,        │
   │     stock_remaining }          │── Retorna estoque atualizado
```

### 6.4 Lógica de Sugestão de Horários

```
Entrada: frequency_hours (ex: 8 = a cada 8 horas)

Cálculo:
  N = 24 / frequency_hours   →  ex: 24/8 = 3 aplicações/dia
  base_time = 08:00
  interval = 24h / N

  schedule_times = [
    "08:00",
    "08:00" + interval,      →  "16:00"
    "08:00" + interval * 2,  →  "00:00"
    ...
  ]

Frequências especiais:
  frequency_hours = 24  →  ["08:00"]          (uma vez ao dia)
  frequency_hours = 12  →  ["08:00", "20:00"] (duas vezes ao dia)
  frequency_hours = 168 →  ["08:00"]          (uma vez por semana — marcado na prescrição)
```

### 6.5 Tela Inicial — Lógica de Ordenação

```
Para cada paciente do grupo:
  Para cada prescrição ativa:
    Para cada horário em schedule_times (hoje):
      Verificar se existe application com scheduled_at = hoje + horario

      Se não existe → PENDENTE
        Se horario < agora → status = ATRASADA (vermelho)
        Se horario >= agora → status = PRÓXIMA

Ordenação:
  1. ATRASADAS (por tempo de atraso, mais antiga primeiro)
  2. PRÓXIMAS (por proximidade, mais cedo primeiro)

Atualização: polling a cada 60s ou SSE
```

---

## 7. Especificação da API REST

Base URL: `/api/v1`  
Autenticação: `Authorization: Bearer <jwt>`  
Documentação interativa: `/api/docs` (Swagger UI)

### Endpoints

#### Auth

| Método | Rota             | Descrição               |
| ------ | ---------------- | ----------------------- |
| POST   | `/auth/register` | Cadastra novo usuário   |
| POST   | `/auth/login`    | Autentica e retorna JWT |
| POST   | `/auth/refresh`  | Renova access token     |
| POST   | `/auth/logout`   | Invalida refresh token  |

#### Grupos

| Método | Rota                            | Descrição                 |
| ------ | ------------------------------- | ------------------------- |
| GET    | `/groups`                       | Lista grupos do usuário   |
| POST   | `/groups`                       | Cria novo grupo           |
| GET    | `/groups/:id`                   | Detalhes do grupo         |
| PATCH  | `/groups/:id`                   | Atualiza grupo (admin)    |
| POST   | `/groups/join`                  | Entra em grupo via código |
| GET    | `/groups/:id/members`           | Lista membros             |
| DELETE | `/groups/:id/members/:userId`   | Remove membro (admin)     |
| POST   | `/groups/:id/invite/regenerate` | Regenera código (admin)   |

#### Pacientes

| Método | Rota            | Descrição                |
| ------ | --------------- | ------------------------ |
| GET    | `/patients`     | Lista pacientes do grupo |
| POST   | `/patients`     | Cadastra paciente        |
| GET    | `/patients/:id` | Detalhes do paciente     |
| PATCH  | `/patients/:id` | Atualiza paciente        |
| DELETE | `/patients/:id` | Arquiva paciente         |

#### Medicamentos

| Método | Rota               | Descrição                    |
| ------ | ------------------ | ---------------------------- |
| GET    | `/medications`     | Lista medicamentos do grupo  |
| POST   | `/medications`     | Cadastra medicamento         |
| GET    | `/medications/:id` | Detalhes                     |
| PATCH  | `/medications/:id` | Atualiza (incluindo estoque) |
| DELETE | `/medications/:id` | Remove                       |

#### Prescrições

| Método | Rota                 | Descrição                                       |
| ------ | -------------------- | ----------------------------------------------- |
| GET    | `/prescriptions`     | Lista prescrições (filtros: patient_id, status) |
| POST   | `/prescriptions`     | Cria prescrição + retorna horários sugeridos    |
| GET    | `/prescriptions/:id` | Detalhes                                        |
| PATCH  | `/prescriptions/:id` | Atualiza (horários, status, etc.)               |
| DELETE | `/prescriptions/:id` | Remove                                          |

#### Aplicações

| Método | Rota                | Descrição                                         |
| ------ | ------------------- | ------------------------------------------------- |
| GET    | `/applications`     | Lista aplicações (filtros: prescription_id, date) |
| POST   | `/applications`     | Registra aplicação                                |
| GET    | `/applications/:id` | Detalhes                                          |
| PATCH  | `/applications/:id` | Corrige aplicação                                 |
| DELETE | `/applications/:id` | Remove aplicação                                  |

#### Dashboard

| Método | Rota                 | Descrição                                  |
| ------ | -------------------- | ------------------------------------------ |
| GET    | `/dashboard/pending` | Medicações pendentes do dia (tela inicial) |
| GET    | `/dashboard/stock`   | Projeção de estoque por medicamento        |

### Exemplos de Payload

**POST /prescriptions**

```json
{
  "patient_id": "uuid",
  "medication_id": "uuid",
  "dose_quantity": 0.25,
  "dose_fraction": "1/4",
  "dose_unit": "tablet",
  "frequency_hours": 12,
  "duration_days": 10,
  "start_date": "2024-01-15"
}
```

**Resposta 201**

```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "medication_id": "uuid",
  "dose_quantity": 0.25,
  "dose_fraction": "1/4",
  "frequency_hours": 12,
  "duration_days": 10,
  "start_date": "2024-01-15",
  "end_date": "2024-01-25",
  "status": "active",
  "suggested_times": ["08:00", "20:00"],
  "schedule_times": null
}
```

**GET /dashboard/pending**

```json
{
  "date": "2024-01-15",
  "items": [
    {
      "patient": { "id": "uuid", "name": "Rex", "species": "dog" },
      "prescription": { "id": "uuid" },
      "medication": { "id": "uuid", "name": "Amoxicilina 500mg" },
      "scheduled_at": "2024-01-15T08:00:00Z",
      "status": "overdue",
      "dose_quantity": 0.25,
      "dose_fraction": "1/4",
      "dose_unit": "tablet",
      "applied": false,
      "minutes_overdue": 45
    }
  ]
}
```

**GET /dashboard/stock**

```json
{
  "medications": [
    {
      "id": "uuid",
      "name": "Amoxicilina 500mg",
      "stock_quantity": 8,
      "stock_unit": "tablet",
      "daily_consumption": 2,
      "days_remaining": 4,
      "alert": true,
      "estimated_depletion_date": "2024-01-19",
      "active_prescriptions_count": 2
    }
  ]
}
```

---

## 8. Telas e Componentes

### 8.1 Tela Inicial — Medicações Pendentes

```
┌──────────────────────────────────────────────────┐
│ 🐾 DailyMed          Grupo: Casa da Vó    [Menu] │
├──────────────────────────────────────────────────┤
│ Hoje, 15 Jan · Atualiza em 00:47                │
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

### 8.2 Dashboard de Estoque

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

---

## 9. Regras de Negócio

### RN-01: Cálculo de Dosagem Fracionada

- O campo `dose_quantity` armazena o número decimal (ex: `0.25` para 1/4).
- O campo `dose_fraction` armazena a representação string para exibição (ex: `"1/4"`).
- A subtração do estoque usa `dose_quantity` em formato decimal.
- Frações suportadas: 1/4, 1/3, 1/2, 2/3, 3/4, e qualquer valor decimal.

### RN-02: Cálculo de Projeção de Estoque

```
consumo_diario = Σ (prescricoes_ativas) de (24 / frequency_hours * dose_quantity)
dias_restantes = stock_quantity / consumo_diario
data_esgotamento = hoje + dias_restantes
alerta = dias_restantes < 7
```

### RN-03: Horários Sugeridos

- Ponto de partida fixo: 08:00.
- Intervalo: `24h / (24h / frequency_hours)`.
- Máximo de 8 aplicações por dia. Se `frequency_hours < 3`, bloquear e pedir confirmação.
- Os horários são armazenados no formato `HH:MM` em array JSONB.

### RN-04: Detecção de Medicação Atrasada

- Uma aplicação é considerada **atrasada** se `scheduled_at < now() - 15 minutos` e não houver registro de aplicação correspondente.
- Tolerância de 15 minutos antes de marcar como atrasada.

### RN-05: Permissões por Grupo

- Apenas membros do grupo podem ver e interagir com os dados daquele grupo.
- Apenas o admin pode: renomear o grupo, remover membros, regenerar código.
- Qualquer membro pode: cadastrar pacientes, medicamentos, prescrições e registrar aplicações.

### RN-06: Controle de Estoque Negativo

- O sistema **permite** que o estoque fique negativo (para não bloquear aplicações).
- Quando o estoque atingir zero ou negativo, exibir alerta visual mas não bloquear o registro.

---

## 10. Estratégia de Deploy

```
┌─────────────────────────────────────────────────────┐
│                  DEPLOY — DailyMed                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Vercel (recomendado para Next.js)                  │
│  ou Railway (full-stack, mais simples)              │
│  ─────────────────────────────────────              │
│  Next.js App              Railway PostgreSQL        │
│  ├── PWA estático          ├── DB principal         │
│  ├── API Routes            └── Backups automáticos  │
│  └── SSR/RSC                                        │
│                                                     │
│  Variáveis de Ambiente Necessárias:                 │
│  DATABASE_URL=postgresql://...                      │
│  JWT_SECRET=...                                     │
│  JWT_REFRESH_SECRET=...                             │
│  NEXT_PUBLIC_APP_URL=https://...                    │
└─────────────────────────────────────────────────────┘
```

### Preparação para App Mobile

A separação entre a camada de API (`/api/v1/*`) e a UI garante que um app mobile pode consumir exatamente os mesmos endpoints. Pontos de atenção para a futura integração mobile:

1. **CORS configurado** para aceitar origens do app mobile.
2. **Push Notifications**: adicionar tabela `device_tokens` e integrar Firebase Cloud Messaging (FCM) quando o mobile for desenvolvido.
3. **Offline sync**: o PWA usa Service Worker para cache; o mobile terá sua própria estratégia, mas os endpoints são os mesmos.
4. **Versionamento de API**: usar `/api/v1/` desde o início para não quebrar o mobile quando a API evoluir.

---

## 11. Prompt de Implementação

O prompt abaixo pode ser enviado a um modelo de IA (como Claude ou GPT-4) para iniciar a implementação:

---

```
Você é um engenheiro senior full-stack. Implemente o sistema DailyMed conforme a documentação a seguir.

## Stack
- Next.js 14+ (App Router)
- TypeScript
- Prisma ORM + PostgreSQL (Railway)
- Tailwind CSS
- JWT (jsonwebtoken) para autenticação
- bcrypt para hash de senhas
- zod para validação de schemas
- zod-to-openapi para geração automática da documentação Swagger
- PWA: next-pwa ou configuração manual de Service Worker

## Modelo de Dados
Implemente o seguinte schema Prisma:

- User: id, name, email, passwordHash, createdAt, updatedAt
- Group: id, name, inviteCode (único, 8 chars), createdBy (FK User), createdAt, updatedAt
- GroupMember: userId (FK), groupId (FK), role (admin|member), joinedAt
- Patient: id, groupId (FK), name, species, breed, birthDate, weightKg, photoUrl, notes, isArchived, createdAt, updatedAt
- Medication: id, groupId (FK), name, manufacturer, activeIngredient, applicationMethod (enum: oral|injectable|topical|ophthalmic|otic|inhalation|other), doseUnit, stockQuantity (nullable, Float), createdAt, updatedAt
- Prescription: id, patientId (FK), medicationId (FK), doseQuantity (Float), doseFraction (String nullable), doseUnit, frequencyHours (Float), scheduleTimes (Json - array de strings HH:MM), durationDays (Int nullable), startDate, endDate (nullable), status (enum: active|paused|finished), createdBy (FK User), createdAt, updatedAt
- Application: id, prescriptionId (FK), appliedBy (FK User), appliedAt, scheduledAt, doseApplied (Float), notes, createdAt

## Requisitos de Implementação

### API REST (/api/v1/)
Implemente os seguintes grupos de endpoints com autenticação JWT via middleware:

1. POST /auth/register, POST /auth/login, POST /auth/refresh
2. GET/POST /groups, POST /groups/join, GET/DELETE /groups/:id/members
3. GET/POST /patients, GET/PATCH/DELETE /patients/:id
4. GET/POST /medications, GET/PATCH/DELETE /medications/:id
5. GET/POST /prescriptions, GET/PATCH/DELETE /prescriptions/:id
   - No POST, retornar suggested_times calculados automaticamente
   - Sugestão: distribuir 24h / frequencyHours aplicações a partir das 08:00
6. GET/POST /applications, GET/PATCH/DELETE /applications/:id
   - No POST, subtrair doseApplied do stockQuantity do medicamento
7. GET /dashboard/pending - medicações pendentes do dia ordenadas
8. GET /dashboard/stock - projeção de estoque com alertas

### Regras de Negócio
- Qualquer rota /api/v1 deve exigir Bearer JWT válido
- Usuários só acessam dados de grupos dos quais são membros
- Ao registrar aplicação, subtrair do estoque (permitir negativo, apenas alertar)
- Medicação atrasada: scheduled_at < now() - 15min sem application correspondente
- Projeção de estoque: stockQuantity / (daily_doses * doseQuantity)
- Alerta de estoque baixo: dias_restantes < 7

### Frontend (PWA)
Implemente as seguintes telas com Tailwind CSS:

1. /login e /register — formulários simples
2. / (home) — lista de medicações pendentes do dia
   - Cards ordenados por urgência (atrasadas em vermelho, próximas em amarelo)
   - Botão "Registrar Aplicação" em cada card
   - Modal de confirmação de aplicação com campo de dose e observação
   - Auto-atualização a cada 60 segundos
3. /dashboard — estoque e projeção
   - Seção de destaque para medicamentos com < 7 dias de estoque
   - Tabela com todos os medicamentos
4. /patients — CRUD de pacientes
5. /medications — CRUD de medicamentos
6. /patients/:id/prescriptions/new — formulário de prescrição
   - Seleção de medicamento, dose, frequência
   - Campo de dose fracionada (dropdown: inteiro, 1/2, 1/3, 1/4, 2/3, 3/4, personalizado)
   - Exibição dos horários sugeridos pelo sistema com edição inline
   - Campo de duração em dias (opcional)
7. /group — gerenciamento do grupo, exibição do código de convite, lista de membros

### PWA
Configure:
- manifest.json com nome, ícones, theme_color, display: standalone
- Service Worker com cache das rotas estáticas e estratégia network-first para API

### Documentação
- Gere a documentação Swagger automaticamente usando zod-to-openapi
- Disponibilize em /api/docs com Swagger UI

### Estrutura de Projeto
Siga a estrutura de pastas documentada, separando claramente:
- app/ (Next.js routes e pages)
- services/ (lógica de negócio, sem dependência de HTTP)
- lib/ (helpers: prisma, auth, schedule)

Comece pelo schema Prisma e pela estrutura base do projeto, depois implemente os endpoints de autenticação e grupos, depois os demais endpoints, e por fim o frontend.
```

---

_Documentação gerada para o projeto DailyMed · Versão 1.0_
