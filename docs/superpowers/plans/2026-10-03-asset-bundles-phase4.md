# Asset Bundles, Phase 4 (Lifecycle Actions and Conversion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a LabTech manage a bundle's components over time (add, remove, transfer, replace, retire), convert an existing set-like asset into a real bundle, see an audit trail of membership changes, print a set's QR label, and stop a set's repair from overwriting components that were already broken.

**Architecture:** New membership operations on `AssetBundlesService` (each atomic, campus-scoped, LabTech-only, blocked when a component is covered by an active maintenance request) write rows to a new `bundle_membership_log`. Retire/replace use the `Retired` status from phase 3 plus two new asset columns. "Convert" builds a bundle from a legacy asset, retires the legacy asset and re-points its maintenance history to the new bundle. A request now remembers which assets it took offline so completing or cancelling restores only those. The frontend adds an action menu and small dialogs on the bundle detail dialog, a "Convert to set" action on the asset list, a Changes tab, and a QR print button.

**Tech Stack:** Backend `capstone-backend`: NestJS 11, TypeORM 0.3, PostgreSQL, Jest. Frontend `lams-web-app`: Angular 20 standalone components, PrimeNG; one new npm dependency `qrcode` for Task 10.

**Spec:** `lams-web-app/docs/superpowers/specs/2026-10-02-asset-bundles-design.md` (sections 3, 4.2, 4.5, 8, 9, 11, 13 phase 4, 15, 16). Earlier plans: phases 1-3 (done).

## Global Constraints

- All membership mutations require `Role.LabTech` + `PermissionsService.validateAssetService`, are campus-scoped (`getCampusWhereClause`; out-of-scope bundle or asset -> `NotFoundException`), and never move an asset across campuses (add/transfer require the same campus as the bundle).
- **Blocking rule (spec 11):** remove, transfer, retire, replace and convert are rejected with `ConflictException` (message names the component/asset and the request ID) when the asset is covered by a request whose status name is `Pending`, `Approved`, `Scheduled`, `In Progress` or `On Hold`, either as the request's `asset` (anchor) or in its `affectedComponents`. Nothing may be changed when blocked.
- `bundle_membership_log.action` is a plain `varchar` (no PostgreSQL enum) with values exactly `JOINED`, `REMOVED`, `TRANSFERRED`, `REPLACED`, `RETIRED`, `CONVERTED`.
- Activity logging uses the existing `ActionType.ASSET_UPDATED` / `ASSET_CREATED` with descriptive text; do NOT add enum values (the `activities` enums are PostgreSQL enums and need heavy migrations).
- Retire: status `Retired` (statusId `ASTAT003`, phase 3), `retiredAt = now()`, the component stays in its bundle (greyed, excluded from derived status). Replace: old component -> Retired + `retiredAt` + `replacedByAssetId = <new>` + `bundle = null`; new component keeps the old `componentRole` and joins the bundle. Bundle delete rules from phase 1 are unchanged.
- Convert: legacy asset must be standalone (`bundle` null), not Retired, not blocked. New bundle copies `bundleName` (overridable), `propertyNumber`, campus, laboratory, `issuedTo`, `acquisitionDate`; components inherit program, supplier, category, laboratory and the legacy ICS `icsNo`; legacy asset -> Retired with `retiredAt`; the legacy asset's maintenance requests get `bundle = <new bundle>` so they appear on the bundle's timeline; log `CONVERTED` for the legacy asset and `JOINED` for each new component.
- Restore rule (Task 7): `maintenance_requests.offlineAssetIds` (jsonb, nullable; null = legacy behavior). Marking assets Unserviceable records those that were NOT already Unserviceable; a Serviceable restore of a multi-asset request with a non-null list restores only listed assets (still subject to the existing "another active request holds it" guard). Plain single-asset requests keep their exact old path (spec 15).
- Migrations are hand-written (timestamps `1790000000000` for Task 1, `1790100000000` for Task 7; model on `1789700000000-AddAssetBundles.ts`); the dev DB is remote/shared, so no agent connects to it or runs migrations; verification is `npx jest` + `npm run build` (backend) and `ng build` to a temp output path, never the tracked `dist/` (frontend). Preserve CRLF line endings in large service files (check `git diff --stat`).
- Frontend: standalone components, `environment.apiUrl`, prettier printWidth 250 / tabWidth 4; escape any user data placed into HTML strings with `AssetUtils.escapeHtml`; mutations are shown only to LabTech (same role check style as the bundle delete button).

