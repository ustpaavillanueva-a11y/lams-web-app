# Asset Bundles, Phase 3 (History, Reports and QR Routing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bundle and component maintenance history visible and correct everywhere (bundle detail page with timeline, component history, reports, calendar, history list) and make QR scans resolve bundles and show a component's bundle.

**Architecture:** A shared pure label function (`describeRequestTarget`) gives every backend consumer the same target text the frontend already shows. A participation query finds requests that involve an asset either as the anchor or as an affected component. A new bundle-history endpoint returns requests by bundle snapshot. The frontend adds a bundle detail dialog (components + timeline) and teaches the QR scanner to resolve bundle IDs/property numbers and to show "Part of" for components.

**Tech Stack:** Backend `capstone-backend`: NestJS 11, TypeORM 0.3, PostgreSQL, Jest. Frontend `lams-web-app`: Angular 20 standalone components, PrimeNG.

**Spec:** `lams-web-app/docs/superpowers/specs/2026-10-02-asset-bundles-design.md` (sections 3, 8, 9, 10, 11, 13 phase 3, 16). Earlier plans: phase 1 and phase 2 (done).

## Global Constraints

- Target label strings (identical to the frontend `MaintenanceUtils.describeMaintenanceTarget`): `ASSET` with no bundle -> asset name; `ASSET` with bundle -> `<asset name> (<bundle name>)`; `COMPONENTS` -> `<bundle name>: <componentRole or asset name>, ...` (comma-joined); `BUNDLE` -> `<bundle name> (entire set)`; bundle null but scope not `ASSET` -> comma-joined affected asset names, or the anchor asset name if none; missing request -> `N/A`.
- Bundle history is by the request's `bundle` snapshot (spec 4.3/10), so it survives replaced, removed and transferred components.
- A request "involves" an asset when `request.asset` is that asset OR the asset is in `request.affectedComponents`. Results are de-duplicated by `requestId`.
- Retired asset status row name is exactly `Retired` (statusId `ASTAT003`). `assets.status` FK is `ON DELETE CASCADE`, so no migration may delete a status row that assets still reference.
- All bundle reads are campus-scoped via `PermissionsService.getCampusWhereClause`; out-of-scope bundle -> `NotFoundException`. Read roles = `validateViewAssetService`.
- Plain single-asset behavior is unchanged: no bundle -> same labels, same history, same report rows (spec 15).
- The dev database is remote and shared: no agent connects to it or runs migrations; migrations are hand-written (modeled on `1789700000000-AddAssetBundles.ts`); verification is `npx jest` + `npm run build` (backend) and `ng build` to a temp output path, never the tracked `dist/` (frontend).
- Frontend: standalone components, `environment.apiUrl`, prettier printWidth 250 / tabWidth 4; repo files are CRLF, preserve them (check `git diff --stat` for whole-file rewrites; backend `maintenance.approval.service.ts`, `assets.service.ts` and `calendar.service.ts` are large CRLF files).

## Review Focus

- A request whose bundle was deleted (`bundle` null) still gets a sensible label in reports, calendar and history, with no crash. Pinned in Task 1.
- Creating an `ASSET`-scope request on a Retired component is rejected. Pinned in Task 2.
- A non-anchor component's history includes the set request exactly once, even when the component is both anchor and in `affectedComponents`. Pinned in Task 3.
- Another campus's user asking for a bundle's history gets 404, and a bundle's history still lists requests for components that were later removed from it. Pinned in Task 4.
- QR scan: a value that matches both an asset and a bundle resolves to the asset; a value that matches neither still shows "not found". Pinned in Task 7.
- Reports and the history list for plain asset requests are byte-for-byte the same rows as before. Pinned in Task 5.

---

## File Structure

