# Plano de Implementação — DailyMed Mobile (React Native / Expo)

> **Objetivo**: Construir o app mobile do DailyMed com paridade funcional e visual completa em relação à interface web, usando React Native + Expo dentro de um monorepo pnpm workspaces + Turborepo.

---

## Princípio Guia

O app mobile é a **mesma aplicação** em plataforma nativa. Não uma versão reduzida. A experiência do usuário deve ser funcionalmente idêntica e visualmente reconhecível como o mesmo produto — mesma paleta, mesmos ícones, mesma estrutura de cards, mesmo vocabulário de UI.

---

## Estrutura do Monorepo

### Package manager: pnpm

pnpm é obrigatório para este monorepo. Ele usa symlinks estritos que isolam as dependências de cada workspace — `apps/mobile` não acessa acidentalmente deps de `apps/web`. Também é ~2x mais rápido que npm e não duplica pacotes no disco.

```
alarme-de-remedios/
├── package.json                 ← workspace root APENAS (sem deps de app aqui)
├── pnpm-workspace.yaml          ← declara apps/* e packages/*
├── turbo.json                   ← orquestrador de build (Turborepo)
├── apps/
│   ├── web/                     ← Next.js (movido da raiz na Fase 0)
│   │   ├── app/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── prisma/
│   │   ├── types/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── package.json
│   └── mobile/                  ← app React Native (Expo) — criado na Fase 0
│       ├── app/                 ← Expo Router (file-based)
│       ├── components/
│       ├── hooks/
│       ├── theme.ts
│       ├── app.json
│       ├── eas.json
│       └── package.json
└── packages/
    └── shared/
        ├── package.json
        ├── types/               ← interfaces TypeScript (Patient, Medication, Prescription…)
        └── api-client/          ← wrapper fetch com refresh JWT automático
```

### Configuração raiz

**`pnpm-workspace.yaml`**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`package.json` (raiz — apenas orquestração)**
```json
{
  "name": "dailymed",
  "private": true,
  "scripts": {
    "dev":   "turbo dev",
    "build": "turbo build",
    "lint":  "turbo lint"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

**`turbo.json`**
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": { "persistent": true },
    "lint": {}
  }
}
```

Com Turborepo:
- `turbo dev` roda `apps/web` e `apps/mobile` em paralelo
- `turbo build` garante que `packages/shared` é compilado antes dos apps
- Cache de build: se `packages/shared` não mudou, não reconstrói

### Migração do web existente (passo inicial da Fase 0)

A migração é apenas mover arquivos — **sem alterar código de aplicação**:

```bash
mkdir -p apps/web
mv app lib services prisma types public scripts \
   next.config.ts tsconfig.json postcss.config.mjs \
   eslint.config.mjs prisma.config.ts apps/web/
mv package.json apps/web/package.json
# criar package.json raiz, pnpm-workspace.yaml, turbo.json
```

Como todas as variáveis de ambiente (DATABASE_URL, JWT_SECRET, etc.) são lidas de `.env`, nenhuma linha de código da aplicação precisa mudar.

---

## Fases de Implementação

### Fase 0 — Configuração do Monorepo e Fundação

**Objetivo**: Ter o Expo rodando e conectado à API, com autenticação funcionando.

**Tarefas:**

- [ ] Instalar pnpm globalmente (`npm install -g pnpm`)
- [ ] Mover arquivos do Next.js para `apps/web/` (ver seção Migração acima)
- [ ] Criar `package.json` raiz limpo (apenas workspace config + turbo)
- [ ] Criar `pnpm-workspace.yaml` apontando para `apps/*` e `packages/*`
- [ ] Instalar Turborepo (`pnpm add -D turbo -w`)
- [ ] Criar `turbo.json` com pipelines `build`, `dev`, `lint`
- [ ] Verificar que `pnpm dev --filter=web` roda o Next.js normalmente
- [ ] Criar `packages/shared/` com tipos extraídos do web (Patient, Medication, Prescription, Application, Group, Notification, etc.)
- [ ] Criar `packages/shared/api-client/` — wrapper fetch que:
  - Adiciona `Authorization: Bearer <token>` automaticamente
  - Faz refresh automático ao receber 401
  - Redireciona para login se refresh falhar
  - Lê a base URL de `process.env.EXPO_PUBLIC_API_URL`