## Review Focus

- Any lifecycle action on a component covered by an active request -> 409 naming the request; nothing changed. Pinned in Tasks 3, 4, 5.
- Transfer/add to a bundle in another campus, or to a non-existent bundle -> error; the component keeps its current bundle. Pinned in Task 3.
- Replace is atomic: if creating the new component fails (e.g. duplicate serial) the old component is untouched. Pinned in Task 4.
- Convert on an asset already in a bundle, already Retired, or blocked -> rejected; a failure leaves no partial bundle or half-retired asset. Pinned in Task 5.
- After a set repair, a component that was already Unserviceable before the request stays Unserviceable. Pinned in Task 7.
- The membership log shows who did what and survives asset/bundle deletion of the referenced rows without errors. Pinned in Tasks 1 and 6.

---

## File Structure

Backend (`capstone-backend/src/`):
- `modules/assets/entities/bundle-membership-log.entity.ts` (create); `modules/assets/entities/assets.entity.ts` (modify: `retiredAt`, `replacedByAssetId`); `db/migrations/1790000000000-AddBundleLifecycle.ts` (create).
- `modules/assets/utils/blocking-requests.util.ts` (+ spec) (create): shared blocking query helper.
- `modules/assets/services/asset-bundles.service.ts` and `controllers/asset-bundles.controller.ts` (modify): add/remove/transfer, replace/retire, convert, membership-log read; DTOs under `modules/assets/dto/` (create).
- `modules/maintenance/entities/maintenance.request.entity.ts`, `services/maintenance-asset-status.service.ts` (+ spec), `db/migrations/1790100000000-AddOfflineAssetIds.ts` (modify/create): restore only what was flipped.

Frontend (`lams-web-app/src/app/pages/assets/`):
- `models/asset-bundle.model.ts`, `services/asset-bundle.service.ts` (modify): new calls/types.
- `components/bundle-component-actions.ts` (create): action menu + dialogs; `components/bundle-detail-dialog.ts` (modify): menu + Changes tab + QR print button.
- `components/convert-to-bundle-dialog.ts` (create), `assets.ts` (modify): "Convert to set" row action.
- `services/bundle-qr-print.service.ts` (create), `package.json` (modify: `qrcode`).

---

### Task 1: Lifecycle schema (assets columns, membership log, migration)

**Files:**
- Create: `entities/bundle-membership-log.entity.ts`, migration `1790000000000-AddBundleLifecycle.ts`
- Modify: `entities/assets.entity.ts`, `assets.module.ts` (`forFeature`)

**Interfaces:**
- Produces: `Assets.retiredAt: Date | null` (timestamptz, nullable), `Assets.replacedByAssetId: string | null` (varchar(20), nullable, self FK `ON DELETE SET NULL`, explicit constraint name). Entity `BundleMembershipLog` (table `bundle_membership_log`): `id` (uuid PK, generated), `asset` (ManyToOne `Assets`, column `asset`, `ON DELETE CASCADE`), `fromBundle` and `toBundle` (ManyToOne `AssetBundle`, columns `fromBundle`/`toBundle`, nullable, `ON DELETE SET NULL`), `action` (varchar(20)), `reason` (text, nullable), `actor` (ManyToOne `User`, column `actor`, nullable, `ON DELETE SET NULL`), `createdAt` (timestamptz, default now). Export `export type MembershipAction = 'JOINED' | 'REMOVED' | 'TRANSFERRED' | 'REPLACED' | 'RETIRED' | 'CONVERTED'` from the entity file.

