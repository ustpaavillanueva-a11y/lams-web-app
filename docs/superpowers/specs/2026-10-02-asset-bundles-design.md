# Asset Sets / Bundles and Component-Level Maintenance: Design

Date: 2026-10-02
Status: Approved design, awaiting spec review (no implementation yet)
Scope: `capstone-backend` (NestJS/TypeORM) and `lams-web-app` (Angular 20)

## 1. Problem

Some assets are registered as a set (e.g. PC Set = System Unit, Monitor, Keyboard, Mouse, AVR/UPS; Keyboard + Mouse bundle). Today a set is a single `assets` row with its parts typed into the specifications text. Maintenance requests target one asset, so a broken monitor forces the whole PC Set to be marked Unserviceable and the monitor has no history of its own.

Goal: maintenance, status and history attach to the specific component that needs them, while the set stays one visible, countable, scannable thing with a roll-up status.

## 2. Current state (from code review)

- `assets`: one row per asset with its own `qrCode`, `status`, `condition`, one-to-one `inventoryCustodianSlip` (brand, model, serial, cost). Bulk creation already makes one asset per serial number, quantity 1.
- `maintenance_requests.asset`: single FK. Approval/start flips the asset to `Unserviceable`, completion restores `Serviceable` (see `maintenance.approval.service.ts`).
- `asset_master_plan` references one asset per row.
- Known adjacent bug: `deriveAssetState` in `maintenance-plans.service.ts` treats "Unserviceable" as working because it contains "serviceable". Fix independently of this work.

## 3. Decisions (approved)

1. The bundle is its own lightweight table, not a parent asset row. Components are ordinary `assets` rows.
2. Every component always gets an auto-generated asset ID and QR code. Property number is optional on a component.
3. Bundle status is derived at read time, never stored.
4. Maintenance on a bundle affects only the selected components unless "take the whole set offline" is chosen.
5. Existing set-like assets are left unchanged until a later "Convert to bundle" action.

## 4. Data model

### 4.1 `asset_bundles` (new)
`bundleId` (PK, structured ID like other tables), `bundleName`, `propertyNumber`, `qrCode`, `campus`, `laboratory`, `issuedTo`, `acquisitionDate`, `notes`, `createdAt`, `updatedAt`.

### 4.2 `assets` (changes)
- `bundle` FK to `asset_bundles`, nullable, `ON DELETE RESTRICT`.
- `componentRole` text, nullable (e.g. Monitor, Keyboard).
- `retiredAt` timestamptz, nullable.
- `replacedByAssetId` FK to `assets`, nullable.
- `status` gains a `Retired` value in `assets_statuses` seed data.

### 4.3 `maintenance_requests` (changes)
- `asset` becomes nullable.
- `bundle` FK, nullable. Snapshot of the bundle at creation time, set for both component and whole-set requests, so bundle history survives swaps and replacements.
- Constraint: at least one of `asset` or `bundle` is set.

### 4.4 `maintenance_request_components` (new)
`requestId`, `assetId`. Lists affected components for whole-set or multi-component requests. For a single-component request the `asset` FK alone is sufficient.

### 4.5 `bundle_membership_log` (new, optional, can ship in a later phase)
`id`, `assetId`, `fromBundle`, `toBundle`, `action` (JOINED, REMOVED, TRANSFERRED, REPLACED), `reason`, `actorId`, `createdAt`.

## 5. Identification

- Bundle: property number and QR code (the set is what is issued and inventoried).
- Component: asset ID and QR always generated; property number optional, displayed as "bundle PN / role" when empty; serial number optional (existing ICS field).
- Each component keeps its own ICS (brand, model, serial, unit cost). Bundle total cost is derived by summing components.

## 6. Status rules

- Component statuses: Serviceable, Unserviceable, Retired (existing behavior plus Retired).
- Bundle status derived from non-retired components:
  - all Serviceable -> Serviceable
  - mixed -> Partially Serviceable (n/m available)
  - all Unserviceable -> Unserviceable
  - no active components -> Retired
- Maintenance start/complete updates only the affected components. Option "take whole set offline" marks all active components Unserviceable for the duration.

## 7. Maintenance request flow

- Entry points: from a bundle (choose scope: Entire set, or specific components via checklist) or from a component (pre-filled, shows its bundle).
- Whole-set or multi-component request: one request row, affected components in `maintenance_request_components`.
- Approval, scheduling, start, hold, complete, cancel: unchanged, except status updates apply to each affected component.
- Permissions follow existing campus/role scoping, applied through the component's or bundle's campus.

## 8. UI

