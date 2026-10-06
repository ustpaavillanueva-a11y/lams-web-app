# Incident Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any user file incident reports against an asset, let LabTech/CampusAdmin/SuperAdmin approve, reject and resolve them, and give each asset a printable PDF report with its maintenance and incident history.

**Architecture:** A new NestJS `incidents` module in `capstone-backend` (entity, migration, service, controller) exposes `/api/incident-reports`. In `lams-web-app`, a new HTTP service and pure helper file feed three UI pieces: a Report Incident dialog on each asset row, an Incident History section plus Print Report button in the asset View dialog, and a new Incident Reports page with status tabs.

**Tech Stack:** NestJS 11, TypeORM 0.3, Postgres (Supabase), Jest · Angular 20 standalone components, PrimeNG, SweetAlert2, jspdf + jspdf-autotable, Karma/Jasmine.

**Spec:** `docs/superpowers/specs/2026-10-06-incident-reports-design.md` (in `lams-web-app`). Read it before starting any task.

Repos (sibling folders):
- `BE` = `C:\Users\phill\Desktop\Projects\Capstone\capstone-backend`
- `FE` = `C:\Users\phill\Desktop\Projects\Capstone\lams-web-app`

## Global Constraints

- Statuses: `Pending → Approved → Resolved`, or `Pending → Rejected`. No other transitions.
- LabTech, CampusAdmin, SuperAdmin filings start `Approved` (with `reviewedBy` = reporter, `reviewedAt` = now). Faculty filings start `Pending`.
- Review actions (approve/reject/resolve) are allowed for LabTech and CampusAdmin of the asset's campus, and SuperAdmin for any campus.
- Reject requires a non-blank `reason`; resolve requires non-blank `resolutionNotes`.
- An incident never changes the asset's status and never creates a maintenance request.
- Enum values, exactly: `IncidentType` = `Damage`, `Malfunction`, `Lost/Missing`, `Theft`, `Safety Hazard`, `Other`; `IncidentSeverity` = `Low`, `Medium`, `High`; `IncidentStatus` = `Pending`, `Approved`, `Resolved`, `Rejected`.
- Incident IDs come from `IdGeneratorService.generateStructuredId` with `tableName: 'incident_reports'`, `idColumn: 'incidentId'`, the asset's `campusId`, `moduleCode: 'IR'`.
- No photo/attachments, no websockets, no edit/delete of reports in v1.
- Every incident text rendered into HTML strings (SweetAlert `html`) must go through `AssetUtils.escapeHtml`.
- Backend: Prettier default (80 cols), run `npx prettier --write` on touched files. Frontend: `printWidth` 250, `tabWidth` 4 (`.prettierrc.json`).
- Both repos currently contain unrelated uncommitted changes (maintenance priority work, footer SCSS). Never `git add -A` / `git add .`; stage only the files a task lists.
- BE work happens on a new branch `feature/incident-reports` created from the current `BE` HEAD (Task 1, Step 1). FE work continues on the current `backlog` branch.

## Review Focus