- [ ] **Step 1:** Add the columns, entity and module registration; give all new constraints explicit names in the style of `asset-bundle.entity.ts`.
- [ ] **Step 2:** Hand-write the migration (`up` adds the two `assets` columns + FK and creates the log table with its FKs and an index on `("asset")` and on `("fromBundle")`/`("toBundle")` only if TypeORM would generate them; compute any default-hash names with `DefaultNamingStrategy` in a throwaway node script rather than inventing them; `down` reverses `up` exactly).
- [ ] **Step 3:** `npm run build` and `npx jest` pass. State that the migration is untested against a database. Commit `feat(assets): add bundle lifecycle schema and membership log` (backend repo).

### Task 2: Blocking-request helper

**Files:**
- Create: `modules/assets/utils/blocking-requests.util.ts`
- Test: `modules/assets/utils/blocking-requests.util.spec.ts`

**Interfaces:**
- Produces: `export const BLOCKING_REQUEST_STATUSES = ['Pending', 'Approved', 'Scheduled', 'In Progress', 'On Hold'] as const`; `export async function findBlockingRequest(requestRepo: Repository<MaintenanceRequest>, assetId: string): Promise<{ requestId: string; statusName: string } | null>` returning the first request in a blocking status where `asset = assetId` OR the asset is in `affectedComponents` (left join, parameterized); `export function assertNotBlocked(blocking: { requestId: string; statusName: string } | null, assetLabel: string): void` throwing `ConflictException(\`${assetLabel} has an active maintenance request (${requestId}, ${statusName})\`)`.

- [ ] **Step 1: Write failing tests** with a mocked repository/query builder (style of `request-involvement.spec.ts`): (a) request on the anchor -> returned; (b) request only via `affectedComponents` -> returned; (c) only Completed/Cancelled/Declined requests -> `null`; (d) `assertNotBlocked(null, 'x')` does not throw; (e) `assertNotBlocked({requestId:'R1',statusName:'On Hold'}, 'Monitor')` throws `ConflictException` whose message contains `Monitor`, `R1` and `On Hold`.
- [ ] **Step 2:** Run the spec; expect FAIL. **Step 3:** Implement. **Step 4:** `npx jest` + `npm run build` PASS. Commit `feat(assets): add blocking-request helper for lifecycle actions`.

### Task 3: Add, remove and transfer components

**Files:**
- Create: DTOs `dto/bundle-component-ops.dto.ts` (`AddComponentsDto`, `TransferComponentDto`, `ComponentReasonDto`)
- Modify: `services/asset-bundles.service.ts`, `controllers/asset-bundles.controller.ts`
- Test: `services/asset-bundles.service.membership.spec.ts`

**Interfaces:**
- Consumes: `findBlockingRequest`/`assertNotBlocked` (Task 2), `BundleMembershipLog` (Task 1), `findScoped` (existing).
- Produces: `AddComponentsDto { assetIds: string[] (non-empty, IsString each); componentRoles?: Record<string, string>; reason?: string }`; `TransferComponentDto { toBundleId: string; reason?: string }`; `ComponentReasonDto { reason?: string }`. Service methods (all return the refreshed `BundleResponse` of the bundle named by `id`): `addComponents(bundleId: string, dto: AddComponentsDto, user: User)`, `removeComponent(bundleId: string, assetId: string, dto: ComponentReasonDto, user: User)`, `transferComponent(bundleId: string, assetId: string, dto: TransferComponentDto, user: User)`. Routes (all `@Roles(Role.LabTech)`): `POST /asset-bundles/:id/components`, `DELETE /asset-bundles/:id/components/:assetId` (reason in body), `POST /asset-bundles/:id/components/:assetId/transfer`. Rules: add requires each asset to be standalone (`bundle` null), not Retired, same campus as the bundle, not blocked; sets `bundle` and optional `componentRole`; logs `JOINED` (toBundle). Remove requires the asset to belong to `bundleId` and not be blocked; clears `bundle` (and keeps `componentRole` for reference); logs `REMOVED` (fromBundle). Transfer requires membership of `bundleId`, `toBundleId` in the same campus and different from `bundleId`, not blocked; moves the asset; logs `TRANSFERRED` (from and to). Each operation is one transaction (log row + asset update); all log rows carry `actor` = current user and the optional `reason`; activity log text via `ActionType.ASSET_UPDATED`.

