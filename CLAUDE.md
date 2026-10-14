# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`regon-nip` – a Twenty app that adds Polish company lookup by NIP to the standard `Company` object: fetches data from GUS REGON (BIR1 SOAP) and the MF Biała Lista VAT API, and validates NIPs on save. User-facing strings and code comments are in Polish; keep that convention.

## Commands

- `yarn twenty docker:start` – start local Twenty server (Docker); `yarn twenty dev` – sync the app to it (http://localhost:2020, login `tim@apple.dev` / `tim@apple.dev`)
- `yarn lint` / `yarn lint:fix` (oxlint), `yarn typecheck` (tsgo)
- `yarn test:unit` – vitest, `src/**/*.test.ts` only
- `yarn test` – integration tests (`src/**/*.integration-test.ts`); need a running Twenty server (`TWENTY_API_URL`, `TWENTY_API_KEY`)
- Single test: `yarn vitest run --config vitest.unit.config.ts <path>` (add `-t "<name>"` for one case)
- `test/lookup.test.ts` uses `node:test`, not vitest, so no yarn script covers it: run `node --test test/lookup.test.ts`
- Adding the app's REGON key locally: set the `REGON_API_KEY` app variable in Twenty (`REGON_ENV` = `test` by default, `prod` for production)
- Deploy to the default remote (`recoop`, https://crm.recoop.pl): `./node_modules/.bin/twenty plan` (read-only preview), then `./node_modules/.bin/twenty apply --no-delete`. Typecheck must pass first. **Before every deploy bump the patch version in `package.json`** (e.g. 0.1.9 → 0.1.10) and commit it.

## Architecture

- **Lookup pipeline** (`src/lookup.ts`): `lookupCompanyByNip` normalizes/validates the NIP (`nip.ts`), queries REGON (`regon.ts`, `RegonClient`) as the primary source, and enriches from Biała Lista (`biala-lista.ts`, VAT status/KRS). REGON detail/PKD reports and Biała Lista are best-effort: failures become `warnings`, not errors. `map-company.ts` (`buildDraft`) maps the merged data to a `CompanyDraft`. `fetchImpl` is injectable for tests – never hit real APIs in tests.
- **Logic functions** (`src/logic-functions/`):
  - `lookup-company-nip` – HTTP route `POST /company/lookup-nip`; reads `REGON_API_KEY` / `REGON_ENV` from app variables (declared in `application-config.ts`); also checks for an existing company with the same NIP and returns it as `existing`.
  - `validate-company-nip-created` / `-updated` – database event triggers sharing `src/validate-company-nip.ts`. Twenty can't block a write from an app, so validation is post-save: valid NIP is normalized to 10 digits, invalid is cleared and a Note is attached.
- **UI**: command menu item → front component `add-company-by-nip` (calls the lookup route; opens the existing record on duplicate), plus a `main-page` front component wired via page layout and navigation menu item.
- **Schema**: `src/fields/` extends `Company` with custom fields (nip, regon, krs, formaPrawna, pkd, dataStartu, statusVat).
- **Identifiers**: every entity's `universalIdentifier` lives in `src/constants/ids.ts` (and `universal-identifiers.ts` for the app itself). They are fixed once applied – never regenerate or change existing ones.

## Conventions

- New entities: use `yarn twenty dev:add <type>` (field, logicFunction, frontComponent, view, navigationMenuItem, pageLayout, commandMenuItem, …) so IDs and files are generated; then move the generated ID into `src/constants/ids.ts`. File naming here: `<name>.field.ts`, `<name>.logic-function.ts`, `<name>.front-component.tsx`, etc.
- All generated UUIDs must be valid UUID v4.
- A view must have an associated navigationMenuItem, otherwise it won't appear in the left sidebar.
- Front components must fit their fixed widget width/height (no scrolling), unless meant for a canvas tab.
- Front components: no hardcoded colors (Twenty has light and dark theme) – use inherited text color (`color: 'inherit'`) and semi-transparent `rgba` backgrounds/borders.
- Git: work and commit directly on `main`; do not create branches.

## Docs

Twenty app docs: https://docs.twenty.com/developers/extend/apps/ (sections: getting-started, config, data, logic, layout, operations; append `.md` to a page URL for markdown). Full link list is in `AGENTS.md`. Reference app: https://github.com/twentyhq/twenty/tree/main/packages/twenty-apps/examples/postcard
