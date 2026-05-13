---
name: Solara Plural — System HQ
version: alpha
description: >
  Visual identity for a plural system management app. Bold,
  card-forward, game-UI-inspired aesthetics adapted for mobile-first
  vertical layouts. Built for fast scanning across 500+ alters.

colors:
  # Cores base (Night Bloom — tema padrão)
  bg:             "#14101f"
  surface:        "#1e1830"
  surface-alt:    "#271f3d"
  surface-raised: "#312849"

  border:         "#3d3361"
  border-strong:  "#5c4e8a"
  border-accent:  "#7c5fc2"

  text:           "#eee8fc"
  text-muted:     "#9d90c0"
  text-subtle:    "#6b5f8a"

  # Accent principal — violeta elétrico
  primary:        "#b48efa"
  primary-soft:   "#7c3aed"
  primary-glow:   "#d4bcff"

  # Accent secundário — pink quente (frentes / destaques)
  hot:            "#f472b6"
  hot-soft:       "#9d174d"
  hot-glow:       "#fbb6d6"

  # Accent especial — dourado (ranks, destaques raros)
  gold:           "#fbbf24"
  gold-soft:      "#92400e"
  gold-glow:      "#fde68a"

  # Status
  success:        "#34d399"
  warning:        "#fbbf24"
  error:          "#f87171"
  info:           "#60a5fa"

typography:
  display:
    fontFamily: Nunito
    fontSize: 2rem
    fontWeight: 800
    letterSpacing: "-0.02em"
  h1:
    fontFamily: Nunito
    fontSize: 1.5rem
    fontWeight: 800
    letterSpacing: "-0.01em"
  h2:
    fontFamily: Nunito
    fontSize: 1.125rem
    fontWeight: 700
  h3:
    fontFamily: Nunito
    fontSize: 0.9375rem
    fontWeight: 700
  body-md:
    fontFamily: Nunito
    fontSize: 0.9375rem
    fontWeight: 400
  body-sm:
    fontFamily: Nunito
    fontSize: 0.8125rem
    fontWeight: 400
  label-caps:
    fontFamily: Nunito
    fontSize: 0.6875rem
    fontWeight: 700
    letterSpacing: "0.1em"
    textTransform: uppercase
  mono:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem

rounded:
  none: 0px
  sm:   6px
  md:   10px
  lg:   14px
  xl:   20px
  pill: 9999px

spacing:
  xs:  4px
  sm:  8px
  md:  16px
  lg:  24px
  xl:  32px
  2xl: 48px

components:
  member-card:
    border-left: "3px solid <member-color>"
    background: "surface"
    radius: "md"
    shadow: "0 0 0 1px border, 0 4px 16px rgba(0,0,0,0.4)"
  section-header:
    typography: "label-caps"
    color: "text-muted"
    decoration: "side-bar left accent color"
  tag-chip:
    radius: "pill"
    padding: "2px 10px"
    fontSize: "body-sm"
  rank-badge:
    background: "gold"
    color: "#000"
    radius: "sm"
    fontWeight: 800
  nav-tab:
    active-indicator: "bottom border 2px primary"
    active-bg: "surface-raised"
---

## Overview

**System HQ** — não é um app minimalista. É um QG de sistema.

A identidade visual parte de dois princípios:

1. **Clareza como respeito** — com 500+ alters, o olho precisa encontrar
   a informação em menos de um segundo. Hierarquia visual não é decoração,
   é usabilidade real.

2. **Personalidade como identidade** — cada alter tem cor, cada seção tem
   peso visual. O app precisa parecer *de quem usa*, não de uma empresa de
   software.

A referência estética são as cards de personagem de jogos como ZZZ e
Blue Archive: dark background profundo, accent colors vibrantes, tipografia
bold, bordas com propósito. Sem o estilo "bolha branca Apple". Sem gradientes
suaves demais que somem na tela.

---