- [ ] **Step 1: Write failing tests** (mocked repos/transaction, style of `asset-bundles.service.spec.ts`): add (a) standalone assets join and log JOINED; (b) an asset already in a bundle -> `BadRequestException`, nothing changed; (c) a Retired asset -> `BadRequestException`; (d) an asset in another campus -> `NotFoundException`/`BadRequestException`, nothing changed; (e) blocked asset -> `ConflictException` naming the request, nothing changed; remove (f) not a member -> `NotFoundException`; (g) blocked -> `ConflictException`; (h) success clears `bundle`, logs REMOVED; transfer (i) target bundle in another campus or missing -> error and the asset keeps its bundle; (j) same bundle -> `BadRequestException`; (k) success logs TRANSFERRED with from/to; (l) out-of-scope source bundle -> `NotFoundException`.
- [ ] **Step 2:** Run the spec; expect FAIL. **Step 3:** Implement service methods, DTOs and routes (declare the sub-routes so they cannot be shadowed by `:id`). **Step 4:** `npx jest` + `npm run build` PASS. Commit `feat(assets): add, remove and transfer bundle components`.

### Task 4: Replace and retire a component

**Files:**
- Modify: `services/asset-bundles.service.ts`, `controllers/asset-bundles.controller.ts`; create `dto/replace-component.dto.ts`
- Test: `services/asset-bundles.service.lifecycle.spec.ts`

**Interfaces:**
- Consumes: Tasks 1-3, `AssetsService.createWithManager` and `announceAssetsCreated` (phase 1), `CreateBundleComponentDto` (phase 1), `toComponentAssetDto`/`assertComponentSerials` (existing private helpers).
- Produces: `ReplaceComponentDto { component: CreateBundleComponentDto (assetName, componentRole, serialNumber, optional brand/color/modelNumber/unitCost/condition/propertyNumber); reason?: string }`; `RetireComponentDto { reason?: string }`. Service: `replaceComponent(bundleId, assetId, dto, user): Promise<BundleResponse>`, `retireComponent(bundleId, assetId, dto, user): Promise<BundleResponse>`. Routes (`@Roles(Role.LabTech)`): `POST /asset-bundles/:id/components/:assetId/replace`, `POST /asset-bundles/:id/components/:assetId/retire`. Replace: one transaction -> create the new component (bundle + role from the dto, falling back to the old role) via `createWithManager(..., { manager, bundleId, componentRole })`; old component -> status `Retired`, `retiredAt`, `replacedByAssetId`, `bundle = null`; log `REPLACED` (old, fromBundle) and `JOINED` (new, toBundle); call `announceAssetsCreated` after commit. Retire: status `Retired` + `retiredAt`, stays in the bundle; log `RETIRED`. Both blocked per Global Constraints; the old/target must belong to `bundleId`; a missing `Retired` status row -> `NotFoundException('Status "Retired" not found')` before any write.

- [ ] **Step 1: Write failing tests:** replace (a) success: new component created with bundle/role, old retired and detached, two log rows, announce called after commit; (b) duplicate serial (createWithManager rejects) -> old component untouched, no log rows, announce not called; (c) blocked old component -> `ConflictException`, nothing created; (d) old asset not in the bundle -> `NotFoundException`; retire (e) success sets Retired + retiredAt, stays in bundle, logs RETIRED; (f) already Retired -> `BadRequestException`; (g) blocked -> `ConflictException`; (h) missing Retired status row -> `NotFoundException`, no writes.
- [ ] **Step 2:** Run the spec; expect FAIL. **Step 3:** Implement. **Step 4:** `npx jest` + `npm run build` PASS. Commit `feat(assets): replace and retire bundle components`.

### Task 5: Convert a legacy asset into a bundle

**Files:**
- Modify: `services/asset-bundles.service.ts`, `controllers/asset-bundles.controller.ts`; create `dto/convert-to-bundle.dto.ts`
- Test: `services/asset-bundles.service.convert.spec.ts`

