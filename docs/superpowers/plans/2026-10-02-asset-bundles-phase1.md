# Asset Bundles, Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a LabTech register an asset set/bundle with individually identified components, and see bundles (with a derived status and their components) in the asset list.

**Architecture:** A new `asset_bundles` table; components are ordinary `assets` rows with a nullable `bundle` FK and `componentRole`. A bundle is created together with its components in one transaction by reusing the existing asset-creation logic. Bundle status is derived from component statuses by a pure function and never stored. Maintenance changes are out of scope (phase 2).

**Tech Stack:** Backend `capstone-backend`: NestJS 11, TypeORM 0.3, PostgreSQL, Jest. Frontend `lams-web-app`: Angular 20 standalone components, PrimeNG, Tailwind.

**Spec:** `lams-web-app/docs/superpowers/specs/2026-10-02-asset-bundles-design.md` (sections 3, 4.1, 4.2, 5, 6, 8, 9, 13 phase 1)

## Global Constraints

- Bundle is its own table `asset_bundles`; it is NOT an `assets` row (spec 3.1).
- `assets.bundle` FK is nullable with `ON DELETE RESTRICT`; `componentRole` is nullable text (spec 4.2).
- Bundle status is derived at read time, never stored (spec 3.3, 6): all Serviceable -> `Serviceable`; mixed -> `Partially Serviceable`; all Unserviceable -> `Unserviceable`; no active components -> `Retired`. Components with status `Retired` are excluded from the count.
- Every component always gets its own asset ID; property number is optional on a component; serial number is optional per spec but the existing asset-creation path requires exactly one serial per asset, so a component needs one serial number in phase 1 (see Review Focus).
- Delete of a bundle is blocked while it has components (spec 11).
- Existing single-asset creation and listing must behave identically (spec 15).
- Roles: create/update/delete bundles = `Role.LabTech` (same as assets); read = same roles that can view assets (`validateViewAssetService`); all reads scoped to the user's campus via `getCampusWhereClause`.
- `printWidth` 250, `tabWidth` 4 in the frontend (`.prettierrc.json`). Backend files use LF-agnostic Prettier defaults (`npm run format`).
- Bundle ID format via `IdGeneratorService.generateStructuredId({ tableName: 'asset_bundles', idColumn: 'bundleId', campusId, moduleCode: 'BN' })` -> e.g. `CS001-BN001`.
- Bundle QR: encoded client-side from `bundleId` using the existing `QrCodeService`; no backend QR storage in phase 1. The `qrCode` column is created but left `''`.

## Review Focus

- A component with a serial number already used elsewhere -> request rejected with the same "Duplicated serial number(s)" error as plain assets, and no bundle row is left behind (rollback). Pinned in Task 4.
- Two components in the same request sharing a serial number -> rejected, nothing created. Pinned in Task 4.
- Bundle with zero components, or a component missing its role/name -> 400 validation error. Pinned in Task 4.
- Another campus's LabTech requesting or deleting a bundle -> not found / forbidden, never the data. Pinned in Task 4.
- Deleting a bundle that has components -> 409 and the bundle remains. Pinned in Task 4.
- Bundle where every component is Unserviceable or the list is empty -> status label is correct, not "Serviceable". Pinned in Task 1.

---

## File Structure

Backend (`capstone-backend/src/modules/assets/`):
- `entities/asset-bundle.entity.ts` (create): the `AssetBundle` entity.
- `entities/assets.entity.ts` (modify): add `bundle`, `componentRole`.
- `dto/create/create-asset-bundle.dto.ts` (create): bundle + component input.
- `dto/update/update-asset-bundle.dto.ts` (create): bundle-only fields.
- `utils/bundle-status.util.ts` (create): pure `deriveBundleStatus`.
- `services/asset-bundles.service.ts` (create): CRUD, transaction, response mapping.
- `controllers/asset-bundles.controller.ts` (create): `/asset-bundles` routes.
- `services/assets.service.ts` (modify): make the create core reusable inside a caller's transaction and accept bundle context; load `bundle` in `findAll`.
- `assets.module.ts` (modify): register entity, service, controller.
- `src/db/migrations/<timestamp>-AddAssetBundles.ts` (create, generated).

