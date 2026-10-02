# Asset Bundles, Phase 2 (Component-Targeted Maintenance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user request maintenance for one component, several components, or the entire set of a bundle, so that only the affected components change status and the request and its history attach to them.

**Architecture:** Maintenance requests keep a NOT NULL `asset` (an anchor component) and gain `scope`, a `bundle` snapshot, `takeBundleOffline`, and a `maintenance_request_components` join table listing affected components. A small service applies Serviceable/Unserviceable to the affected set, replacing the six single-asset status writes in the approval service. The frontend adds a scope-aware request dialog and shows the target (component, components, or entire set) wherever a request's asset is shown.

**Tech Stack:** Backend `capstone-backend`: NestJS 11, TypeORM 0.3, PostgreSQL, Jest. Frontend `lams-web-app`: Angular 20 standalone components, PrimeNG.

**Spec:** `lams-web-app/docs/superpowers/specs/2026-10-02-asset-bundles-design.md` (sections 3-4, 6, 7, 11, and **16 Amendment**, which overrides 4.3's "asset becomes nullable"). Phase 1 plan: `docs/superpowers/plans/2026-10-02-asset-bundles-phase1.md` (done).

## Global Constraints

- `maintenance_requests.asset` stays NOT NULL; multi-component and entire-set requests anchor on a component (spec 16). Nothing in the plan may make it nullable.
- `scope` enum values exactly `ASSET`, `COMPONENTS`, `BUNDLE`; default `ASSET`. `takeBundleOffline` boolean default false. `bundle` FK nullable, `ON DELETE SET NULL`. Join table name `maintenance_request_components` with columns `requestId`, `assetId`.
- The affected set is: `ASSET` scope -> `[asset]`; `COMPONENTS`/`BUNDLE` scope -> the join-table components; when `takeBundleOffline` is true -> all active components of `bundle`. "Active" = status is not `Retired` (Retired status itself arrives in phase 3; code must tolerate its absence).
- Components must belong to the stated bundle, to the requester's campus scope, and (for creation) not already be covered by a Pending/Approved request (spec 11 conflict rule extended to every affected component).
- Restoring a component to Serviceable must skip any component also covered by another active (Approved, Scheduled, In Progress) request (spec 16).
- Existing single-asset requests (no bundle) behave identically: scope `ASSET`, no join rows, same status writes (spec 15).
- Roles unchanged: whoever may create a maintenance request today may create these (`validateMaintenanceRequestCreation`).
- The dev database is remote and shared: no agent connects to it or runs migrations; migration is hand-written (timestamp `1789800000000`, name `AddMaintenanceRequestScope1789800000000`, modeled on `1789700000000-AddAssetBundles.ts`); verification is build + jest (backend) and `ng build` to a temp output path (frontend, never into the tracked `dist/`).
- Frontend: standalone components, `environment.apiUrl`, prettier printWidth 250 / tabWidth 4; repo files are CRLF, keep them (check `git diff --stat` for whole-file rewrites).

## Review Focus

- A COMPONENTS/BUNDLE request naming a component that already has a Pending/Approved request -> rejected, error names the component, nothing saved. Pinned in Task 3.
- Component IDs that are not members of the stated bundle, or belong to another campus -> 400/404, nothing saved. Pinned in Task 3.
- Entire-set request on a bundle with no active components, or `COMPONENTS` with an empty list -> 400. Pinned in Task 3.
- Complete/cancel restoring only components this request flipped, never one still covered by another active request. Pinned in Task 4.
- A plain single-asset request (no bundle) is unchanged end to end. Pinned in Tasks 3 and 4.
- A request whose bundle was later deleted (`bundle` is null) still displays sensibly. Pinned in Task 6.

---

## File Structure

Backend (`capstone-backend/src/modules/maintenance/`):
- `enum/request-scope.enum.ts` (create): `RequestScope`.
- `entities/maintenance.request.entity.ts` (modify): `scope`, `bundle`, `takeBundleOffline`, `affectedComponents`.
- `src/db/migrations/1789800000000-AddMaintenanceRequestScope.ts` (create, hand-written).
- `utils/request-targets.util.ts` (create): pure target resolution.
- `dto/create/create-maintenance.request.ts` (modify): optional scope fields.
- `services/maintenance.request.service.ts` (modify): `create`, read relations.
- `services/maintenance-asset-status.service.ts` (create): applies status to the affected set.
- `services/maintenance.approval.service.ts` (modify): six status writes -> the new service; read relations.
- the maintenance module file (modify): register the new provider.

Frontend (`lams-web-app/src/app/pages/`):
- `requestmaintenance/utils/maintenance.utils.ts` (modify): `describeMaintenanceTarget`.
- the declaration of `MaintenanceRequestPayload` (found by grep, in `service/maintenance.service.ts` or `models/`) (modify).
- `requestmaintenance/components/maintenance-table.component.ts`, `maintenance-detail-modal.component.ts`, `requestmaintenance/requestmaintenance/requestmaintenance.component.ts` (modify): show the target.
- `assets/components/maintenance-scope-dialog.ts` (create), `assets/assets.ts`, `assets/components/bundle-list.ts` (modify): scope-aware request flow.

---

### Task 1: Schema (enum, entity columns, join table, migration)

**Files:**
- Create: `enum/request-scope.enum.ts`, migration `1789800000000-AddMaintenanceRequestScope.ts`
- Modify: `entities/maintenance.request.entity.ts`

**Interfaces:**
- Produces: `export enum RequestScope { Asset = 'ASSET', Components = 'COMPONENTS', Bundle = 'BUNDLE' }`. On `MaintenanceRequest`: `scope: RequestScope` (enum column, default `ASSET`), `takeBundleOffline: boolean` (default false), `bundle: AssetBundle | null` (ManyToOne, column `bundle`, `onDelete: 'SET NULL'`, nullable), `affectedComponents: Assets[]` (ManyToMany with `@JoinTable({ name: 'maintenance_request_components', joinColumn: { name: 'requestId' }, inverseJoinColumn: { name: 'assetId' } })`; the join table has no extra columns).

- [ ] **Step 1:** Add the enum, the entity columns and relations as described; give the new FK/PK constraints explicit names in the style of `asset-bundle.entity.ts`.
- [ ] **Step 2:** Hand-write the migration: create enum type, add the three columns to `maintenance_requests`, create `maintenance_request_components` with a composite PK and FKs (requestId -> `maintenance_requests.requestId` `ON DELETE CASCADE`, assetId -> `assets.assetId` `ON DELETE CASCADE`); `down` reverses `up` exactly.
- [ ] **Step 3:** Verify `npm run build` and `npx jest` pass. State in the report that the migration is untested against a database.
- [ ] **Step 4:** Commit `feat(maintenance): add request scope, bundle snapshot and affected components` (backend repo).

### Task 2: Pure target resolution

**Files:**
- Create: `utils/request-targets.util.ts`
- Test: `utils/request-targets.util.spec.ts`

**Interfaces:**
- Produces: `export interface TargetInput { scope: RequestScope; assetId?: string; componentIds?: string[]; bundleActiveIds: string[]; takeBundleOffline: boolean }`; `export interface ResolvedTargets { anchorAssetId: string; affectedAssetIds: string[]; statusAssetIds: string[] }`; `export function resolveRequestTargets(input: TargetInput): ResolvedTargets`; throws `Error` with these messages: `assetId is required for ASSET scope`, `componentIds must not be empty for COMPONENTS scope`, `bundle has no active components` (BUNDLE scope with empty `bundleActiveIds`), `component <id> is not an active member of the bundle`.
- Rules: `ASSET` -> anchor = `assetId`, affected = `[assetId]`; `COMPONENTS` -> anchor = first of `componentIds`, affected = `componentIds` (all must be in `bundleActiveIds`); `BUNDLE` -> anchor = first of `bundleActiveIds`, affected = `bundleActiveIds`. `statusAssetIds` = `bundleActiveIds` when `takeBundleOffline` else `affectedAssetIds`. Duplicate IDs are collapsed, order preserved.

- [ ] **Step 1: Write failing tests:** (a) ASSET scope -> anchor/affected/status all `['A1']`; (b) COMPONENTS `['M','K']` of bundle `['S','M','K','X']` -> anchor `M`, affected `['M','K']`, status `['M','K']`; (c) same with `takeBundleOffline` -> status `['S','M','K','X']`; (d) BUNDLE -> anchor `S`, affected = all four; (e) BUNDLE with `bundleActiveIds: []` throws `bundle has no active components`; (f) COMPONENTS with `[]` throws `componentIds must not be empty for COMPONENTS scope`; (g) COMPONENTS naming `Z` not in the bundle throws `component Z is not an active member of the bundle`; (h) duplicates `['M','M']` collapse to `['M']`.
- [ ] **Step 2:** Run `npx jest src/modules/maintenance/utils/request-targets.util.spec.ts`; expect FAIL.
- [ ] **Step 3:** Implement `resolveRequestTargets` per the rules above.
- [ ] **Step 4:** Re-run; expect PASS. Commit `feat(maintenance): add request target resolution util`.

### Task 3: Create flow (DTO, validation, persistence)

**Files:**
- Modify: `dto/create/create-maintenance.request.ts`, `services/maintenance.request.service.ts` (the `create` method), maintenance module (inject `AssetBundle` repository if needed)
- Test: `services/maintenance.request.service.create.spec.ts` (mock style: see `assets.service.create.spec.ts` in the assets module)

**Interfaces:**
- Consumes: `resolveRequestTargets` (Task 2), `RequestScope`, new entity columns (Task 1).
- Produces: `CreateMaintenanceRequestDto` gains `scope?: RequestScope` (`@IsEnum`, `@IsOptional`), `bundle?: string` (`@IsString`, `@IsOptional`), `components?: string[]` (`@IsArray`, `@IsString({ each: true })`, `@IsOptional`), `takeBundleOffline?: boolean` (`@IsBoolean`, `@IsOptional`). `asset` stays required (for `COMPONENTS`/`BUNDLE` the frontend sends the first component; the server recomputes the anchor and ignores a mismatched value).
- Behavior of `create`: with no `scope` or `ASSET` and an asset not in a bundle, behavior is exactly today's. Otherwise: load the bundle (campus-scoped; not found -> `NotFoundException`), load its active components, call `resolveRequestTargets` (translate its errors to `BadRequestException`), check every affected component belongs to the requester's campus scope via `validateMaintenanceRequestCreation`, reject with `ConflictException` naming the component if ANY affected component already has a Pending/Approved request (via direct `asset` match or the join table), then save the request with `scope`, `bundle` (also set for `ASSET` scope when the asset has a bundle), `takeBundleOffline`, `asset = anchor`, and `affectedComponents` for `COMPONENTS`/`BUNDLE`. Activity log text names the target (component name, or bundle name + "entire set").

- [ ] **Step 1: Write failing tests** with mocked repositories: (a) plain asset, no scope -> saved with scope `ASSET`, `bundle` null, no `affectedComponents`; (b) asset that is a bundle component, scope `ASSET` -> `bundle` snapshot set, one anchor; (c) `COMPONENTS` of two members -> anchor first, `affectedComponents` both, `bundle` set; (d) `BUNDLE` -> all active components affected; (e) a component with an active Pending request -> `ConflictException` whose message contains that component's asset name or ID, nothing saved; (f) component not in the bundle -> `BadRequestException`, nothing saved; (g) bundle in another campus -> `NotFoundException`; (h) `BUNDLE` with no active components -> `BadRequestException`.
- [ ] **Step 2:** Run the spec; expect FAIL.
- [ ] **Step 3:** Implement the DTO fields and the `create` changes; keep the single-asset code path textually unchanged where possible.
- [ ] **Step 4:** Run `npx jest` (all) and `npm run build`; expect PASS. Commit `feat(maintenance): create component- and set-scoped maintenance requests`.

### Task 4: Status propagation for the affected set

**Files:**
- Create: `services/maintenance-asset-status.service.ts`
- Modify: `services/maintenance.approval.service.ts` (the six single-asset status writes at the approve (~251), confirm-schedule/start (~805), start (~913), update-complete (~380), complete (~1187) and cancel (~1277) sites), maintenance module (register provider)
- Test: `services/maintenance-asset-status.service.spec.ts`

**Interfaces:**
- Consumes: `resolveRequestTargets`-style semantics (statusAssetIds rules), entity columns (Task 1).
- Produces: `@Injectable() MaintenanceAssetStatusService` with `async setStatusForRequest(request: MaintenanceRequest, statusName: 'Serviceable' | 'Unserviceable'): Promise<void>`. It resolves the status set from the request (`takeBundleOffline` -> all non-Retired components of `request.bundle`; else `affectedComponents` when non-empty; else `[request.asset]`). For `Unserviceable` it sets every asset in the set. For `Serviceable` it sets each asset EXCEPT those also covered by another request (different `requestId`) whose status name is `Approved`, `Scheduled` or `In Progress`.
- The six call sites each become one call to `setStatusForRequest(request, '<name>')`; surrounding status/approval logic is unchanged. Requests must be loaded with `bundle` and `affectedComponents` at those sites (add the relations to the finds that load `maintenanceRequest`).

- [ ] **Step 1: Write failing tests** (mock repositories): (a) plain request -> only `request.asset` saved with the new status (identical to old behavior); (b) COMPONENTS request, Unserviceable -> exactly the listed components saved, others untouched; (c) `takeBundleOffline` -> all non-Retired bundle components saved; (d) Serviceable restore skips a component covered by another In Progress request and restores the others; (e) Serviceable restore of a component with only Completed/Cancelled other requests -> restored; (f) missing status row (`Serviceable` not found) -> no writes, no throw (matches current silent behavior).
- [ ] **Step 2:** Run the spec; expect FAIL.
- [ ] **Step 3:** Implement the service, register it, and replace the six blocks. Add `bundle` and `affectedComponents` to the relation lists/query-builder joins that feed those six methods.
- [ ] **Step 4:** Run `npx jest` and `npm run build`; PASS. Confirm by grep that no `maintenanceRequest.asset.status =` assignments remain in the approval service. Commit `feat(maintenance): propagate status changes to the affected component set`.

### Task 5: Read-side relations

**Files:**
- Modify: `services/maintenance.request.service.ts` (list and detail finds), `services/maintenance.approval.service.ts` (`findAll`, `findByStatus`, `findOne`, `findInProgressAndOnHold`, `findByAsset` relation lists and query-builder joins)

**Interfaces:**
- Produces: every list/detail response for requests and approvals includes `maintenanceRequest.bundle` (id and name), `maintenanceRequest.scope`, `maintenanceRequest.takeBundleOffline`, and `maintenanceRequest.affectedComponents` (id, asset name, `componentRole`).

- [ ] **Step 1:** Add the relations/joins (use `leftJoinAndSelect` in query-builder paths so rows without them are kept).
- [ ] **Step 2:** Run `npx jest` and `npm run build`; PASS. Add or extend a unit test only where an existing spec already covers these finds; otherwise state in the report that these paths are verified by build only.
- [ ] **Step 3:** Commit `feat(maintenance): load bundle scope data in request and approval reads`.

### Task 6: Frontend target display

**Files:**
- Modify: `requestmaintenance/utils/maintenance.utils.ts`, the `MaintenanceRequestPayload` declaration, `requestmaintenance/components/maintenance-table.component.ts`, `requestmaintenance/components/maintenance-detail-modal.component.ts`, `requestmaintenance/requestmaintenance/requestmaintenance.component.ts`

**Interfaces:**
- Produces: `MaintenanceUtils.describeMaintenanceTarget(request: any): string` with these outputs: `ASSET` scope with no bundle -> asset name; `ASSET` scope with bundle -> `<asset name> (<bundle name>)`; `COMPONENTS` -> `<bundle name>: <componentRole or asset name>, ...` (comma-joined); `BUNDLE` -> `<bundle name> (entire set)`; when `bundle` is null but scope is not `ASSET` (bundle deleted) -> the comma-joined affected asset names, or the anchor asset name if none; missing request -> `N/A`. `MaintenanceRequestPayload` gains optional `scope`, `bundle`, `components`, `takeBundleOffline`.
- Display rule: wherever a request's asset name is shown (table Asset column, detail modal Asset line, main page asset column) show `describeMaintenanceTarget(request)`; search filters that match on asset name also match the target text.

- [ ] **Step 1:** Implement the util and payload type; apply it at the three display sites.
- [ ] **Step 2:** Verify `npx ng build --configuration development --output-path "$TEMP/lams-build"` passes (never into `dist/`; confirm `git status --short` leaves `dist/` untouched). No Karma specs exist in this repo; state that the util was checked by reading its cases against the output list above (and add a small `maintenance.utils.spec.ts` only if Karma already runs in this repo).
- [ ] **Step 3:** Commit `feat(maintenance): show component/set target on maintenance requests` (frontend repo).

### Task 7: Scope-aware request dialog

**Files:**
- Create: `assets/components/maintenance-scope-dialog.ts`
- Modify: `assets/assets.ts` (existing `openRequestDialog` / `submitMaintenanceRequest` flow), `assets/components/bundle-list.ts`

**Interfaces:**
- Consumes: `AssetBundleService.getBundle(id)` (phase 1), `MaintenanceUtils` payload type (Task 6), existing request form fields (name, type, service, priority, reason) from `assets.ts`.
- Produces: standalone `MaintenanceScopeDialogComponent` (`selector: 'app-maintenance-scope-dialog'`) with `@Input() visible: boolean`, `@Input() asset: any` (the asset the user clicked, with `bundle` if it is a component), `@Input() bundleId: string | null` (set when launched from a bundle row), `@Output() visibleChange`, `@Output() scopeChosen = new EventEmitter<{ scope: 'ASSET' | 'COMPONENTS' | 'BUNDLE'; bundle?: string; components?: string[]; takeBundleOffline: boolean }>()`. It loads the bundle's components, shows a radio group (This component only / Selected components / Entire set), a component checklist (active components with status tag) shown for "Selected components", and a "Take the whole set offline during maintenance" checkbox (hidden for "This component only" with a plain asset). It emits `scopeChosen` and closes; it does not submit the request itself.
- Wiring: in `assets.ts`, when the clicked asset has a `bundle`, open the scope dialog first and then continue into the existing request form with `scope`, `bundle`, `components`, `takeBundleOffline` merged into the payload (and `asset` set to the first selected component or the clicked asset); plain assets skip the scope dialog entirely and behave as today. In `bundle-list.ts`, add a "Request Maintenance" action to each bundle row (opens the scope dialog with `bundleId`, defaulting to "Entire set") and to each component row (defaults to "This component only"), emitting an output that `assets.ts` handles with the same flow. Roles: show these actions to the same roles that see the existing wrench button (`!isSuperAdmin`).

- [ ] **Step 1:** Implement the dialog, the `assets.ts` wiring and the `bundle-list.ts` actions.
- [ ] **Step 2:** Verify `ng build` as in Task 6. Report plainly that nothing was exercised in a browser or against the API (the manual walkthrough in the Self-Review is for the user).
- [ ] **Step 3:** Commit `feat(assets): choose component or set scope when requesting maintenance` (frontend repo).

---

## Self-Review

- **Spec coverage (phase 2 + amendment 16):** scope/bundle/takeBundleOffline/join table -> Task 1; component and set targeting, conflict and membership rules -> Tasks 2 and 3; status propagation and safe restore -> Task 4; response data for the UI -> Task 5; display of component vs set -> Task 6; request entry points from the asset list and bundle list -> Task 7. Not in phase 2 (by the spec's phase table): bundle history timeline and labels in reports/calendar (phase 3), Retired status seed, replace/remove/transfer actions (phase 4). Calendar and dashboards will show the anchor component's name for set-scope requests until phase 3.
- **Type consistency:** `RequestScope` values (`ASSET`, `COMPONENTS`, `BUNDLE`) are the same strings in the entity (Task 1), util input (Task 2), DTO (Task 3), `describeMaintenanceTarget` (Task 6) and the dialog output (Task 7). `statusAssetIds` rules in Task 2 match `setStatusForRequest` in Task 4.
- **Known risks:** Task 4 edits six places in a 1300-line service; the grep in Task 4 step 4 is the guard. Task 1's migration and all runtime behavior are unverified until the user runs the migration and the manual checks below.
- **Manual checks for the user after execution:** run the migration on a backup or non-shared database; create a request for one component, two components, and the entire set; approve, start and complete each and confirm only the affected components change status and unrelated components stay Serviceable; start two overlapping requests on one component and confirm completing one does not restore it while the other is active; confirm a plain asset request is unchanged; confirm the request list shows the right target text.
