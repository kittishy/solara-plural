# experiments/ruby-api

Ruby SSR experiment for Solara Plural. This is a controlled preview of the
Ruby-first architecture — kept outside the main project tree so it never
interferes with Vercel production builds.

## What this is

A pure-Ruby implementation of the Solara API layer:

- **`lib/`** — shared helpers: Turso HTTP client, auth delegation, response
  helpers, ERB template renderer, ID generator, request parsing
- **`endpoints/`** — JSON API handlers (`members`, `notes`, `journal`, `front`,
  `health`) and per-resource sub-routes
- **`pages/`** — server-rendered HTML pages (members list, notes list)
- **`views/`** — ERB templates with Solara design tokens

## Why it's here and not in `api/`

Vercel's Ruby runtime (`@vercel/ruby`) causes `vercel build` to fail locally
when a `Gemfile` is present at the project root (Ruby version resolution error
regardless of version spec). Moving Ruby to `experiments/` keeps the main
deploy path — Next.js on Vercel — fully intact.

## Running locally

```bash
cd experiments/ruby-api
bundle install
ruby -e "require_relative 'lib/turso'; puts Solara::Turso.execute('SELECT 1').inspect"
```

Individual handlers can be tested with a lightweight rack harness (not
included) or ported to a preview Vercel project that only contains this
directory.

## Migration roadmap

See `docs/ROADMAP.md` → **Ruby Migration Track** for the phase plan. Phases
R1–R2 (lib foundation + read endpoints) are complete here. Phase R3 begins
when write endpoints for `front`, `journal`, and `notifications` are ready to
leave Next.js.