- [ ] Criar o projeto Expo com `npx create-expo-app apps/mobile --template blank-typescript`
- [ ] Instalar e configurar Expo Router v3
- [ ] Instalar e configurar NativeWind v4
- [ ] Criar `mobile/theme.ts` com tokens de design (cores espelhando Tailwind do web)
- [ ] Criar `mobile/components/icons.tsx` com os mesmos SVG paths de `app/components/icons.tsx` usando `react-native-svg`
- [ ] Implementar tela de login (`app/(auth)/login.tsx`)
- [ ] Implementar tela de registro (`app/(auth)/register.tsx`)
- [ ] Implementar armazenamento de JWT com `expo-secure-store`
- [ ] Implementar hook `useAuth` (login, logout, refresh, estado de autenticação)
- [ ] Configurar redirecionamento autenticado/não-autenticado via Expo Router layouts

**Critério de aceite**: Usuário consegue fazer login, o token é salvo com segurança e ele é redirecionado para a área autenticada.

---

### Fase 1 — Layout Base e Navegação

**Objetivo**: Ter o shell do app funcionando com a mesma estrutura de navegação do web mobile.

**Tarefas:**

- [ ] Criar layout autenticado `app/(app)/_layout.tsx` com Bottom Tabs:
  - **Início** (IconHome) → tela de medicações pendentes
  - **Remédios** (IconPill) → stack: medications + dashboard + log
  - **Pacientes** (IconUsers) → stack: patients + prescriptions
  - **Grupo** (IconGroup) → stack: group settings
- [ ] Criar componente `GroupSwitcher` (ActionSheet nativo com lista de grupos)
- [ ] Criar componente `NotificationBell` (badge com contagem, modal de notificações)
- [ ] Criar componente `OfflineBanner` (banner quando sem conectividade)
- [ ] Implementar `GroupContext` (hook `useGroup`) usando `packages/shared/api-client`
- [ ] Implementar persistência do grupo ativo com `expo-secure-store`
- [ ] Criar componentes base reutilizáveis:
  - `Card` — container com sombra e bordas arredondadas (espelha cards do web)
  - `Button` — variantes primary, secondary, danger
  - `Badge` — status overdue/upcoming/applied (mesmas cores do web)
  - `EmptyState` — tela vazia com ícone e mensagem
  - `LoadingSpinner` — indicador de carregamento

**Critério de aceite**: Navegação funcionando, GroupSwitcher trocando o grupo ativo, NotificationBell mostrando contagem.

---

### Fase 2 — Tela Principal (Medicações Pendentes)

**Objetivo**: Funcionalidade core — visualizar e registrar aplicações.

**Tarefas:**

- [ ] Implementar `app/(app)/index.tsx` (equivalente ao `/home` do web)
- [ ] Criar hook `usePendingMedications` — consome `GET /api/v1/dashboard/pending?tz_offset=`
- [ ] Calcular `tz_offset` a partir de `new Date().getTimezoneOffset()`
- [ ] Implementar card de medicação pendente com:
  - Status visual: overdue (vermelho), upcoming (amarelo), applied (verde) — mesmas cores do web
  - Nome do paciente, medicamento, dose (fração legível), horário previsto
  - Tempo de atraso ou countdown até o próximo horário
  - Botão "Registrar Aplicação"