**Interfaces:**
- Produces: `ConvertToBundleDto { assetId: string; bundleName?: string; components: CreateBundleComponentDto[] (non-empty; one serial each); reason?: string }`; `AssetBundlesService.convertAsset(dto: ConvertToBundleDto, user: User): Promise<BundleResponse>`; route `POST /asset-bundles/convert` (`@Roles(Role.LabTech)`, declared before `:id` routes). Behavior per Global Constraints "Convert": loads the legacy asset campus-scoped with `inventoryCustodianSlip`, `program`, `laboratories`, `status`; rejects (`BadRequestException`) when it already belongs to a bundle or is Retired; `ConflictException` when blocked; rejects duplicate serials across `dto.components` before the transaction (same helper as create); then in ONE transaction creates the bundle, creates the components (inheriting program, supplier, category, laboratory, icsNo from the legacy asset), retires the legacy asset, re-points its requests (`UPDATE maintenance_requests SET bundle = :new WHERE asset = :legacy`), and writes `CONVERTED` + `JOINED` log rows; `announceAssetsCreated` after commit.

- [ ] **Step 1: Write failing tests:** (a) success: bundle fields copied from the legacy asset, components created with inherited fields, legacy retired, requests re-pointed (assert the update call), log rows CONVERTED + one JOINED per component; (b) legacy already in a bundle -> `BadRequestException`, no transaction work; (c) legacy Retired -> `BadRequestException`; (d) blocked legacy -> `ConflictException`; (e) duplicate serials in `components` -> `BadRequestException` before any transaction; (f) component creation fails mid-way -> error propagates and nothing is announced (the mocked transaction rolled back); (g) legacy asset in another campus -> `NotFoundException`.
- [ ] **Step 2:** Run the spec; expect FAIL. **Step 3:** Implement. **Step 4:** `npx jest` + `npm run build` PASS. Commit `feat(assets): convert a legacy asset into a bundle`.

### Task 6: Membership log read endpoint

**Files:**
- Modify: `services/asset-bundles.service.ts`, `controllers/asset-bundles.controller.ts`
- Test: `services/asset-bundles.service.log.spec.ts`

**Interfaces:**
- Produces: `export interface MembershipLogItem { id: string; action: MembershipAction; assetId: string; assetName: string; componentRole: string | null; fromBundleId: string | null; toBundleId: string | null; reason: string | null; actorName: string | null; createdAt: Date }`; `AssetBundlesService.getMembershipLog(bundleId: string, user: User): Promise<MembershipLogItem[]>`; route `GET /asset-bundles/:id/membership-log` (read roles as other bundle GETs; declared before `:id`). Returns rows where `fromBundle = id` OR `toBundle = id`, newest first; `actorName` = full name or `userName`, `null` when the actor was deleted; campus-scoped via `findScoped`.

- [ ] **Step 1: Write failing tests:** (a) rows for the bundle in either direction, newest first, mapped fields; (b) actor deleted -> `actorName` null; (c) other-campus bundle -> `NotFoundException` and the log repository is never queried; (d) empty -> `[]`.
- [ ] **Step 2:** Run the spec; expect FAIL. **Step 3:** Implement. **Step 4:** `npx jest` + `npm run build` PASS. Commit `feat(assets): bundle membership log endpoint`.

### Task 7: Restore only what the request took offline

**Files:**
- Create: migration `1790100000000-AddOfflineAssetIds.ts`
- Modify: `modules/maintenance/entities/maintenance.request.entity.ts`, `modules/maintenance/services/maintenance-asset-status.service.ts`
- Test: `modules/maintenance/services/maintenance-asset-status.service.spec.ts` (extend)

**Interfaces:**
- Produces: `MaintenanceRequest.offlineAssetIds: string[] | null` (jsonb, nullable, default null). In `setStatusForRequest(request, 'Unserviceable')` for MULTI-ASSET requests (`takeBundleOffline || affectedComponents?.length`): compute the status set as today, record into `request.offlineAssetIds` the IDs of assets whose status was not already `Unserviceable`, persist the request (merge with any existing list), then flip only... all set members to Unserviceable as today. For `'Serviceable'` on a multi-asset request: when `offlineAssetIds` is non-null, restore only assets in that list (intersected with the set and still subject to the existing "another active request holds it" guard); when null (legacy rows) behave exactly as before. Plain / ASSET-scope-without-offline requests are untouched (spec 15).