Frontend (`lams-web-app/src/app/pages/assets/`):
- `models/asset-bundle.model.ts` (create): interfaces.
- `services/asset-bundle.service.ts` (create): HTTP client wrapper.
- `components/bundle-form-dialog.ts` (create): create-bundle dialog (standalone).
- `components/bundle-list.ts` (create): expandable bundle table with derived status.
- `assets.ts` (modify): Assets | Bundles view toggle, "Add Set/Bundle" button, "Part of" badge.

---

### Task 1: Derived bundle status

**Files:**
- Create: `capstone-backend/src/modules/assets/utils/bundle-status.util.ts`
- Test: `capstone-backend/src/modules/assets/utils/bundle-status.util.spec.ts`

**Interfaces:**
- Produces: `export type BundleStatusLabel = 'Serviceable' | 'Partially Serviceable' | 'Unserviceable' | 'Retired'`; `export interface BundleStatusResult { status: BundleStatusLabel; activeCount: number; availableCount: number }`; `export function deriveBundleStatus(components: Array<{ status?: { statusName?: string | null } | null }>): BundleStatusResult`

- [ ] **Step 1: Write failing tests** in `bundle-status.util.spec.ts`: (a) all `Serviceable` x4 -> `{ status: 'Serviceable', activeCount: 4, availableCount: 4 }`; (b) 3 Serviceable + 1 Unserviceable -> `Partially Serviceable`, `availableCount: 3`; (c) all Unserviceable -> `Unserviceable`, `availableCount: 0`; (d) `[]` -> `Retired`, counts 0; (e) one `Retired` + 2 Serviceable -> `Serviceable`, `activeCount: 2` (retired excluded); (f) a component with `status: null` counts as active but not available; (g) matching is by exact `statusName` ("Unserviceable" must not count as available, which guards the substring bug).
- [ ] **Step 2: Run** `cd capstone-backend && npx jest src/modules/assets/utils/bundle-status.util.spec.ts` and confirm failure (module not found).
- [ ] **Step 3: Implement** `deriveBundleStatus` with exact-equality comparison on `statusName`.
- [ ] **Step 4: Run** the same command; expected: all tests PASS.
- [ ] **Step 5: Commit** `feat(assets): add derived bundle status util` (backend repo).

### Task 2: Schema (entities and migration)

**Files:**
- Create: `entities/asset-bundle.entity.ts`, migration under `src/db/migrations/`
- Modify: `entities/assets.entity.ts`, `assets.module.ts` (add `AssetBundle` to `TypeOrmModule.forFeature`)

**Interfaces:**
- Produces: entity `AssetBundle` with `bundleId` (PK varchar 20), `bundleName` text, `propertyNumber` text nullable, `qrCode` text nullable, `issuedTo` text nullable, `acquisitionDate` date nullable, `notes` text nullable, `createdAt`, `updatedAt`, ManyToOne `campus` (column `campus`), ManyToOne `laboratories` (column `laboratory`), OneToMany `components: Assets[]`. `Assets` gains `bundle: AssetBundle | null` (ManyToOne, column `bundle`, `onDelete: 'RESTRICT'`, nullable) and `componentRole: string | null` (text nullable).

- [ ] **Step 1: Create the entity and edit `Assets`** following the decorators style of `assets.entity.ts` (`@JoinColumn({ name: ... })`).
- [ ] **Step 2: Generate the migration** with `npm run migration:generate` (requires the dev database), rename the file/class to `AddAssetBundles`, and review it: it must only create `asset_bundles`, add `assets.bundle` (FK, RESTRICT) and `assets.componentRole`; remove any unrelated drift statements.
- [ ] **Step 3: Verify** `npm run migration:run` succeeds, then `npm run migration:revert` succeeds, then `npm run migration:run` again; `npm run build` passes.
- [ ] **Step 4: Commit** `feat(assets): add asset_bundles table and component link` (backend repo).