- [ ] Implementar modal de confirmação de aplicação (dose, notas, data/hora)
- [ ] Implementar `POST /api/v1/applications`
- [ ] Implementar `RefreshControl` (pull-to-refresh) como substituto do polling de 60s do web
- [ ] Exibir data atual no topo da tela (mesmo formato do web)

**Critério de aceite**: Usuário vê medicações pendentes do dia e consegue registrar uma aplicação.

---

### Fase 3 — Pacientes e Prescrições

**Objetivo**: Gestão completa de pacientes e seus tratamentos.

**Tarefas:**

- [ ] Implementar listagem de pacientes (`app/(app)/patients/index.tsx`)
- [ ] Implementar detalhes do paciente com lista de prescrições ativas
- [ ] Implementar formulário de cadastro/edição de paciente
- [ ] Implementar arquivamento de paciente
- [ ] Implementar `expo-image-picker` para foto do paciente
- [ ] Implementar listagem de prescrições do paciente
- [ ] Implementar detalhes da prescrição (horários, dose, status)
- [ ] Implementar formulário de criação de prescrição:
  - Seletor de medicamento (lista do grupo)
  - Input de dose com suporte a frações (1/4, 1/2, etc.)
  - Input de frequência em horas
  - Seletor de data de início
  - Input de duração em dias (opcional)
  - Exibição dos horários sugeridos pelo backend
  - Edição manual dos horários sugeridos
- [ ] Implementar atualização de status da prescrição (ativa/pausada/encerrada)
- [ ] Implementar exclusão de prescrição com confirmação

**Critério de aceite**: Fluxo completo de cadastrar paciente → criar prescrição → ver medicação pendente na tela inicial.

---

### Fase 4 — Medicamentos e Dashboard de Estoque

**Objetivo**: Gestão de medicamentos com identificação por IA.

**Tarefas:**

- [ ] Implementar listagem de medicamentos do grupo
- [ ] Implementar detalhes do medicamento (estoque, prescrições ativas)
- [ ] Implementar formulário de cadastro/edição de medicamento
- [ ] Implementar identificação de medicamento por foto:
  - Captura via `expo-image-picker` (câmera ou galeria)
  - Conversão para base64
  - `POST /api/v1/medications/identify`
  - Pré-preenchimento do formulário com dados retornados pela IA
- [ ] Implementar Dashboard de Estoque (`app/(app)/dashboard.tsx`):
  - Seção de alerta para medicamentos com < 7 dias
  - Lista completa com estoque, consumo diário e data estimada de esgotamento
  - Mesma estrutura visual do web (tabela/cards)
- [ ] Implementar aplicação avulsa (`POST /api/v1/applications/adhoc`)

**Critério de aceite**: Usuário cadastra medicamento via foto, vê projeção de estoque e registra aplicação avulsa.

---

### Fase 5 — Grupo e Gestão de Membros

**Objetivo**: Funcionalidades de grupo (onboarding, convite, administração).

**Tarefas:**

- [ ] Implementar tela de onboarding (`app/(app)/onboarding.tsx`):
  - Opção de criar novo grupo
  - Opção de entrar via código de convite
- [ ] Implementar tela de detalhes do grupo (`app/(app)/group.tsx`):
  - Nome e foto do grupo
  - Código de convite com botão copiar/compartilhar nativo (`Share.share`)
  - Lista de membros com papel (admin/member)
  - Ações de admin: renomear, trocar foto, remover membros, regenerar código, excluir grupo
- [ ] Implementar upload de foto do grupo via `expo-image-picker`
- [ ] Implementar entrada em grupo via código
- [ ] Implementar criação de grupo

**Critério de aceite**: Admin consegue gerenciar o grupo e convidar membros pelo app.

---

### Fase 6 — Log de Aplicações e Notificações

**Objetivo**: Histórico completo e sistema de notificações nativo.

**Tarefas:**