- [ ] **Step 1: Write failing tests:** (a) Unserviceable on a COMPONENTS request where one component is already Unserviceable -> `offlineAssetIds` excludes it and the request is saved with the list; (b) Serviceable restore with that list restores only the listed components; (c) Serviceable with `offlineAssetIds: null` behaves as before (all non-held assets); (d) plain request path unchanged (no request save, no list); (e) calling Unserviceable twice (approve, then start) keeps the ids recorded by the first call (the second call sees them already Unserviceable and must not drop or re-classify them as 'already broken'), with no duplicates; (f) restore still skips an asset held by another active request even if listed.
- [ ] **Step 2:** Run the spec; expect FAIL. **Step 3:** Implement; hand-write the migration (`ALTER TABLE "maintenance_requests" ADD "offlineAssetIds" jsonb`; `down` drops the column). **Step 4:** `npx jest` + `npm run build` PASS; state the migration is untested against a database. Commit `fix(maintenance): restore only assets a request took offline`.

### Task 8: Component actions and Changes tab (frontend)

**Files:**
- Create: `components/bundle-component-actions.ts`
- Modify: `models/asset-bundle.model.ts`, `services/asset-bundle.service.ts`, `components/bundle-detail-dialog.ts`, `assets.ts` (only if needed to refresh lists)

