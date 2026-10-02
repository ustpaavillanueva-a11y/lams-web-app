# LAMS Fix Checklist

## Assets
- [ ] **Categories:** show the category on each asset (list, detail, forms, exports). *(Needs client clarification, see Open Questions.)*
- [ ] **Unserviceable color:** change the status color/badge for "Unserviceable" so it stands out from the other statuses. Apply it everywhere the status is shown (tables, dashboard, reports).
- [ ] **Asset condition/origin:** add Brand New, Transferred, Replaced and Old as selectable values.
  - [ ] Add the field to the create/edit form.
  - [ ] Show it in the list and detail views.
  - [ ] Include it in filters and exports.
  - [ ] Confirm the backend DTO/entity accepts the new field. A previous bug came from an unwhitelisted `qrCode` field causing a 400.
- [ ] **Set/bundle items:** let a set or bundle be split into separate pieces.
  - [ ] Decide the data model: parent asset with child components, or separate records linked to a bundle.
  - [ ] Add UI to create and list the individual pieces.
  - [ ] Add per-piece status, QR code and property number.

## Maintenance
- [ ] **Show all maintenance:** the list currently seems filtered. Show every record, or add a clear "All" filter. Check both the frontend query and the backend filter/pagination.
- [ ] **Faculty report:** add an "All Maintenance Requests" report for the faculty role.
  - [ ] Add the route/menu entry for Faculty.
  - [ ] Add the table and export (PDF/Excel).
- [ ] **Lab tech statistics:** add a maintenance statistics view for lab techs.
  - [ ] Add counts by status and by type/asset.
  - [ ] Add charts using the shared `chart-wrapper` and `stats-card` components.
  - [ ] Add the section to `DashboardLabTech`.
- [ ] **Each maintenance type:** show a count/chart per type (Preventive, Corrective, Calibration). *(Needs client clarification.)*

## Dashboard
- [ ] **Date and time:** show a live current date and time on the dashboard for all roles.
- [ ] **"Sa dashboard na siya" item:** the client forgot the exact output. *(Needs client clarification.)*

## Master Plan
- [ ] **Property number:** include the property number on the master plan table, the master plan PDF (`masterplan-pdf.service.ts`) and any exports.

## Open Questions for the Clients
1. **Categories:** which screen needs categories, and for what? Asset list, master plan, a report, or maintenance? Do they mean Hardware/Software, or the maintenance type?
2. **"Each maintenance type ata na":** do they want a count or chart per type (Preventive, Corrective, Calibration), and on which dashboard or report?
3. **"Sa dashboard na siya bay, kalimot ko unsay exact output ani":** what was supposed to show on the dashboard? Which role, and is it a count, a chart or a list?
4. **Asset condition/origin:** should Brand New / Transferred / Replaced / Old be a new field or an extension of the existing status? (Assumed a new field.)