### Task 3: Make asset creation reusable inside a transaction

**Files:**
- Modify: `services/assets.service.ts` (the `create` method around lines 285-515 and `findAll`)

**Interfaces:**
- Produces: `async createWithManager(assetData: CreateAssetsDto, currentUser: User, opts?: { manager?: EntityManager; bundleId?: string; componentRole?: string }): Promise<Assets[]>`. `create(assetData, currentUser)` becomes `return this.createWithManager(assetData, currentUser)`. When `opts.manager` is given, the existing transactional block runs on that manager instead of opening a new transaction; when `opts.bundleId` is given, each created asset gets `bundle: { bundleId }` and `componentRole`. Post-commit activity logging and gateway emits must not run when a caller-supplied manager is used (the caller emits after commit): return the assets and let `AssetBundlesService` log/emit.
- `findAll` additionally loads the `bundle` relation.

- [ ] **Step 1: Refactor** as described; behavior for `create()` callers must be byte-for-byte equivalent (same validations, same ID generation, same logging/emit).
- [ ] **Step 2: Verify regression** `npm run build` and `npx jest` pass; manually create a normal single asset through the running app and confirm it still saves, appears in the list, and logs an activity.
- [ ] **Step 3: Commit** `refactor(assets): allow asset creation inside a caller transaction` (backend repo).

### Task 4: Bundle service, controller, DTOs

**Files:**
- Create: `dto/create/create-asset-bundle.dto.ts`, `dto/update/update-asset-bundle.dto.ts`, `services/asset-bundles.service.ts`, `controllers/asset-bundles.controller.ts`
- Modify: `assets.module.ts`
- Test: `services/asset-bundles.service.spec.ts`

**Interfaces:**
- Consumes: `deriveBundleStatus` (Task 1), `AssetBundle` and `Assets.bundle` (Task 2), `AssetsService.createWithManager` (Task 3).
- Produces:
  - `CreateAssetBundleDto`: `bundleName: string`; `propertyNumber?: string`; `laboratories: string`; `program: string`; `category: string`; `icsNo: string`; `supplier?: string`; `issuedTo?: string`; `acquisitionDate?: string` (ISO date); `warrantyExpirationDate?: string`; `notes?: string`; `components: CreateBundleComponentDto[]` (`@ArrayMinSize(1)`, `@ValidateNested`).
  - `CreateBundleComponentDto`: `assetName: string`; `componentRole: string`; `serialNumber: string` (exactly one); `propertyNumber?: string`; `brand?: string` (brand ID); `color?: string` (color ID); `modelNumber?: string`; `unitCost?: number`; `condition?: AssetCondition`.
  - `UpdateAssetBundleDto`: partial of `bundleName, propertyNumber, issuedTo, acquisitionDate, notes`.
  - `AssetBundlesService`: `create(dto, user): Promise<BundleResponse>`, `findAll(user): Promise<BundleResponse[]>`, `findOne(id, user): Promise<BundleResponse>`, `update(id, dto, user): Promise<BundleResponse>`, `remove(id, user): Promise<void>`. `BundleResponse` = the `AssetBundle` fields plus `components: Assets[]` (with `status`, `inventoryCustodianSlip`, brand/color loaded) plus `derived: BundleStatusResult`.
  - Routes under `@Controller('asset-bundles')` with the same guards as `AssetsController`: `POST /` (LabTech), `GET /` , `GET /:id`, `PATCH /:id` (LabTech), `DELETE /:id` (LabTech).