Backend (`capstone-backend/src/`):
- `modules/maintenance/utils/request-target-label.util.ts` (+ `.spec.ts`) (create): `describeRequestTarget`.
- `src/db/migrations/1789900000000-AddRetiredAssetStatus.ts` (create), `src/db/seed.ts` (modify): Retired status.
- `modules/maintenance/services/maintenance.request.service.ts` (modify): Retired guard in `create`; involvement query in `findByAssetRecord`.
- `modules/maintenance/services/maintenance.approval.service.ts` (modify): involvement query in `findByAsset`.
- `modules/assets/services/assets.service.ts` (modify): involvement merge into `findOne`'s maintenance history.
- `modules/assets/services/asset-bundles.service.ts`, `controllers/asset-bundles.controller.ts` (modify): history endpoint; DTO/interface `BundleHistoryItem`.
- `modules/reports/services/{corrective-maintenance,preventive-maintenance,calibration}-report.service.ts`, `modules/maintenance/services/maintenance.history.service.ts`, `modules/calendar/services/calendar.service.ts` (modify): target label.

Frontend (`lams-web-app/src/app/`):
- `pages/assets/services/asset-bundle.service.ts`, `pages/assets/models/asset-bundle.model.ts` (modify): history call + type.
- `pages/assets/components/bundle-detail-dialog.ts` (create), `pages/assets/components/bundle-list.ts`, `pages/assets/assets.ts` (modify): detail dialog, component history filter, `bundleId` query param.
- `layout/component/app.topbar.ts` (modify): QR bundle resolution.

---

### Task 1: Shared target label (backend)

**Files:**
- Create: `modules/maintenance/utils/request-target-label.util.ts`
- Test: `modules/maintenance/utils/request-target-label.util.spec.ts`

**Interfaces:**
- Produces: `export interface TargetLabelInput { scope?: string | null; asset?: { assetName?: string | null } | null; bundle?: { bundleName?: string | null } | null; affectedComponents?: Array<{ assetName?: string | null; componentRole?: string | null }> | null }`; `export function describeRequestTarget(request: TargetLabelInput | null | undefined): string` returning exactly the strings in Global Constraints. Scope comparison is case-insensitive and an unknown/missing scope is treated as `ASSET`.

- [ ] **Step 1: Write failing tests:** (a) `null` -> `N/A`; (b) ASSET no bundle -> `Monitor`; (c) ASSET with bundle -> `Monitor (PC Set)`; (d) COMPONENTS `[role Monitor, no role asset 'Mouse X']` -> `PC Set: Monitor, Mouse X`; (e) BUNDLE -> `PC Set (entire set)`; (f) COMPONENTS with `bundle: null` and affected names -> `Monitor, Mouse X`; (g) BUNDLE with `bundle: null` and no affected -> anchor asset name; (h) lowercase scope `'bundle'` still gives `(entire set)`; (i) COMPONENTS with empty `affectedComponents` and a bundle -> `PC Set` (no trailing colon); (j) missing asset name -> `N/A` anchor.
- [ ] **Step 2:** Run `npx jest src/modules/maintenance/utils/request-target-label.util.spec.ts`; expect FAIL.
- [ ] **Step 3:** Implement `describeRequestTarget` as a pure function.
- [ ] **Step 4:** Run the spec, then `npx jest` and `npm run build`; expect PASS. Commit `feat(maintenance): add shared request target label util` (backend repo).

### Task 2: Retired asset status and request guard

**Files:**
- Create: `src/db/migrations/1789900000000-AddRetiredAssetStatus.ts`
- Modify: `src/db/seed.ts`, `modules/maintenance/services/maintenance.request.service.ts` (`create`), `maintenance.request.service.create.spec.ts`

**Interfaces:**
- Consumes: existing `RequestScope`, `create` flow from phase 2.
- Produces: seed row `{ statusId: 'ASTAT003', statusName: 'Retired' }`; `create` throws `BadRequestException('Asset <assetName> is retired and cannot be maintained')` when the single `asset` (ASSET scope) has status name `Retired`.