- [ ] Implementar Log de Aplicações (`app/(app)/log.tsx`):
  - Filtros por paciente, medicamento e período (DatePicker nativo)
  - Lista paginada com scroll infinito
  - Distingue aplicações de prescrição vs. avulsas
  - Exibe aplicador, horário, dose e notas
- [ ] Implementar sistema de notificações push com `expo-notifications`:
  - Solicitar permissão na primeira autenticação
  - Obter Expo Push Token
  - Registrar token via `POST /api/v1/notifications/push-subscription` com `{ type: "expo", token }`
  - Lidar com notificações recebidas em foreground/background
- [ ] Implementar feed de notificações in-app (mesmo do web):
  - Modal/sheet com lista de notificações
  - Badge de não lidas
  - Marcar como lida individualmente e em massa

**Critério de aceite**: Usuário recebe push notification de dose atrasada no celular e vê o feed de notificações.

---

### Fase 7 — Offline e Polimento

**Objetivo**: Suporte offline, qualidade de UX e preparação para loja.

**Tarefas:**

- [ ] Implementar fila offline para registros de aplicação:
  - Detectar ausência de conectividade via `@react-native-community/netinfo`
  - Enfileirar payload em `AsyncStorage` quando offline
  - Processar fila ao reconectar
  - Exibir `OfflineBanner` com contagem de itens na fila
- [ ] Implementar feedback háptico (`expo-haptics`) em ações de confirmação
- [ ] Implementar animações de transição (Reanimated) nos cards de status
- [ ] Implementar deep links para notificações (abrir tela correta ao tocar na notificação)
- [ ] Configurar `app.json` com ícone, splash screen, nome, bundle identifier
- [ ] Configurar `eas.json` com perfis development/preview/production
- [ ] Testar em dispositivos físicos iOS e Android
- [ ] Submeter para TestFlight (iOS) e Google Play Internal Track (Android)

**Critério de aceite**: App funciona offline para registros, build de produção gerado e disponível para teste interno.

---

## Dependências por Fase

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4
                         ↘ Fase 5 → Fase 6 → Fase 7
```

Fases 3, 4 e 5 podem ser desenvolvidas em paralelo após a Fase 2.

---

## Decisões Técnicas Registradas

| Decisão | Escolha | Alternativa descartada | Motivo |
|---|---|---|---|
| Framework | Expo managed | React Native CLI | Builds na nuvem, sem configuração nativa local |
| Roteamento | Expo Router v3 | React Navigation | Consistência com Next.js App Router do web |
| Estilização | NativeWind v4 | StyleSheet puro | Reutiliza classes Tailwind do web — paridade visual |
| Auth storage | expo-secure-store | AsyncStorage | AsyncStorage não é criptografado |
| Notificações | expo-notifications | react-native-push-notification | Oficial Expo, suporte APNs/FCM simplificado |
| Foto | expo-image-picker | react-native-image-picker | Oficial Expo, managed workflow compatível |
| Ícones | react-native-svg (paths do web) | @expo/vector-icons | Paridade exata com ícones do web |
| HTTP client | packages/shared/api-client | axios/react-query | Reutiliza código existente do web sem duplicação |

---

## Extensão do Backend Necessária

As seguintes mudanças no backend Next.js são necessárias para suportar o mobile:

1. **`/notifications/push-subscription`**: aceitar body `{ type: "expo", token: string }` além do formato Web Push atual.
2. **`notification.service.ts`**: ao enviar push, verificar o tipo da subscription — se `type === "expo"`, usar Expo Push API (`https://exp.host/--/api/v2/push/send`) em vez de `webpush.sendNotification`.
3. **CORS**: adicionar header `Access-Control-Allow-Origin: *` (ou a URL do app) nas rotas `/api/v1/*` para desenvolvimento com Expo Go.
4. **Schema Prisma**: adicionar campo `type String @default("web")` e `expoToken String?` em `push_subscriptions`.

---

_Plano criado em 2026-04-06 · DailyMed Mobile v1.0_