- Behavior: `create` checks `validateAssetService`, rejects duplicate serials across components (same message style as `Duplicate serial numbers in request: ...`), runs everything in one `dataSource.transaction`: generate `bundleId`, save the bundle with the user's campus and the DTO's laboratory, then for each component call `createWithManager(componentAsDto, user, { manager, bundleId, componentRole })` where the component DTO merges the bundle-level fields (`laboratories`, `program`, `category`, `supplier`, `issuedTo`, dates) with `inventoryCustodianSlip: { icsNo, quantity: 1, serialNumber, brand, color, modelNumber, unitCost }`. After commit, log `ASSET_CREATED` per component and emit the gateway event as `create()` does. `remove` throws `ConflictException` when the bundle has components. `findOne`/`remove`/`update` use `getCampusWhereClause` and throw `NotFoundException` when out of scope.

- [ ] **Step 1: Write failing unit tests** in `asset-bundles.service.spec.ts` with mocked repositories/`AssetsService`: (a) create calls `createWithManager` once per component with the bundle ID and role; (b) two components with the same serial -> `BadRequestException`, `createWithManager` never called; (c) if the second component's `createWithManager` rejects, the error propagates and the mocked transaction is rolled back (assert the bundle save happened inside the transaction callback only); (d) `remove` on a bundle with components -> `ConflictException`, no delete call; (e) `findOne` for a bundle outside the user's campus -> `NotFoundException`; (f) `findAll` response carries `derived` computed from component statuses.
- [ ] **Step 2: Run** `npx jest src/modules/assets/services/asset-bundles.service.spec.ts`; expect FAIL.
- [ ] **Step 3: Implement** DTOs, service and controller, and register them in `AssetsModule` (providers/controllers, plus `AssetBundle` in `forFeature` from Task 2).
- [ ] **Step 4: Run** `npx jest` (all pass) and `npm run build`. Then smoke-test with the dev server: `POST /api/asset-bundles` with a 2-component payload returns the bundle with two components and `derived.status = 'Serviceable'`; repeat the POST with a reused serial and confirm 400 and no new bundle in `GET /api/asset-bundles`.
- [ ] **Step 5: Commit** `feat(assets): bundle CRUD with transactional component creation` (backend repo).

### Task 5: Frontend model, service, and bundle list

**Files:**
- Create: `assets/models/asset-bundle.model.ts`, `assets/services/asset-bundle.service.ts`, `assets/components/bundle-list.ts`
- Modify: `assets/assets.ts`

**Interfaces:**
- Consumes: backend routes from Task 4.
- Produces: `interface AssetBundle { bundleId: string; bundleName: string; propertyNumber?: string; issuedTo?: string; acquisitionDate?: string; notes?: string; laboratories?: any; campus?: any; components: any[]; derived: { status: 'Serviceable' | 'Partially Serviceable' | 'Unserviceable' | 'Retired'; activeCount: number; availableCount: number } }`; `class AssetBundleService` (providedIn root) with `getBundles(): Observable<AssetBundle[]>`, `getBundle(id: string): Observable<AssetBundle>`, `createBundle(dto: any): Observable<AssetBundle>`, `deleteBundle(id: string): Observable<void>` using `environment.apiUrl`; standalone `BundleListComponent` (`selector: 'app-bundle-list'`) with `@Input() bundles: AssetBundle[]` and `@Output() deleted = new EventEmitter<string>()`.
- UI rules: expandable rows (PrimeNG `p-table` row expansion, as already used by `assets.ts`); header columns Bundle ID, Name, Property Number, Lab, Issued To, Status tag (`Partially Serviceable` -> `warn`, `Serviceable` -> `success`, `Unserviceable` -> `danger`, `Retired` -> `secondary`) with `n/m available`; expanded row lists components with role, asset name, serial number, status tag, condition. Components in the main asset table show a `Part of <bundleName>` tag next to the asset name when `asset.bundle` is set. `assets.ts` gets an `Assets | Bundles` `p-selectButton` view toggle and loads bundles when `Bundles` is first selected.