- [ ] **Step 1: Write failing tests** in the existing create spec: ASSET scope on an asset whose status is `Retired` -> `BadRequestException` with that message and `save` not called; ASSET scope on a Serviceable asset still saves (regression).
- [ ] **Step 2:** Run the spec; expect the new test to FAIL.
- [ ] **Step 3:** Implement the guard in `create` (load the asset's status with the existing asset lookup), add the seed row after the two existing statuses, and hand-write the migration: `up` inserts `("statusId","statusName") VALUES ('ASTAT003','Retired') ON CONFLICT DO NOTHING`; `down` runs `DELETE FROM "assets_statuses" WHERE "statusId" = 'ASTAT003' AND NOT EXISTS (SELECT 1 FROM "assets" WHERE "status" = 'ASTAT003')` (the FK cascades, so deleting a referenced status would delete assets; never do that).
- [ ] **Step 4:** Run `npx jest` and `npm run build`; PASS. Commit `feat(assets): seed Retired status and reject requests on retired assets`.

### Task 3: Requests that involve an asset (history queries)

**Files:**
- Modify: `modules/assets/services/assets.service.ts` (`findOne` history), `modules/maintenance/services/maintenance.request.service.ts` (`findByAssetRecord`), `modules/maintenance/services/maintenance.approval.service.ts` (`findByAsset`)
- Test: `modules/maintenance/services/request-involvement.spec.ts` (or the nearest existing spec for each method if one exists)

**Interfaces:**
- Produces: `export function mergeInvolvedRequests<T extends { requestId: string }>(anchored: T[], viaComponents: T[]): T[]` in `modules/maintenance/utils/request-involvement.util.ts` (de-duplicate by `requestId`, anchored first, stable order). Each of the three read paths now returns requests where `request.asset = :assetId` OR the asset is in `affectedComponents` (a left join on `request.affectedComponents` with alias filter `involved.assetId = :assetId`), loading `bundle` and `affectedComponents` on the results as phase 2's read relations do. `assets.service.findOne` keeps its existing relations for the anchored requests and merges component-involved requests (loaded with the same maintenance relations used there: type, status, service, approval + technicians) into the same `maintenanceHistory` ordering.

- [ ] **Step 1: Write failing tests:** for `mergeInvolvedRequests`: anchored `[r1,r2]` + via `[r2,r3]` -> `[r1,r2,r3]` once each; empty inputs; order stable. For each of the three read paths, a focused test with mocked repositories asserting a component-only involvement request is returned and a request that is both anchor and component appears once (follow the mock style of `maintenance.request.service.create.spec.ts`; if a path cannot be mocked cheaply, test the merge helper and state in the report that wiring is diff-verified).
- [ ] **Step 2:** Run the new spec; expect FAIL.
- [ ] **Step 3:** Implement the helper and update the three paths. Keep campus/role scoping exactly as in each method today. Do not change plain-asset results.
- [ ] **Step 4:** Run `npx jest` and `npm run build`; PASS. Commit `feat(maintenance): include set requests in a component's history`.

### Task 4: Bundle maintenance history endpoint

**Files:**
- Modify: `modules/assets/services/asset-bundles.service.ts`, `modules/assets/controllers/asset-bundles.controller.ts`, `modules/assets/assets.module.ts` (if `MaintenanceRequest` repository is not yet available)
- Test: `modules/assets/services/asset-bundles.service.history.spec.ts`

**Interfaces:**
- Consumes: `describeRequestTarget` (Task 1), `findScoped` (existing campus-scoped bundle lookup).
- Produces: `export interface BundleHistoryItem { requestId: string; maintenanceName: string; scope: RequestScope; target: string; maintenanceType: string | null; serviceName: string | null; status: string; requestDate: Date; completedAt: Date | null; performedBy: string | null; components: Array<{ assetId: string; assetName: string; componentRole: string | null }> }`; `AssetBundlesService.getMaintenanceHistory(id: string, currentUser: User): Promise<BundleHistoryItem[]>`; route `GET /asset-bundles/:id/maintenance-history` (read roles as other bundle reads). Requests are those with `bundle = id`, newest first by `COALESCE(approval.completedAt, request.requestDate)`. `components` = `affectedComponents` for COMPONENTS/BUNDLE scope, `[asset]` for ASSET scope. `performedBy` = approval `performedBy` else `assignedTechnician` full name, else `null`.

- [ ] **Step 1: Write failing tests** (mocked repositories): (a) returns items for the bundle only, newest first, with correct `target` text and `components` per scope; (b) an ASSET-scope request on a component later removed from the bundle is still returned (the snapshot decides); (c) bundle in another campus -> `NotFoundException`, request repository never queried; (d) request without an approval -> `completedAt` null, `performedBy` null; (e) empty bundle history -> `[]`.
- [ ] **Step 2:** Run the spec; expect FAIL.
- [ ] **Step 3:** Implement the service method and controller route (`@Get(':id/maintenance-history')` declared before any conflicting `:id` routes only if route order matters in this controller; same guards as the other GETs).
- [ ] **Step 4:** Run `npx jest` and `npm run build`; PASS. Commit `feat(assets): bundle maintenance history endpoint`.

### Task 5: Target label in reports, history list and calendar

**Files:**
- Modify: `modules/reports/services/corrective-maintenance-report.service.ts`, `preventive-maintenance-report.service.ts`, `calibration-report.service.ts`, `modules/maintenance/services/maintenance.history.service.ts`, `modules/calendar/services/calendar.service.ts`

**Interfaces:**
- Consumes: `describeRequestTarget` (Task 1).
- Behavior: wherever these files emit a request's equipment/asset name (`machineEquipmentInstrument`, `equipmentName`, history item name), use `describeRequestTarget(request)`; their queries add `leftJoinAndSelect`/relations for `bundle` and `affectedComponents` (never inner joins; never `take`/`skip`/`getCount` over the new to-many join). Serial-number, campus, laboratory and every other column stay as they are (campus/lab still come from the anchor asset). `MaintenanceHistoryItem` gains `target: string` (additive; existing fields unchanged). For plain-asset requests the emitted text is identical to today's `assetName`.

- [ ] **Step 1: Write failing tests** only where a method can be mocked cheaply (e.g. the history service `findAll` mapping; the report row mapping if it is a pure mapper): plain request -> same name as before; COMPONENTS request -> `PC Set: Monitor, Mouse`; bundle-deleted request -> asset names. Where mapping is inline with query-builder code and not mockable, say so in the report and verify by diff reading plus build.
- [ ] **Step 2:** Run the new specs; expect FAIL.
- [ ] **Step 3:** Implement the changes at each site listed in the file structure (`grep -n "request.asset\|maintenanceRequest.asset"` in those files to find them), preserving CRLF and keeping hunks small.
- [ ] **Step 4:** Run `npx jest` and `npm run build`; PASS. Commit `feat(reports): show component/set target in reports, history and calendar`.

### Task 6: Bundle detail dialog with history timeline (frontend)

**Files:**
- Create: `pages/assets/components/bundle-detail-dialog.ts`
- Modify: `pages/assets/services/asset-bundle.service.ts`, `pages/assets/models/asset-bundle.model.ts`, `pages/assets/components/bundle-list.ts`, `pages/assets/assets.ts`

**Interfaces:**
- Consumes: `GET /asset-bundles/:id`, `GET /asset-bundles/:id/maintenance-history` (Task 4).
- Produces: `AssetBundleService.getBundleHistory(id: string): Observable<BundleHistoryItem[]>` with `BundleHistoryItem` mirroring the backend interface (dates as ISO strings); standalone `BundleDetailDialogComponent` (`selector: 'app-bundle-detail-dialog'`) with `@Input() visible: boolean`, `@Input() bundleId: string | null`, `@Output() visibleChange`, `@Output() requestMaintenance = new EventEmitter<{ bundleId: string; componentId?: string }>()`, `@Output() viewComponent = new EventEmitter<string>()` (component assetId). Content: header (bundle name, ID, property number, derived status tag with `n/m available`, lab, issued to); tab 1 Components (role, name, serial, status tag, condition, actions View Details / Request Maintenance / View Maintenance History); tab 2 Maintenance History timeline (date, target text, type, status tag, performed by), with a "Showing: <component>" chip and clear button when opened via a component's History action (client-side filter: items whose `components` include that assetId; items with `scope` `BUNDLE` always match). Loading and error states for both fetches. `bundle-list.ts` gets a "View" action per bundle row that emits `(view)` with the bundle ID; `assets.ts` hosts the dialog, wires `requestMaintenance` to its existing `onBundleRequestMaintenance`, and `viewComponent` to its existing asset `view(asset)` (look the asset up in `this.assets` by ID; if not found, show an info message).

- [ ] **Step 1:** Implement the service method/types, the dialog, and the wiring.
- [ ] **Step 2:** Verify `npx ng build --configuration development --output-path "$TEMP/lams-build"` passes and `git status --short` leaves `dist/` untouched. State plainly that nothing was exercised in a browser or against the API.
- [ ] **Step 3:** Commit `feat(assets): bundle detail dialog with maintenance history timeline` (frontend repo).

### Task 7: Component history and QR scan routing (frontend)

**Files:**
- Modify: `pages/assets/assets.ts` (asset `view()` history filter; `bundleId` query param), `layout/component/app.topbar.ts` (`searchAsset`, `buildAssetScanResultHtml`)

**Interfaces:**
- Consumes: `AssetBundleService.getBundles()`/`getBundle()` (phase 1), `MaintenanceUtils.describeMaintenanceTarget` (phase 2), the `bundle` object on assets from `GET /assets`.
- Behavior:
  - Asset view (`assets.ts` `view()`): the maintenance-history rows for an asset include requests where `m.asset?.assetId === id` OR `m.affectedComponents?.some(c => c.assetId === id)`; the history table shows the request's target text (`describeMaintenanceTarget`) in its asset/name cell where it lists the maintenance name today only if that table already has an asset-name column; do not widen the table otherwise. Components also show a "Part of <bundle name> (<bundleId>)" line in the detail table when `fullAsset.bundle` is set.
  - `assets.ts` reads a `bundleId` query param on init: when present, switch the view toggle to Bundles, load bundles, and open the detail dialog (Task 6) for that ID; unknown ID -> info message.
  - QR scan (`app.topbar.ts` `searchAsset`): keep the existing asset match first (property number, `qrCode`, serial). When an asset is found and has a `bundle`, the result dialog adds a "Part of <bundle name> (<bundleId>)" line and a deny/third button "Open set" that navigates to the assets page with `queryParams: { bundleId }`. When no asset matches, look up bundles (`getBundles()`) for a case-insensitive trimmed match on `bundleId` or `propertyNumber`; if found, show a result dialog with the bundle name, derived status and `n/m available`, a short component list, and an "Open set" button that navigates as above. If nothing matches, the existing "Asset Not Found" dialog is unchanged.

- [ ] **Step 1:** Implement the three behaviors. Find the assets page route in `pages/pages.routes.ts` for the navigation target (the existing code navigates to `/app/pages/crud`; use the route that actually renders `AssetsComponent` and confirm it reads query params).
- [ ] **Step 2:** Verify `ng build` as in Task 6. State plainly that scanning and navigation were not exercised.
- [ ] **Step 3:** Commit `feat(assets): component history and QR routing for sets` (frontend repo).

---

## Self-Review

- **Spec coverage (phase 3 + gaps from phase 2 review):** derived status already ships (phase 1 list); bundle history timeline -> Tasks 4 and 6; component history including set requests -> Tasks 3 and 7; reports/calendar/history list distinguishing component vs set -> Tasks 1 and 5 (spec 8, 10); QR behavior for bundle and component (spec 9) -> Task 7; Retired status seed and guard -> Task 2 (spec 6, 11). Not in phase 3: replace/remove/transfer/retire actions and the membership log (phase 4); "Convert to bundle" (phase 4); the full "restore only what this request flipped" fix, which needs a stored prior-status snapshot (schema change) and is left for a decision; the bundle-list wrench showing to roles the backend rejects (needs a product decision on who may request maintenance).
- **Type consistency:** `describeRequestTarget` strings (Task 1) match the frontend util; `BundleHistoryItem` (Task 4) matches the frontend type (Task 6); `mergeInvolvedRequests` (Task 3) is used by all three read paths.
- **Known risks:** Task 5 touches five large files with CRLF; Task 3 changes shared history reads; the Task 2 migration `down` deliberately refuses to delete a referenced status. All runtime behavior is unverified until the user runs the migrations on a non-shared database and the manual checks below.
- **Manual checks for the user after execution:** run the Retired migration on a backup/non-shared DB; request maintenance on a Retired asset (expect 400); view a component that only appears in a COMPONENTS request (history shows it); open a bundle's detail and its timeline (entries labeled "Monitor", "PC Set (entire set)", etc.), including after removing a component; check a corrective/preventive/calibration report row and the history page for a set request; scan a component QR (shows "Part of …" and "Open set"), a bundle ID/property number, and an unknown value; open `/…?bundleId=<id>` directly.