## Colors

A paleta é dark-first com três camadas de profundidade e três accent tracks.

**Backgrounds:**
- `bg` (#14101f): Base absoluta. Mais escuro que o atual — o contraste das
  cards precisa "saltar".
- `surface` (#1e1830): Cards e painéis principais.
- `surface-alt` (#271f3d): Seções internas, hover state.
- `surface-raised` (#312849): Modais, dropdowns, elementos elevados.

**Borders com personalidade:**
- `border` (#3d3361): Limite padrão — existe, mas não grita.
- `border-strong` (#5c4e8a): Hover states, cards em foco.
- `border-accent` (#7c5fc2): Cards de alters com cor padrão, elementos ativos.

**Accent Tracks — são 3, cada uma com propósito claro:**

- **Primary (violeta `#b48efa`):** Ações principais, navegação ativa,
  links, botões primários. É a cor do *sistema* como um todo.

- **Hot (pink `#f472b6`):** Frentes (front), destaque de alter em foco,
  estados "agora". É a cor do *momento presente*.

- **Gold (`#fbbf24`):** Usado com extrema parcimônia — rank S, destaque
  especial, conquistas. Quando o ouro aparece, importa.

**Regra de cor dos alters:** Cada alter tem sua `member-color`. Essa cor
aparece como `border-left: 3px solid` na card deles, e como accent em seu
perfil. Nunca como background inteiro — evita conflito com legibilidade.

---

## Typography

Nunito permanece como fonte principal — ela é arredondada o suficiente para
não parecer corporativa, mas suporta peso 800 sem parecer agressiva.

**Hierarquia obrigatória:**

- `display` (2rem / 800): Apenas títulos de seção maior, nome do alter em
  perfil dedicado.
- `h1` (1.5rem / 800): Headers de página. Nunca mais de um por tela.
- `h2` (1.125rem / 700): Títulos de card, seções dentro de página.
- `h3` (0.9375rem / 700): Sub-seções, títulos de lista.
- `body-md`: Conteúdo padrão.
- `label-caps` (0.6875rem / 700 / UPPERCASE / tracking): Labels de campo,
  títulos de seção pequena. **Nunca use para texto longo.**

A sensação deve ser de revista técnica de alto contraste — clara,
densa de informação, mas visualmente organizada.

---

## Layout

**Mobile-first, vertical, card-stack.**

A unidade fundamental de layout é a **card**. Tudo que é uma entidade
(alter, nota, frente, grupo) vive em uma card. A tela é uma lista de cards,
ou o detalhe de uma card.

**Grid de base:** 16px de padding lateral. Nunca menos.

**Card stack spacing:** 10px entre cards na lista.

**Seções dentro de uma página** são separadas por `label-caps` header +
linha divisória, não por whitespace excessivo.

**Bottom Navigation (mobile):** 5 itens máximo. Ícone + label curta.
Tab ativa tem indicator bar na borda superior, background `surface-raised`.

**Sem sidebar** no mobile. A sidebar existe apenas em breakpoint ≥ 768px.

---

## Elevation & Depth

Três níveis de elevação, definidos por sombra e borda — não por blur excessivo:

| Nível | Uso | Shadow |
|-------|-----|--------|
| Flat  | Background sections | nenhuma |
| Card  | Member cards, list items | `0 0 0 1px border, 0 4px 16px rgba(0,0,0,0.4)` |
| Float | Modais, dropdowns, toasts | `0 0 0 1px border-strong, 0 12px 40px rgba(0,0,0,0.6)` |

Glassmorphism: **evitar**. O blur gera problema de legibilidade em telas
OLED e parece datado. Preferir surface sólido com border.

---

## Shapes

Raio de borda comunica a "personalidade" do elemento:

- `sm` (6px): Tags, badges, chips inline — pequenos e diretos.
- `md` (10px): Cards principais, inputs, botões. O raio padrão do app.
- `lg` (14px): Modais, sheets, áreas de conteúdo maior.
- `xl` (20px): Avatares de alter, picture frames.
- `pill`: Chips de status, badges de frente atual, contadores.

**Regra de corner decoration:** Cards de alter podem ter um detalhe visual
no corner superior direito (ponto colorido 4×4px, cor do alter) para
identificação rápida em listas densas.

---

## Components

### Member Card (lista de alters)

A peça mais importante do app. Design inspirado nas agent cards do ZZZ:

```
┌─────────────────────────────────────┐
│▌ [Avatar 40px] Nome do Alter    [→] │  ← border-left 3px cor do alter
│  Pronome · Função                   │
│  [tag] [tag] [tag]                  │
└─────────────────────────────────────┘
```

- Border esquerda `3px solid` cor do alter
- Avatar 40×40px, radius `xl`
- Nome: `h3` (700)
- Metadados: `body-sm` text-muted
- Tags: `tag-chip` com cor do alter a 15% opacity como background
- Chevron direito apenas quando há detalhe navegável
- Tap area: 60px mínimo de altura

### Section Header

Identifica grupos de alters, seções de configuração, etc.:

```
SUBSISTEMA CORE  ─────────────────────
```

- `label-caps` + cor `text-muted`
- Linha de 1px `border` preenchendo o resto da largura
- Sem caixa ou background — é um separador textual

### Front Badge (alter em frente)

Destaque máximo — sinaliza quem está na frente:

```
╔══════════════════════════════════════╗
║ ◉ EM FRENTE  Nome do Alter          ║  ← background hot-soft, border hot
║  [Avatar grande]  Pronomes          ║
╚══════════════════════════════════════╝
```

- Background `hot-soft` com opacity 20%
- Border completo `1px hot`
- Ponto pulsante `◉` animado em `hot`
- Esta card aparece no topo do dashboard, acima das seções

### Tag / Chip

```
[ pronome ]  [ subsistema ]  [ host ]
```

- Background: cor do alter a 12% opacity
- Border: cor do alter a 30% opacity
- Texto: cor do alter
- Radius `pill`
- Font: `body-sm`

### Nav Tab (bottom nav)

- 5 itens máximo
- Ícone 22px + label `label-caps`
- Ativo: `border-top: 2px solid primary`, background `surface-raised`,
  icon + text em `primary`
- Inativo: text-muted, sem border

### Rank/Rarity Badge

Reservado para funcionalidades especiais (ex: alter com papel especial,
marcos do sistema):

```
[S]  ou  [★]
```

- Background `gold`, texto preto, `body-sm` / 800
- Radius `sm`
- Nunca mais de um por card

---

## Do's and Don'ts

### ✓ Faça

- Use `border-left` colorida para identificar alters em listas
- Use `label-caps` para todos os títulos de seção pequena
- Mantenha cards com padding interno consistente (12px vertical / 14px horizontal)
- Use a cor do alter apenas nos elementos de identificação — borda, tags, avatar ring
- Prefira ícones reconhecíveis (Lucide) + label curta no mobile
- Cores de status (success/error) apenas para feedback de ação — nunca como decoração
- Tap areas mínimas de 48×48px em todos os elementos interativos

### ✗ Não faça

- Não use gradientes de background em cards (parece Web 2.0, não game UI)
- Não repita a cor do alter como background inteiro de cards — ilegível
- Não use mais de 3 tags por alter em listas — use o perfil para o resto
- Não aplique glassmorphism/backdrop-filter em elementos essenciais
- Não use mais de dois accent colors na mesma tela simultaneamente
- Não use fonte abaixo de 13px em qualquer elemento funcional
- Não crie hierarquia só com espaçamento — use peso tipográfico também
- Não coloque mais de 5 itens no bottom nav
- Não imite o visual Apple: sem backgrounds brancos, sem cantos 20px em inputs