**Interfaces:**
- Consumes: Task 3-6 routes.
- Produces: `AssetBundleService`: `addComponents(bundleId: string, body: { assetIds: string[]; componentRoles?: Record<string, string>; reason?: string })`, `removeComponent(bundleId: string, assetId: string, body: { reason?: string })`, `transferComponent(bundleId: string, assetId: string, body: { toBundleId: string; reason?: string })`, `replaceComponent(bundleId: string, assetId: string, body: { component: any; reason?: string })`, `retireComponent(bundleId: string, assetId: string, body: { reason?: string })`, `getMembershipLog(bundleId: string)`, `convertAsset(body: { assetId: string; bundleName?: string; components: any[]; reason?: string })` and types `MembershipLogItem`. Standalone `BundleComponentActionsComponent` (`selector: 'app-bundle-component-actions'`) with `@Input() bundleId`, `@Input() component` (null when adding), `@Input() mode: 'add' | 'remove' | 'transfer' | 'replace' | 'retire' | null`, `@Input() candidateAssets` (standalone assets for `add`), `@Input() otherBundles` (for `transfer`), `@Output() done = new EventEmitter<void>()`, `@Output() closed = new EventEmitter<void>()`: one PrimeNG dialog that renders the right small form (add: multi-select of standalone assets + optional role per asset; remove/retire: confirm + optional reason; transfer: bundle select + reason; replace: the component fields from `bundle-form-dialog.ts`'s grid row for ONE component + reason), calls the matching service method, shows backend 409/400 messages via the existing toast/`ErrorHandlerService` pattern, emits `done` on success. In `bundle-detail-dialog.ts` (LabTech only): a per-component actions menu (Replace, Transfer, Remove, Retire) and an "Add components" button; a third tab "Changes" listing the membership log (when, action tag, component, from → to bundle, by, reason) loaded lazily; Retired components render greyed with a "Retired" tag; after any `done` the dialog reloads the bundle, history and log and the parent list refreshes (`onBundleChanged`). Escape nothing manually in Angular templates; any HTML-string output uses `AssetUtils.escapeHtml`.

- [ ] **Step 1:** Implement the service calls/types, the actions component and the detail-dialog changes.
- [ ] **Step 2:** Verify `npx ng build --configuration development --output-path "$TEMP/lams-build"` passes and `git status --short` leaves `dist/` untouched. State plainly nothing was exercised in a browser or against the API.
- [ ] **Step 3:** Commit `feat(assets): bundle component lifecycle actions and changes tab` (frontend repo).

### Task 9: Convert to set (frontend)

**Files:**
- Create: `components/convert-to-bundle-dialog.ts`
- Modify: `assets.ts`

**Interfaces:**
- Consumes: `AssetBundleService.convertAsset` (Task 8), the component grid pattern and templates (PC Set, Keyboard + Mouse) from `bundle-form-dialog.ts`.
- Produces: standalone `ConvertToBundleDialogComponent` (`selector: 'app-convert-to-bundle-dialog'`) with `@Input() visible`, `@Input() asset` (the legacy asset), `@Input() brands`, `@Output() visibleChange`, `@Output() converted = new EventEmitter<void>()`. Shows a warning panel ("The original asset <name> will be retired and its maintenance history will move to the new set"), an editable bundle name (defaults to the asset name), the components grid (role, name, one serial each, optional brand/model/unit cost/condition/property number) with the two templates, the same client validation as the create dialog (at least one component; role, name, serial required; no duplicate serials in the grid), and submits `convertAsset`. In `assets.ts` add a "Convert to set" row action (LabTech only; hidden for assets that already have `bundle`) opening the dialog; on `converted` refresh assets and bundles.

- [ ] **Step 1:** Implement the dialog and the row action.
- [ ] **Step 2:** `ng build` as in Task 8; state nothing was exercised. Commit `feat(assets): convert an existing asset into a set`.

### Task 10: Print a set's QR label (frontend)

**Files:**
- Create: `services/bundle-qr-print.service.ts`
- Modify: `components/bundle-detail-dialog.ts`, `package.json` / lockfile (new dependency `qrcode`; add `@types/qrcode` if the build needs it)

**Interfaces:**
- Produces: `BundleQrPrintService.print(bundle: { bundleId: string; bundleName: string; propertyNumber?: string | null }): Promise<void>` that generates a QR data URL encoding exactly `bundle.bundleId` (the value the scanner already resolves; do NOT encode a URL) with the `qrcode` package, opens a print window with the QR image, the bundle name and ID (all text through `AssetUtils.escapeHtml`) and calls `print()`. A "Print QR label" button in the bundle detail dialog header (any role that can open the dialog).

- [ ] **Step 1:** `npm install qrcode` (and `@types/qrcode` only if the TypeScript build requires it), implement the service and the button.
- [ ] **Step 2:** `ng build` as in Task 8. State nothing was printed or scanned. Commit `feat(assets): print a QR label for a set`.

---

## Self-Review

- **Spec coverage:** replace/remove/transfer/retire component actions and edge cases (spec 11) -> Tasks 3, 4; membership log (4.5) -> Tasks 1, 3-6, 8; "Convert to bundle" (11, 13) -> Tasks 5, 9; bundle QR strategy (9, 8) -> Task 10; deferred phase-3 item "restore only what the request flipped" -> Task 7; Retired becomes settable (phase 3 follow-up) -> Task 4. Not in phase 4: the wrench-role mismatch (needs a product decision on who may request maintenance); nested bundles (out of scope per spec); automatic detection of legacy set-like assets (out of scope per spec 14).
- **Type consistency:** `MembershipAction` values (Task 1) are the strings in every log write (Tasks 3-5) and in `MembershipLogItem` (Task 6) and the frontend type (Task 8). `findBlockingRequest`/`assertNotBlocked` (Task 2) are used by Tasks 3-5. `ReplaceComponentDto.component` reuses phase 1's `CreateBundleComponentDto` shape.
- **Risks:** Task 5 and Task 4 each combine several writes in one transaction against code that has only been mock-tested; Task 7 changes shared status code (kept to multi-asset requests); every migration and all runtime behavior are unverified until run on a non-shared database; Task 10 adds an npm dependency.
- **Manual checks for the user after execution:** run both migrations on a backup/non-shared DB; add a standalone asset to a set, transfer it to another set, remove it, retire one, replace one (also try a duplicate serial and an active request on the component, expecting 409/400 with nothing changed); open the Changes tab; convert a legacy asset and confirm the legacy asset is Retired, the new set shows its old maintenance history, and a conversion with a duplicate serial leaves nothing behind; mark a component Unserviceable by hand, run a set repair through approve → start → complete, and confirm that component stays Unserviceable; print a set QR label and scan it with the topbar scanner (it should open the set).