1. **HTML in user text** — a description such as `<img src=x onerror=alert(1)>` must show as literal text in the asset View dialog, not execute. Pinned in Task 6 (`renderIncidentHistoryHtml` escaping test).
2. **"Today" across time zones** — a Philippine user picking today's date (sent as `YYYY-MM-DD`) must be accepted by a server running in UTC; only dates more than one day ahead are rejected. Pinned in Task 2 (`accepts today's date string`, `rejects a date 3 days ahead`).
3. **Whitespace-only text** — a description, reject reason or resolution note of `"   "` must be refused, not saved as blank. Pinned in Task 2 (description) and Task 3 (reason, notes).
4. **Acting twice** — approving an already-approved report (double click, two reviewers) must fail with 400 and leave the first review intact. Pinned in Task 3 (`approve rejects a non-Pending report`).
5. **Other campus's asset** — a non-SuperAdmin asking for another campus's asset history or acting on its report gets 404, not data. Pinned in Task 3 (`findByAsset 404s for another campus`, `approve 404s for another campus`).

---

### Task 1: Backend schema — enums, entity, migration, module registration

**Files:**
- Create: `BE/src/modules/incidents/enum/incident-type.enum.ts`, `incident-severity.enum.ts`, `incident-status.enum.ts`
- Create: `BE/src/modules/incidents/entities/incident-report.entity.ts`
- Create: `BE/src/modules/incidents/incidents.module.ts`
- Create: `BE/src/db/migrations/1791100000000-AddIncidentReports.ts`
- Modify: `BE/src/app.module.ts` (add `IncidentsModule` to `imports` after `MaintenanceModule`)
- Modify: `BE/src/modules/activities/enum/entity-type.enum.ts` (add `INCIDENT_REPORT = 'INCIDENT_REPORT'`)
- Modify: `BE/src/modules/activities/enum/action-type.enum.ts` (add `INCIDENT_REPORT_CREATED`, `INCIDENT_REPORT_APPROVED`, `INCIDENT_REPORT_REJECTED`, `INCIDENT_REPORT_RESOLVED`, values equal to their names)

**Interfaces:**
- Produces: `enum IncidentType { Damage = 'Damage', Malfunction = 'Malfunction', LostMissing = 'Lost/Missing', Theft = 'Theft', SafetyHazard = 'Safety Hazard', Other = 'Other' }`, `enum IncidentSeverity { Low, Medium, High }` (string values `'Low'|'Medium'|'High'`), `enum IncidentStatus { Pending, Approved, Resolved, Rejected }` (string values equal to names).
- Produces: `@Entity('incident_reports') class IncidentReport` with properties `incidentId: string`, `incidentType`, `severity`, `incidentDate: Date`, `description: string`, `status: IncidentStatus`, `asset: Assets`, `reportedBy: User`, `reviewedBy: User | null`, `reviewedAt: Date | null`, `rejectionReason: string | null`, `resolvedBy: User | null`, `resolvedAt: Date | null`, `resolutionNotes: string | null`, `createdAt: Date`.
- Produces: `IncidentsModule` with `TypeOrmModule.forFeature([IncidentReport, Assets, User])`, the same `JwtModule.registerAsync` block as `maintenance.module.ts`, and `ActivitiesModule`. Tasks 2–3 add the service and controller to it.

- [ ] **Step 1: Create the branch**

Run: `cd BE && git checkout -b feature/incident-reports && git status --short`
Expected: on `feature/incident-reports`; the pre-existing modified maintenance files still show as modified (leave them alone).

- [ ] **Step 2: Write the enums and entity**

Entity columns: `incidentId` `@PrimaryColumn({ type: 'varchar', length: 50 })`; enums as `@Column({ type: 'enum', enum: ... })` (status default `Pending`); `incidentDate` `timestamptz`; `description` `text`; `rejectionReason`/`resolutionNotes` `text` nullable; `reviewedAt`/`resolvedAt` `timestamptz` nullable; `createdAt` `@CreateDateColumn({ type: 'timestamptz' })`. Relations are `@ManyToOne` with `@JoinColumn({ name: 'asset' | 'reportedBy' | 'reviewedBy' | 'resolvedBy' })`; `asset` and `reportedBy` use `onDelete: 'CASCADE'`, the three reviewer FKs `onDelete: 'SET NULL'` and `nullable: true`. Do not add inverse relations to `Assets` or `User`.

- [ ] **Step 3: Write the migration by hand** (do not use `migration:generate`; it would also pick up unrelated drift)

Class `AddIncidentReports1791100000000`, style of `1789700000000-AddAssetBundles.ts`. `up` creates three Postgres enum types `incident_reports_incidenttype_enum`, `incident_reports_severity_enum`, `incident_reports_status_enum` with the exact Global Constraints values; the table with FK columns `character varying(20)` (matching `assets.assetId` / `users.userId`); constraints `PK_incident_reports_incidentId`, `FK_incident_reports_asset`, `FK_incident_reports_reportedBy`, `FK_incident_reports_reviewedBy`, `FK_incident_reports_resolvedBy`. `down` drops constraints, table, then the three types.

- [ ] **Step 4: Register the module and activity enums, then build**

Run: `cd BE && npx prettier --write src/modules/incidents src/db/migrations/1791100000000-AddIncidentReports.ts src/app.module.ts src/modules/activities/enum && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Apply the migration — ASK THE USER FIRST**