- Add Asset: toggle Individual / Set-Bundle. Bundle mode shows bundle fields plus a component grid (role/name, serial, brand, model, condition, optional property number).
- Asset list: bundles shown as expandable rows (reuse the existing row expansion); components carry a "Part of <bundle>" badge.
- Bundle page: derived status badge, component list with status, per-component actions (View Details, Request Maintenance, View Maintenance History), and a combined history timeline labeled by scope ("Monitor: Display repair", "Entire set: Preventive").
- Request Maintenance dialog: scope selector (entire set / components).
- Existing views (asset list filters, exports, master plan) gain a bundle column or filter where applicable.

## 9. QR behavior

- Bundle QR opens the bundle page.
- Component QR opens the component and shows "Part of <bundle>" with a link back.
- Scanner/lookup resolves both ID types.

## 10. History and reporting

- Component history = requests where `asset` is that component.
- Bundle history = requests where `bundle` is that bundle (snapshot), including whole-set requests, labeled by scope.
- Replaced or removed components keep their own history; the bundle timeline still shows past entries via the snapshot.
- Reports and master plan operate per component, with a bundle column and filter.

## 11. Edge cases

| Case | Behavior |
|---|---|
| Replace a component | Create new asset; old one set to Retired with `replacedByAssetId`, detached from the bundle; log event |
| Remove a component | Clear `bundle`; component becomes a standalone asset; log event |
| Transfer between bundles | Change `bundle`; log event; past requests keep original bundle snapshot |
| Retire one component | Status Retired, excluded from bundle status, shown greyed out |
| Maintenance on several components | One request, listed in `maintenance_request_components`; only those components change status |
| Delete a bundle | Blocked while it has components |
| Component with an open request is removed/retired | Blocked until the request is completed or cancelled |
| Existing set-like assets | Unchanged until "Convert to bundle" (phase 4) |

## 12. Migration and compatibility

- All new columns nullable; existing assets and requests keep working untouched.
- `maintenance_requests.asset` becoming nullable requires reviewing every query and the frontend models that assume `request.asset` exists (maintenance list, reports, dashboards, master plan, activities log).
- Add the `Retired` status to the seed and a migration for existing databases.

## 13. Phases

1. Data model migration, bundle CRUD, create-bundle UI, bundle display in the asset list.
2. Component-targeted and multi-component maintenance requests.
3. Derived bundle status, bundle history timeline, reports, QR routing.
4. Convert legacy sets, replace/remove/transfer actions, membership log.

Each phase gets its own implementation plan.

## 14. Out of scope

Procurement of components, depreciation, nested bundles (a bundle containing bundles), and automatic detection of legacy set assets.

## 15. Testing approach

- Backend: unit tests for derived status, scope validation on requests (exactly-one-target rule), status changes limited to affected components, replace/remove/transfer flows.
- Frontend: component tests for the create-bundle form, scope selector and bundle status display; manual walkthrough for QR routing.
- Regression: existing single-asset maintenance flow must behave identically.

## 16. Amendment (2026-10-02, phase 2 planning): keep `maintenance_requests.asset` NOT NULL

Reading the maintenance code showed `MaintenanceApprovalService` dereferences `request.asset.campus.campusId` in roughly 40 places (permissions, activity logs, websocket rooms, calendar, dashboards). Making `asset` nullable (section 4.3) would put every one of those at risk. Instead:

- `maintenance_requests.asset` stays NOT NULL. For a request that targets several components or the whole set, `asset` holds an **anchor component** (the first selected component; for an entire-set request, the first active component). Campus, permission and notification code keeps working unchanged.
- New column `scope` (enum `ASSET` | `COMPONENTS` | `BUNDLE`, default `ASSET`): `ASSET` = one asset (plain or a single component), `COMPONENTS` = a chosen subset of one bundle's components, `BUNDLE` = the entire set.
- New column `bundle` (nullable FK to `asset_bundles`, `ON DELETE SET NULL`): the bundle snapshot from section 4.3, set whenever the target belongs to a bundle.
- New column `takeBundleOffline` (boolean, default false): the "take the whole set offline" option from decision 4.
- `maintenance_request_components` (section 4.4) is kept: it lists every affected component for `COMPONENTS` and `BUNDLE` scope (including the anchor). For `ASSET` scope it is empty and the affected set is just `asset`.
- Status propagation (section 6): approval, start, hold, complete and cancel update the affected set: the join-table components (or `asset` for `ASSET` scope), or all active components of `bundle` when `takeBundleOffline` is true. Restoring to Serviceable skips any component that is also covered by another active (Approved, Scheduled or In Progress) request.