- [ ] **Step 1: Implement** the model, service, component, and the `assets.ts` changes.
- [ ] **Step 2: Verify** `npx ng build --configuration development --output-path "$TEMP/lams-build"` passes; with the dev server and backend running, the toggle shows an empty Bundles list before any bundle exists, and an existing plain asset shows no "Part of" tag.
- [ ] **Step 3: Commit** `feat(assets): bundle list view and component badge` (frontend repo).

### Task 6: Create-bundle dialog

**Files:**
- Create: `assets/components/bundle-form-dialog.ts`
- Modify: `assets/assets.ts` (an "Add Set/Bundle" button next to the existing add button, LabTech only; refresh bundles and assets after a successful create)

**Interfaces:**
- Consumes: `AssetBundleService.createBundle` (Task 5), existing program/laboratory/brand/color lists already loaded by `assets.ts` (pass them as `@Input()`s).
- Produces: standalone `BundleFormDialogComponent` (`selector: 'app-bundle-form-dialog'`) with `@Input() visible: boolean`, `@Input() programs`, `@Input() laboratories`, `@Input() brands`, `@Input() colors`, `@Output() visibleChange`, `@Output() saved = new EventEmitter<void>()`. Form fields: bundle name, property number (optional), laboratory, program, category (Hardware/Software, reuse `AssetConstants.CATEGORY_OPTIONS`), ICS no., supplier, issued to, acquisition date, notes; a component grid with add/remove row (role, asset name, serial number, brand, model number, unit cost, condition via `AssetConstants.CONDITION_OPTIONS`, optional property number); quick-add buttons that prefill a "PC Set" template (System Unit, Monitor, Keyboard, Mouse, AVR/UPS) and a "Keyboard + Mouse" template. Client validation: bundle name, laboratory, program, ICS no. required; at least one component; each component needs role, name and serial number; duplicate serials within the grid flagged before submit. Dates sent through `AssetFormService.toDateOnlyString`; empty optional fields omitted from the payload (avoids the earlier 400 caused by empty strings on `@IsOptional()` validated fields).

- [ ] **Step 1: Implement** the dialog and wire it into `assets.ts`.
- [ ] **Step 2: Verify** build passes; manual walkthrough as a LabTech: create the PC Set template with 5 components -> success toast, Bundles view shows the set with `Serviceable` and 5/5 available, the Assets view shows 5 new assets each tagged "Part of <name>"; try a duplicate serial inside the grid and one reused from an existing asset and confirm both are rejected with a visible error and nothing is created.
- [ ] **Step 3: Commit** `feat(assets): create asset set/bundle dialog` (frontend repo).

---

## Self-Review

- **Spec coverage (phase 1):** data model 4.1/4.2 -> Task 2; create flow section 8 -> Tasks 4 and 6; derived status section 6 -> Task 1 and the response in Task 4; list display and component badge section 8 -> Task 5; QR section 9 phase 1 slice -> constraints (client-side from `bundleId`; component QRs already work as ordinary assets). Phase 2+ items (maintenance, retired/replaced columns, membership log, `Retired` status seed, bundle detail page and QR routing, Convert action) are deliberately excluded.
- **Type consistency:** `deriveBundleStatus`/`BundleStatusResult` (Task 1) is the shape of `BundleResponse.derived` (Task 4) and `AssetBundle.derived` (Task 5). `createWithManager` signature in Task 3 matches its use in Task 4.
- **Known deviation from spec:** the existing creation path requires one serial number per asset, so phase 1 requires a serial number for every component even though the spec marks it optional; relaxing this means changing the asset create validation and is deferred.
- **Verification caveat:** the backend has no existing unit-test suite beyond a stub e2e file and the frontend has no spec files, so backend logic is covered by new Jest specs (Tasks 1 and 4) while the `AssetsService` refactor (Task 3) and the frontend (Tasks 5, 6) are verified by build plus the manual checks written into each task.