This writes to the shared Supabase database (`capstone_backend`). Stop and get explicit approval, then run: `cd BE && npm run migration:run`
Expected: `Migration AddIncidentReports1791100000000 has been executed successfully.` Verify with SQL `select column_name from information_schema.columns where table_name='incident_reports';` → 15 columns.

- [ ] **Step 6: Commit**

```bash
cd BE && git add src/modules/incidents src/db/migrations/1791100000000-AddIncidentReports.ts src/app.module.ts src/modules/activities/enum/entity-type.enum.ts src/modules/activities/enum/action-type.enum.ts
git commit -m "feat(incidents): add incident_reports entity, enums and migration"
```

---

### Task 2: Backend service — filing a report

**Files:**
- Create: `BE/src/modules/incidents/dto/create-incident-report.dto.ts`
- Create: `BE/src/modules/incidents/services/incident-reports.service.ts`
- Create: `BE/src/modules/incidents/services/incident-reports.service.spec.ts`
- Modify: `BE/src/modules/incidents/incidents.module.ts` (add `IncidentReportsService` to `providers`)

**Interfaces:**
- Consumes: Task 1 entity and enums; `IdGeneratorService.generateStructuredId(options)`; `ActivitiesService.logActivity({ actionType, entityType, targetName, targetId, description, actorId, campusId, userRole, status: 'Success' })`.
- Produces: `class CreateIncidentReportDto { asset: string; incidentType: IncidentType; severity: IncidentSeverity; incidentDate: string; description: string }` — `asset`, `description` `@IsString() @IsNotEmpty()`; enums `@IsEnum`; `incidentDate` `@IsDateString()`.
- Produces: `class IncidentReportsService` with constructor `(incidentRepository: Repository<IncidentReport>, assetsRepository: Repository<Assets>, idGeneratorService: IdGeneratorService, activitiesService: ActivitiesService)` and `create(dto: CreateIncidentReportDto, currentUser: User): Promise<IncidentReport>`.
- Produces: exported const `REVIEWER_ROLES = [Role.LabTech, Role.CampusAdmin, Role.SuperAdmin]` (used by Task 3's controller and service).

- [ ] **Step 1: Write the failing tests**

Spec builds the service with plain mocks, in the style of `maintenance.approval.service.status.spec.ts` (`new IncidentReportsService(repo as any, assetsRepo as any, idGen as any, activities as any)`; `assetsRepo.findOne` resolves `{ assetId: 'A1', assetName: 'Projector', campus: { campusId: 'C1' } }`; `idGen.generateStructuredId` resolves `'IR-C1-001'`; `repo.create` returns its argument; `repo.save` resolves its argument). Users: `{ userId: 'U1', role: Role.<X>, campus: { campusId: 'C1' } }`. Valid dto: `{ asset: 'A1', incidentType: IncidentType.Damage, severity: IncidentSeverity.High, incidentDate: <today YYYY-MM-DD>, description: 'Cracked screen' }`.

```ts
it.each([Role.LabTech, Role.CampusAdmin, Role.SuperAdmin])('auto-approves reports filed by %s', async (role) => {
  const saved = await service.create(dto, user(role));
  expect(saved.status).toBe(IncidentStatus.Approved);
  expect(saved.reviewedBy).toEqual(expect.objectContaining({ userId: 'U1' }));
  expect(saved.reviewedAt).toBeInstanceOf(Date);
});
it('leaves Faculty reports Pending with no reviewer', async () => {
  const saved = await service.create(dto, user(Role.Faculty));
  expect(saved.status).toBe(IncidentStatus.Pending);
  expect(saved.reviewedBy ?? null).toBeNull();
});
it('uses the IR module code and the asset campus for the id', ...);   // generateStructuredId called with objectContaining({ tableName: 'incident_reports', idColumn: 'incidentId', campusId: 'C1', moduleCode: 'IR' })
it('404s when the asset belongs to another campus', ...);           // user campus 'C2', role Faculty → rejects NotFoundException
it('lets SuperAdmin file for any campus', ...);                     // SuperAdmin with campus 'C2' → resolves
it("accepts today's date string", ...);                             // incidentDate = new Date().toISOString().slice(0, 10) → resolves
it('rejects a date 3 days ahead', ...);                             // → rejects BadRequestException
it('rejects a whitespace-only description', ...);                   // description '   ' → rejects BadRequestException
it('logs INCIDENT_REPORT_CREATED', ...);                            // activities.logActivity called with objectContaining({ actionType: ActionType.INCIDENT_REPORT_CREATED, targetId: 'IR-C1-001' })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd BE && npx jest src/modules/incidents`
Expected: FAIL — cannot find module `./incident-reports.service`.

- [ ] **Step 3: Implement `create(dto, currentUser)`**

Load the asset with `relations: ['campus']`; non-SuperAdmin whose `campus.campusId` differs → `NotFoundException('Asset not found or you do not have access to it')`. Trim `description`; empty → `BadRequestException('Description is required')`. Reject `incidentDate` later than `Date.now() + 24h` with `BadRequestException('Incident date cannot be in the future')`. Status from `REVIEWER_ROLES.includes(currentUser.role)`. Log with `ActionType.INCIDENT_REPORT_CREATED`, `EntityType.INCIDENT_REPORT`, `targetName: asset.assetName`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd BE && npx jest src/modules/incidents`
Expected: PASS (all tests above).

- [ ] **Step 5: Commit**

```bash
cd BE && npx prettier --write src/modules/incidents
git add src/modules/incidents
git commit -m "feat(incidents): file incident reports with role-based auto-approval"
```

---

### Task 3: Backend — review actions, queries and controller

**Files:**
- Create: `BE/src/modules/incidents/dto/reject-incident-report.dto.ts` (`reason: string`, `@IsString() @IsNotEmpty()`)
- Create: `BE/src/modules/incidents/dto/resolve-incident-report.dto.ts` (`resolutionNotes: string`, `@IsString() @IsNotEmpty()`)
- Create: `BE/src/modules/incidents/dto/query-incident-reports.dto.ts` (`status?: IncidentStatus` `@IsOptional() @IsEnum`, `assetId?: string` `@IsOptional() @IsString`)
- Create: `BE/src/modules/incidents/controllers/incident-reports.controller.ts`
- Modify: `BE/src/modules/incidents/services/incident-reports.service.ts`
- Modify: `BE/src/modules/incidents/services/incident-reports.service.spec.ts`
- Modify: `BE/src/modules/incidents/incidents.module.ts` (add controller)

**Interfaces:**
- Consumes: Task 2 service, `REVIEWER_ROLES`.
- Produces service methods:
  - `findAll(currentUser: User, query: QueryIncidentReportsDto): Promise<IncidentReport[]>`
  - `findByAsset(assetId: string, currentUser: User): Promise<IncidentReport[]>`
  - `approve(incidentId: string, currentUser: User): Promise<IncidentReport>`
  - `reject(incidentId: string, reason: string, currentUser: User): Promise<IncidentReport>`
  - `resolve(incidentId: string, resolutionNotes: string, currentUser: User): Promise<IncidentReport>`
- Produces HTTP API (consumed by Task 4): `@Controller('incident-reports')` with `@UseGuards(AuthGuard, RolesGuard, CampusGuard)`, `@ApiTags('Incident Reports')`, `@ApiBearerAuth()`:
  - `POST /incident-reports` body `CreateIncidentReportDto` → `IncidentReport`
  - `GET /incident-reports?status=&assetId=` → `IncidentReport[]`
  - `GET /incident-reports/asset/:assetId` → `IncidentReport[]`
  - `POST /incident-reports/:id/approve` → `IncidentReport` (`@Roles(...REVIEWER_ROLES)`)
  - `POST /incident-reports/:id/reject` body `{ reason }` → `IncidentReport` (`@Roles(...REVIEWER_ROLES)`)
  - `POST /incident-reports/:id/resolve` body `{ resolutionNotes }` → `IncidentReport` (`@Roles(...REVIEWER_ROLES)`)
- Every returned report has relations `asset` (with `campus`), `reportedBy`, `reviewedBy`, `resolvedBy` loaded.

- [ ] **Step 1: Write the failing tests** (add to the Task 2 spec; `repo.findOne` resolves a fixture report `{ incidentId: 'IR-1', status, asset: { assetId: 'A1', assetName: 'Projector', campus: { campusId: 'C1' } } }`)

```ts
it('approve moves Pending to Approved and records the reviewer', ...);  // status Approved, reviewedBy.userId 'U1', reviewedAt Date
it('approve rejects a non-Pending report', ...);                        // fixture Approved → BadRequestException, repo.save not called
it('reject stores the trimmed reason', ...);                            // reason '  broken  ' → rejectionReason 'broken', status Rejected
it('reject refuses a whitespace-only reason', ...);                     // '   ' → BadRequestException
it('resolve only works from Approved', ...);                            // fixture Pending → BadRequestException
it('resolve stores notes, resolver and time', ...);                     // fixture Approved → Resolved, resolutionNotes, resolvedBy.userId, resolvedAt
it('resolve refuses whitespace-only notes', ...);                       // '   ' → BadRequestException
it('approve 404s for another campus', ...);                             // LabTech campus 'C2' → NotFoundException
it('approve 404s for an unknown id', ...);                              // repo.findOne resolves null → NotFoundException
it('findByAsset 404s for another campus', ...);                         // assetsRepo returns campus 'C1', Faculty campus 'C2' → NotFoundException
it('logs the matching ActionType for approve, reject and resolve', ...);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd BE && npx jest src/modules/incidents`
Expected: FAIL — `service.approve is not a function` (and siblings).

- [ ] **Step 3: Implement the service methods and controller**

A private `findForReview(incidentId, currentUser)` loads the report with the relations above, applies the campus rule (404 for unknown or other-campus), and is shared by approve/reject/resolve. Transition errors: `BadRequestException(\`Only Pending reports can be approved (current status: ${status})\`)`, and the equivalents for reject and resolve. `findAll` uses a query builder with the four relations, `asset.campus` join, optional `status` / `assetId` filters, campus filter for non-SuperAdmin, `ORDER BY createdAt DESC`. `findByAsset` checks the asset's campus first (404), then returns its reports ordered `incidentDate DESC`. The controller passes `@CurrentUser() currentUser: User` through.

- [ ] **Step 4: Run tests and build**

Run: `cd BE && npx jest src/modules/incidents && npm run build`
Expected: all incident tests PASS; build succeeds.

- [ ] **Step 5: Smoke-test against the running backend**

Run `npm run start:dev` in `BE`, then open `http://localhost:3000/api/docs` (Swagger) and confirm the six `Incident Reports` endpoints appear. Stop the server.

- [ ] **Step 6: Commit**

```bash
cd BE && npx prettier --write src/modules/incidents
git add src/modules/incidents
git commit -m "feat(incidents): approve, reject, resolve and list incident reports"
```

---

### Task 4: Frontend service, types and helpers

**Files:**
- Create: `FE/src/app/pages/service/incident-report.service.ts`
- Create: `FE/src/app/pages/incidentreports/incident-report.utils.ts`
- Create: `FE/src/app/pages/incidentreports/incident-report.utils.spec.ts`

**Interfaces:**
- Consumes: Task 3 HTTP API at `${environment.apiUrl}/incident-reports`.
- Produces (in the service file): `type IncidentType = 'Damage' | 'Malfunction' | 'Lost/Missing' | 'Theft' | 'Safety Hazard' | 'Other'`, `type IncidentSeverity = 'Low' | 'Medium' | 'High'`, `type IncidentStatus = 'Pending' | 'Approved' | 'Resolved' | 'Rejected'`, constants `INCIDENT_TYPES: IncidentType[]`, `INCIDENT_SEVERITIES: IncidentSeverity[]`, `INCIDENT_STATUSES: IncidentStatus[]` (in those orders), `interface IncidentReport` (fields from the Task 1 entity; users as `{ userId; firstName; lastName }`, asset as `{ assetId; assetName; campus? }`), `interface CreateIncidentReportPayload { asset: string; incidentType: IncidentType; severity: IncidentSeverity; incidentDate: string; description: string }`.
- Produces `@Injectable({ providedIn: 'root' }) class IncidentReportService`: `create(payload): Observable<IncidentReport>`, `getAll(params?: { status?: IncidentStatus; assetId?: string }): Observable<IncidentReport[]>`, `getByAsset(assetId: string): Observable<IncidentReport[]>`, `approve(id: string)`, `reject(id: string, reason: string)`, `resolve(id: string, resolutionNotes: string)` — each `Observable<IncidentReport>`.
- Produces (utils): `incidentStatusTagClass(status: IncidentStatus): string` → `tag-pending` / `tag-info` / `tag-success` / `tag-danger`; `incidentSeverityTagClass(severity: IncidentSeverity): string` → High `tag-danger`, Medium `tag-warning`, Low `tag-success`; `isIncidentReviewer(role: string | undefined): boolean` → true for `LabTech`, `CampusAdmin`, `SuperAdmin`; `renderIncidentHistoryHtml(incidents: IncidentReport[], escape: (v: unknown) => string, formatDate: (d: string | Date) => string): string`.

- [ ] **Step 1: Write the failing tests** (Jasmine)

```ts
it('maps statuses to pill classes', () => {
  expect(incidentStatusTagClass('Pending')).toBe('tag-pending');
  expect(incidentStatusTagClass('Approved')).toBe('tag-info');
  expect(incidentStatusTagClass('Resolved')).toBe('tag-success');
  expect(incidentStatusTagClass('Rejected')).toBe('tag-danger');
});
it('maps severities to pill classes', ...);           // High tag-danger, Medium tag-warning, Low tag-success
it('treats only LabTech, CampusAdmin and SuperAdmin as reviewers', ...);  // Faculty and undefined → false
it('escapes user text in the history HTML', () => {
  const html = renderIncidentHistoryHtml([{ ...sample, description: '<img src=x onerror=alert(1)>' }], AssetUtils.escapeHtml, (d) => String(d));
  expect(html).not.toContain('<img src=x');
  expect(html).toContain('&lt;img');
});
it('shows the count and rejection reason / resolution notes when present', ...);
it('renders an empty-state message for no incidents', ...);    // contains 'No incident reports'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd FE && npx ng test --include='**/incident-report.utils.spec.ts' --watch=false --browsers=ChromeHeadless`
Expected: FAIL — module `./incident-report.utils` not found.

- [ ] **Step 3: Implement the service and utils**

`renderIncidentHistoryHtml` returns the same accordion markup as the Maintenance History block in `assets.ts` (`accordion-section` / `accordion-header` / `accordion-content`, header text `⚠️ Incident History (n)`), one card per incident with type, severity, status, incident date, reporter name, description, and the rejection reason or resolution notes when set. Every user-provided value goes through `escape`.

- [ ] **Step 4: Run tests and type-check**

Run: `cd FE && npx ng test --include='**/incident-report.utils.spec.ts' --watch=false --browsers=ChromeHeadless && npx tsc -p tsconfig.app.json --noEmit`
Expected: specs PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
cd FE && npx prettier --write src/app/pages/service/incident-report.service.ts src/app/pages/incidentreports
git add src/app/pages/service/incident-report.service.ts src/app/pages/incidentreports/incident-report.utils.ts src/app/pages/incidentreports/incident-report.utils.spec.ts
git commit -m "feat(incidents): add incident report service and UI helpers"
```

---

### Task 5: Report Incident dialog on each asset row

**Files:**
- Create: `FE/src/app/pages/assets/components/report-incident-dialog.ts`
- Modify: `FE/src/app/pages/assets/assets.ts` (row buttons near line 213; component `imports`; dialog tag beside the Request Maintenance dialog near line 617)

**Interfaces:**
- Consumes: Task 4 `IncidentReportService.create`, `INCIDENT_TYPES`, `INCIDENT_SEVERITIES`, `isIncidentReviewer`; `ErrorHandlerService.handleHttpError(error, context)`; `AuthService.getCurrentUser()`.
- Produces: standalone `ReportIncidentDialogComponent`, selector `app-report-incident-dialog`, extends `BaseComponent`. Inputs `asset: { assetId: string | number; assetName?: string } | null`, `visible: boolean`; outputs `visibleChange: EventEmitter<boolean>`, `submitted: EventEmitter<IncidentReport>`.

- [ ] **Step 1: Build the dialog**

`p-dialog` header "Report Incident", width `380px` (same compact style as the Request Maintenance dialog). Fields, all required: disabled Asset name; Type `p-select` over `INCIDENT_TYPES`; Severity `p-select` over `INCIDENT_SEVERITIES`; Incident Date `<input type="date">` defaulting to today and with `max` = today (both as `YYYY-MM-DD` in local time); Description textarea. Missing or blank field → `MessageService` warn "All fields are required". Submit sends `incidentDate` as the `YYYY-MM-DD` string. On success: SweetAlert success with text "Incident recorded" if `isIncidentReviewer(role)` else "Incident submitted for approval"; emit `submitted`, close. On error: `errorHandler.handleHttpError(error, 'Report incident')`. Reset the form each time it opens.

- [ ] **Step 2: Wire it into the assets page**

Add a row button `pi pi-exclamation-triangle`, `p-button-warn`, tooltip "Report Incident", shown for all roles when `asset.status?.statusName !== 'Retired'`, calling `reportIncident(asset)` which sets `incidentAsset` and `incidentDialog = true`. Add `<app-report-incident-dialog [asset]="incidentAsset" [(visible)]="incidentDialog" />`.

- [ ] **Step 3: Type-check and build**

Run: `cd FE && npx tsc -p tsconfig.app.json --noEmit && npm run build`
Expected: no errors (existing budget warnings are acceptable).

- [ ] **Step 4: Manual check** (needs `BE` running locally and `npm start` in `FE`)

As Faculty: file an incident → "Incident submitted for approval". As LabTech: file one → "Incident recorded". Retired asset: no button. Verify rows in `incident_reports` with statuses `Pending` and `Approved`.

- [ ] **Step 5: Commit**

```bash
cd FE && npx prettier --write src/app/pages/assets/components/report-incident-dialog.ts src/app/pages/assets/assets.ts
git add src/app/pages/assets/components/report-incident-dialog.ts src/app/pages/assets/assets.ts
git commit -m "feat(incidents): report an incident from the asset list"
```

---

### Task 6: Incident history and Print Report in the asset View dialog

**Files:**
- Create: `FE/src/app/pages/service/asset-report-pdf.service.ts`
- Modify: `FE/src/app/pages/assets/assets.ts` — `view(item)` (around lines 1815–2104)

**Interfaces:**
- Consumes: Task 4 `IncidentReportService.getByAsset`, `renderIncidentHistoryHtml`; existing `AssetUtils.escapeHtml`, `this.formatDate`.
- Produces: `@Injectable({ providedIn: 'root' }) class AssetReportPdfService` with `generate(asset: any, maintenanceHistory: any[], incidents: IncidentReport[]): void`, saving `asset-report-<assetId>.pdf`.

- [ ] **Step 1: Write the PDF service**

`jsPDF` + `autoTable` as imported in `masterplan-pdf.service.ts`. Content, in order: title "Asset Report", asset name and ID, generated date; "Asset Details" two-column table (name, ID, category, brand, status, campus, laboratory, purpose — each `'N/A'` when missing); "Maintenance History" table (Request ID, Type, Service, Priority, Status, Requested); "Incident History" table (ID, Type, Severity, Status, Incident Date, Reported By, Description). Start each table at the previous `finalY + 10`. An empty history renders a single row "No records".

- [ ] **Step 2: Extend `view(item)`**

Add `incidents: this.incidentReportService.getByAsset(String(item.assetId)).pipe(catchError(() => of([])))` to the existing `forkJoin`. Insert `renderIncidentHistoryHtml(incidents, AssetUtils.escapeHtml, (d) => this.formatDate(d))` immediately after `${maintenanceHtml}`. Add a Print Report button using SweetAlert's cancel slot: `showCancelButton: true`, `cancelButtonText: 'Print Report'`, `cancelButtonColor: '#0ea5e9'`; in `.then`, when `result.dismiss === Swal.DismissReason.cancel`, call `this.assetReportPdfService.generate(fullAsset, assetMaintenanceHistory, incidents)`. Keep the existing Close and Edit Asset behavior unchanged.

- [ ] **Step 3: Type-check and build**

Run: `cd FE && npx tsc -p tsconfig.app.json --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 4: Manual check**

Open View on the asset from Task 5: "Incident History (2)" lists both incidents. File one with description `<b>bold</b>` → it shows literally. Click Print Report → `asset-report-<id>.pdf` downloads with all three sections; an asset with no history prints "No records" twice.

- [ ] **Step 5: Commit**

```bash
cd FE && npx prettier --write src/app/pages/service/asset-report-pdf.service.ts src/app/pages/assets/assets.ts
git add src/app/pages/service/asset-report-pdf.service.ts src/app/pages/assets/assets.ts
git commit -m "feat(incidents): show incident history and print an asset report"
```

---

### Task 7: Incident Reports page, route and menu

**Files:**
- Create: `FE/src/app/pages/incidentreports/incident-reports.component.ts`
- Modify: `FE/src/app/pages/pages.routes.ts` (add `{ path: 'incidentreports', component: IncidentReportsComponent }` before `'**'`)
- Modify: `FE/src/app/layout/component/app.menu.ts` (add the menu item in all four role menus: `loadSuperAdminMenu`, CampusAdmin, Faculty, LabTech — directly after "Request Maintenance")

**Interfaces:**
- Consumes: Task 4 service and utils; `ErrorHandlerService`; `AuthService.getCurrentUser()`; `BaseComponent`.
- Produces: standalone `IncidentReportsComponent`, selector `app-incident-reports`. Menu item: `{ label: 'Incident Reports', icon: 'pi pi-fw pi-exclamation-triangle', routerLink: ['/app/pages/incidentreports'] }`.

- [ ] **Step 1: Build the page**

Mirror the layout and CSS classes of `requestmaintenance.component.ts` (tab bar, `table-wrapper`, `tag` pills incl. `tag-pending`, paginator, search, CSV export button). Tabs in order: All, Pending, Approved, Resolved, Rejected; a tab filters the single list loaded by `getAll()` client-side. Columns: ID, Asset, Type, Severity (pill via `incidentSeverityTagClass`), Incident Date, Reported By, Status (pill via `incidentStatusTagClass`), Actions. Actions: View (everyone; SweetAlert with full details, all text escaped); when `isIncidentReviewer(role)`: Approve + Reject on Pending rows, Resolve on Approved rows. Reject prompts with a required textarea "Reason"; Resolve prompts with a required textarea "Resolution notes" (blank → `Swal.showValidationMessage`). After each action: success toast and reload. Subscriptions use `takeUntil(this.destroy$)`; errors go to `handleHttpError(error, '<action> incident report')`. CSV columns match the table minus Actions; file name `incident-reports-<tab>.csv`.

- [ ] **Step 2: Add the route and menu items, then build**

Run: `cd FE && npx tsc -p tsconfig.app.json --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Manual check**

As LabTech: the Pending tab shows the Faculty report → Approve → it moves to Approved → Resolve with notes → Resolved. Reject another with a reason → Rejected. As Faculty: the page loads with no action buttons except View. Search by asset name filters rows. CSV export downloads.

- [ ] **Step 4: Commit**

```bash
cd FE && npx prettier --write src/app/pages/incidentreports/incident-reports.component.ts src/app/pages/pages.routes.ts src/app/layout/component/app.menu.ts
git add src/app/pages/incidentreports/incident-reports.component.ts src/app/pages/pages.routes.ts src/app/layout/component/app.menu.ts
git commit -m "feat(incidents): add Incident Reports page with review actions"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1: Full automated checks**

Run: `cd BE && npx jest src/modules/incidents src/modules/maintenance && npm run build`
Expected: all suites PASS; build succeeds.
Run: `cd FE && npx ng test --include='**/incident-report.utils.spec.ts' --watch=false --browsers=ChromeHeadless && npm run build`
Expected: PASS; build succeeds.

- [ ] **Step 2: Walk the spec's verification scenario**

Spec section "Verification": Faculty files → Pending on the page → LabTech approves → resolves; LabTech files → Approved immediately; asset View shows history; Print Report downloads a PDF with all three sections. Also run the five Review Focus cases by hand once.

- [ ] **Step 3: Report**

Summarize results to the user, including that the Render backend needs a redeploy and the migration must be run on any other database. Do not push or open PRs unless asked.
