# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project overview

Angular 20 frontend for a Laboratory Asset Management System (LAMS), built on the Sakai-ng PrimeNG admin template. This repo is frontend-only; it talks to a separate NestJS backend (not in this repo) over REST + Socket.IO.

- Backend is expected at `http://localhost:3000` in development (`src/environments/environment.development.ts`, `apiUrl: 'http://localhost:3000/api'`). Production points to a deployed Render backend (`src/environments/environment.ts`). The app will not function (login, data, websockets) without that backend running/reachable.

## Commands

```bash
npm start                # ng serve — dev server at http://localhost:4200, requires backend running
npm run build             # ng build — production build to dist/sakai-ng
npm run watch              # ng build --watch --configuration development
npm test                  # ng test — Karma/Jasmine unit tests
npm run format             # prettier --write over **/*.{js,mjs,ts,mts,d.ts,html}
```

- No `lint` script is defined in package.json even though `eslint.config.js` exists; run eslint directly if needed: `npx eslint .`
- To run a single spec file with Karma, there's no built-in flag via `ng test`; filter with Jasmine's `fdescribe`/`fit` in the spec, or pass `--include` (e.g. `ng test --include='**/foo.spec.ts'`).
- There is no e2e test setup (README notes Angular CLI doesn't ship one by default and none has been added).

## Architecture

### Non-standard root file layout

Angular CLI normally puts `app.component.ts`, `app.config.ts`, and `app.routes.ts` inside `src/app/`. In this repo they instead live directly in `src/` (`src/app.component.ts`, `src/app.config.ts`, `src/app.routes.ts`), while `src/app/` holds only `core/`, `layout/`, `pages/`, and `shared/`. Keep this in mind when tracing bootstrap/routing — don't assume the standard Angular CLI layout.

- `src/app.config.ts` wires up the router, `HttpClient` (with `authInterceptor`), animations, PrimeNG theming (Aura preset, dark mode via `.app-dark` selector), and the service worker (`ngsw-worker.js`, disabled in dev).
- `src/app.routes.ts` is the top-level route table: `/login`, `/auth/*` (lazy), and `/app/*` behind `AppLayout` + `AuthGuard`, with feature routes lazy-loaded via `src/app/pages/pages.routes.ts` (and `uikit.routes`, `assetcategory.routes`, `auth.routes`).

### Path alias

`@/*` maps to `src/app/*` (see `tsconfig.json`). Some files use it (`@/shared/services/websocket.service`), others use relative imports for the same target — both resolve to the same place; don't assume inconsistency is a bug.

### Feature module shape (`src/app/pages/*`)

Each feature area (assets, activities, departments, laboratories, maintenance, requestmaintenance, masterplan, reports, etc.) is a flat folder containing its component(s), and typically its own `*-websocket.service.ts` for realtime updates plus a `services/` subfolder for feature-specific HTTP/state services. There is no NgModule per feature — everything is standalone components wired together via `pages.routes.ts`.

### Auth & roles

- `AuthService` (`src/app/pages/service/auth.service.ts`) logs in against `${apiUrl}/auth/login`, stores `token` and `currentUser` (JSON, includes a `role` string) in `localStorage`, and is the single source of truth for the current user.
- `authInterceptor` (`src/app/pages/service/auth.interceptor.ts`) attaches `Authorization: Bearer <token>` from `localStorage` to every HTTP request.
- `AuthGuard` only checks "is logged in" (redirects to `/login` otherwise); it does not do role-based route restriction.
- Role-based UI/behavior (SuperAdmin, CampusAdmin, LabTech, Faculty) is handled ad hoc inside components/templates by reading `currentUser.role` from `localStorage` (e.g. `src/app/pages/dashboard/dashboard.ts` switches between `DashboardSuperAdmin` / `DashboardCampusAdmin` / `DashboardLabTech` / `DashboardFaculty`), not via a central RBAC guard or directive. When adding role-gated features, follow this existing per-component pattern rather than inventing a new mechanism, unless asked to centralize it.
- The backend also enforces roles and returns 403 with a `Required roles: ...` message on violation; `ErrorHandlerService.handleHttpError` special-cases that message into a friendlier UI string.

### Realtime (Socket.IO)

`src/app/shared/services/websocket.service.ts` is a generic, namespace-based Socket.IO client: `connect(namespace)`/`disconnect(namespace)` manage one socket per namespace (e.g. `/assets`, `/activities`, `/maintenance`), authenticating via the same JWT stored in `localStorage`. The base URL is derived from `environment.apiUrl` with `/api` stripped.

Each feature that needs realtime updates wraps this in its own thin service (e.g. `AssetsWebSocketService`, `DepartmentsWebSocketService`, `ActivitiesWebSocketService`, `MaintenanceWebSocketService`, `CalendarWebSocketService`) exposing typed `on<Event>Created/Updated/Deleted()` observables over `WebSocketEvent<T>` (`{ success, message, data, timestamp }`) — follow this wrapper pattern for any new realtime feature rather than calling `WebSocketService` directly from components.

### Shared UI/infra (`src/app/shared/`)

Reusable pieces used across feature pages: `data-table`, `filter-panel`, `form-field`, `toolbar`, `action-buttons`, `stats-card`, `chart-wrapper` components; `dialog.service.ts` and `export.service.ts`; `websocket-interfaces.ts` for shared DTO/event types. Prefer these over rebuilding equivalent UI in a feature folder.

### Core (`src/app/core/`)

- `BaseComponent` (`core/base/base.component.ts`) — abstract class providing a `destroy$: Subject<void>` for `takeUntil()`-based subscription cleanup. Components that subscribe to observables (HTTP or websocket) should extend it rather than hand-rolling teardown.
- `ErrorHandlerService` (`core/services/error-handler.service.ts`) — centralized SweetAlert2-based error/success/warning/confirm dialogs, plus `handleHttpError` which maps HTTP status codes to user-facing messages. Use this instead of ad hoc `alert()`/console-only error handling.

### Styling

Tailwind CSS v4 (via `@tailwindcss/postcss`) + PrimeNG (Aura theme) + `tailwindcss-primeui`, with global styles at `src/assets/styles.scss`. Component styles default to SCSS (`angular.json` schematics). `printWidth` is 250 and `tabWidth` is 4 in `.prettierrc.json` — don't reformat to different conventions.

### PDF/export tooling

Multiple report/schedule features generate PDFs and spreadsheets client-side via `jspdf`/`jspdf-autotable`, `exceljs`/`xlsx`, and `file-saver` (see `labschedule-pdf.service.ts`, `masterplan-pdf.service.ts`, `asset-export.service.ts`). QR codes are handled via `@zxing/browser`/`@zxing/library`/`jsqr` (`qr-code.service.ts`) for asset scanning.
