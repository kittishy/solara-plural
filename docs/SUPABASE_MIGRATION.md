# Migração Turso (libSQL/SQLite) → Supabase (Postgres, São Paulo)

> Prompt de continuação para o Claude Code (web). Cole o conteúdo da seção
> **"PROMPT"** no início da conversa. Todo o contexto técnico necessário está aqui.

---

## PROMPT

Você vai migrar o banco de dados deste projeto (Next.js 14 PWA, Drizzle ORM)
de **Turso/libSQL (SQLite)** para **Supabase (Postgres)** na região
**São Paulo (`sa-east-1`)**, para co-localizar o banco com os usuários
brasileiros e com a função da Vercel.

Trabalhe numa branch nova (`migrate-supabase`). **Não toque no banco Turso atual**
— ele é o rollback. Verifique cada fase antes de seguir.

### Estado atual (já feito)

- A função da Vercel está fixada em `iad1` (EUA) em `vercel.json` como medida
  paliativa temporária (co-localização com o Turso em `us-east-2`).
  **Ao final desta migração, troque `vercel.json` → `regions: ["gru1"]`**
  (São Paulo), porque o banco passa a ficar no Brasil.
- Auth: next-auth v5, `strategy: 'jwt'` (sem sessão no banco). O `authorize()`
  em `lib/auth/config.ts` consulta a tabela `systems` via `db.query` — funciona
  sem mudança depois que o driver for trocado.

### Escopo real (mapeado)

- `lib/db/schema.ts`: **25 tabelas** `sqliteTable`, 439 linhas.
- **63 colunas `integer`**: a maioria é `{ mode: 'timestamp' }` (epoch em
  segundos); algumas são flags inteiras (`isArchived` default 0, `sortOrder`
  default 0).
- **136 colunas `text`** (ids cuid2 etc.) — sem mudança no Postgres.
- `db.batch(...)`: usado **só** em `app/(dashboard)/page.tsx` (a home).
- **39 usos** de `sql\`...\`` / `.run()` — auditar SQLite-ismos.
  `lib/db/index.ts` tem `PRAGMA foreign_keys = ON` (remover; o Postgres já
  impõe FKs nativamente).

### Decisões já tomadas (siga-as para minimizar churn/risco)

1. **Flags booleanas continuam `integer` 0/1** no Postgres. Assim NÃO é preciso
   reescrever nenhuma comparação `eq(tabela.flag, 0)` espalhada nas queries.
2. **Timestamps epoch → `timestamp` nativo do Postgres.** O Drizzle entrega
   `Date` nos dois dialetos, e o app já passa objetos `Date`
   (ex.: `endedAt: new Date()`, `createdAt: now`), então o código de leitura/
   escrita não muda. **A cópia de dados precisa converter epoch (segundos) →
   timestamp** (`to_timestamp(epoch_seconds)`).
3. Driver: **`postgres-js` + `drizzle-orm/postgres-js`**.

### Variáveis de ambiente (Supabase, projeto em `sa-east-1`)

Já estão (ou estarão) no `.env.local`:

```
# Pooled (Transaction mode, porta 6543) — usada pelo app serverless
SUPABASE_DATABASE_URL=postgresql://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
# Direct (porta 5432) — usada só para rodar as migrations/DDL
SUPABASE_DIRECT_URL=postgresql://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

> ⚠️ **Gotchas críticos do Supabase + serverless:**
> - O app usa o **pooler de transação (6543)**. Com `postgres-js`, **desabilite
>   prepared statements**: `postgres(url, { prepare: false })`. Sem isso, o
>   pgBouncer em modo transação quebra.
> - **Rode as migrations (DDL) contra a conexão DIRECT (5432)**, não o pooler.
>   Configure `drizzle.config.ts` para usar `SUPABASE_DIRECT_URL`.

### Fases

**A — Prep**
- Criar branch `migrate-supabase`.
- `npm i postgres` (manter `drizzle-orm`). `@libsql/client` pode sair ao final.
- Confirmar projeto Supabase em São Paulo (`sa-east-1`) e as 2 strings no
  `.env.local`. (Use o connector/MCP do Supabase se disponível para criar o
  projeto e rodar SQL.)

**B — Schema + driver (só código)**
- `lib/db/schema.ts`: `sqliteTable`→`pgTable`; imports
  `drizzle-orm/sqlite-core`→`drizzle-orm/pg-core`;
  `integer('x',{mode:'timestamp'})`→`timestamp('x')`;
  defaults `sql\`(strftime('%s','now'))\``→`defaultNow()`;
  flags `integer(...).default(0)` permanecem `integer`.
- `lib/db/index.ts`: trocar `@libsql/client`/`drizzle-orm/libsql` por
  `postgres-js`; `postgres(process.env.SUPABASE_DATABASE_URL!, { prepare:false })`;
  remover `PRAGMA foreign_keys`.
- `drizzle.config.ts`: `dialect: 'postgresql'`, `dbCredentials.url =
  process.env.SUPABASE_DIRECT_URL`.
- `app/(dashboard)/page.tsx`: trocar `db.batch([...])` por `Promise.all([...])`
  ou uma transação (postgres-js não tem `.batch`).
- Auditar os 39 `sql\`...\`` por funções SQLite (`strftime`, `json_*` específicas,
  etc.) e portar para Postgres.

**C — Estrutura + dados**
- `npm run db:generate` (gera migrations Postgres) e aplicar no Supabase via
  conexão DIRECT.
- Script de cópia Turso→Supabase: ler todas as tabelas do Turso, converter
  epoch→timestamp, inserir no Supabase. São ~4 contas (volume trivial). Respeitar
  ordem de FKs (systems antes de members, etc.).

**D — Verificar + virar a chave**
- Rodar local contra o Supabase. Smoke test: login, membros, front
  (entrar/sair), histórico, journal, notes, friends, notificações, settings.
- `npm run test` (vitest) verde.
- Em produção (Vercel): apontar `DATABASE_URL` para a string pooled do Supabase
  (ou ajustar `lib/db/index.ts` para a env usada), **trocar `vercel.json` →
  `regions: ["gru1"]`**, e deployar.
- Manter o Turso de pé por alguns dias como rollback.

### Critério de pronto

- App funcionando 100% contra o Supabase São Paulo, vitest verde, função da
  Vercel em `gru1`, e latência de navegação visivelmente menor para usuários
  no Brasil.
