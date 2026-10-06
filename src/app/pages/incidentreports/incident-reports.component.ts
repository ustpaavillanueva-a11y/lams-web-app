import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { takeUntil } from 'rxjs';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import Swal from 'sweetalert2';
import { BaseComponent } from '../../core/base/base.component';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { AuthService } from '../service/auth.service';
import { IncidentReport, IncidentReportService, IncidentStatus } from '../service/incident-report.service';
import { IncidentReportPdfService } from '../service/incident-report-pdf.service';
import { AssetUtils } from '../assets/utils/asset.utils';
import { formatIncidentTime, formatYesNo, incidentLocation, incidentStatusTagClass, isIncidentReviewer } from './incident-report.utils';

const TAB_LABELS = ['All', 'Pending', 'Approved', 'Resolved', 'Rejected'];

@Component({
    selector: 'app-incident-reports',
    standalone: true,
    imports: [CommonModule, FormsModule, ToolbarModule, ButtonModule, IconFieldModule, InputIconModule, InputTextModule, ToastModule, TooltipModule],
    providers: [MessageService],
    styles: [
        `
            .incident-container {
                padding: 1rem;
            }

            .btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 0.375rem;
                cursor: pointer;
                font-size: 0.875rem;
                font-weight: 500;
                transition: all 0.2s;
            }

            .btn-primary {
                background: #3b82f6;
                color: white;
            }

            .btn-primary:hover {
                background: #2563eb;
            }

            .btn-secondary {
                background: #e5e7eb;
                color: #1f2937;
            }

            .btn-secondary:hover {
                background: #d1d5db;
            }

            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .tabs-container {
                margin-bottom: 1.5rem;
            }

            .tab-headers {
                display: flex;
                gap: 0;
                border-bottom: 2px solid #e5e7eb;
                background: #fafafa;
            }

            .tab-header {
                padding: 1rem 1.5rem;
                cursor: pointer;
                border: none;
                background: transparent;
                font-size: 0.875rem;
                font-weight: 500;
                color: #6b7280;
                border-bottom: 3px solid transparent;
                margin-bottom: -2px;
                transition: all 0.2s;
            }

            .tab-header:hover {
                color: #1f2937;
                background: #f3f4f6;
            }

            .tab-header.active {
                color: #2563eb;
                border-bottom-color: #2563eb;
                background: white;
            }

            .tab-content {
                display: none;
                animation: fadeIn 0.2s ease-in;
            }

            .tab-content.active {
                display: block;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            .table-wrapper {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
            }

            .table-scroll-container {
                position: relative;
            }

            .table-wrapper.scrollable {
                overflow-x: auto;
                scrollbar-width: none;
            }

            .table-wrapper.scrollable::-webkit-scrollbar {
                display: none;
            }

            .table-wrapper.scrollable table {
                table-layout: auto;
                min-width: 1150px;
            }

            .table-wrapper.scrollable th,
            .table-wrapper.scrollable td {
                white-space: nowrap;
                word-break: normal;
            }

            .scroll-columns-btn {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                z-index: 5;
                display: flex;
                align-items: center;
                gap: 0.35rem;
                padding: 0.4rem 0.75rem;
                border-radius: 999px;
                border: 1px solid #e5e7eb;
                background: white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: 500;
                color: #374151;
            }

            .scroll-columns-btn:hover {
                background: #f3f4f6;
            }

            table {
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
                font-size: 14px;
            }

            table thead {
                background: #f3f4f6;
                border-bottom: 2px solid #e5e7eb;
            }

            table th {
                padding: 6px 8px;
                text-align: left;
                font-size: 15px;
                font-weight: 600;
                color: #374151;
                white-space: normal;
                word-break: break-word;
            }

            table td {
                padding: 6px 8px;
                border-bottom: 1px solid #e5e7eb;
                color: #1f2937;
                font-size: 14px;
                white-space: normal;
                word-break: break-word;
            }

            table tbody tr:hover {
                background: #eff6ff;
            }

            table tbody tr:last-child td {
                border-bottom: none;
            }

            .tag {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .tag-danger {
                background: #fee2e2;
                color: #991b1b;
            }

            .tag-warning {
                background: #fef08a;
                color: #92400e;
            }

            .tag-success {
                background: #dcfce7;
                color: #166534;
            }

            .tag-info {
                background: #dbeafe;
                color: #1e40af;
            }

            .tag-pending {
                background: #ffedd5;
                color: #9a3412;
            }

            .actions {
                display: flex;
                gap: 0.5rem;
            }

            .paginator {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0.5rem 1rem;
                background: transparent;
                border-top: 1px solid var(--p-datatable-border-color, #dee2e6);
                font-size: 14px;
                gap: 0.25rem;
            }

            .paginator select {
                padding: 0.5rem 2rem 0.5rem 0.75rem;
                border: 1px solid var(--p-select-border-color, #ced4da);
                border-radius: 6px;
                font-size: 14px;
                background: white;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 0.5rem center;
            }

            .paginator button {
                width: 2.5rem;
                height: 2.5rem;
                padding: 0;
                border: none;
                border-radius: 50%;
                background: transparent;
                cursor: pointer;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: var(--p-text-color, #495057);
                transition:
                    background-color 0.2s,
                    color 0.2s;
            }

            .paginator button:hover:not(:disabled) {
                background: var(--p-content-hover-background, rgba(0, 0, 0, 0.04));
            }

            .paginator button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .paginator button i {
                font-size: 14px;
            }

            .paginator-info {
                color: var(--p-text-muted-color, #6c757d);
                padding: 0 0.5rem;
            }

            .paginator .page-number {
                width: 2.5rem;
                height: 2.5rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: var(--p-primary-color, #3b82f6);
                color: white;
                font-weight: 500;
            }

            .empty-message {
                padding: 2rem;
                text-align: center;
                color: #6b7280;
            }

            .modal-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
                align-items: center;
                justify-content: center;
            }

            .modal-overlay.active {
                display: flex;
            }

            .modal {
                background: white;
                border-radius: 0.5rem;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            }

            .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
                font-weight: 600;
                color: #1f2937;
            }

            .modal-body {
                padding: 1.5rem;
            }

            .modal-footer {
                padding: 1.5rem;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
            }

            .form-group {
                margin-bottom: 1rem;
            }

            .form-label {
                display: block;
                font-size: 0.875rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 0.5rem;
            }

            .form-control {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid #d1d5db;
                border-radius: 0.375rem;
                font-size: 0.875rem;
            }

            .form-control:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            textarea.form-control {
                resize: vertical;
                min-height: 100px;
            }
        `
    ],
    template: `
        <p-toast />
        <div class="incident-container">
            <p-toolbar styleClass="mb-4">
                <ng-template #start>
                    <h3 class="m-0">Incident Reports</h3>
                </ng-template>
                <ng-template #end>
                    <div class="flex items-center gap-2">
                        <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" [(ngModel)]="searchValue" (input)="applyFilters()" placeholder="Search incident reports..." />
                        </p-iconfield>
                    </div>
                </ng-template>
            </p-toolbar>

            <div class="tabs-container">
                <div class="tab-headers">
                    <button *ngFor="let label of tabLabels; let i = index" class="tab-header" [class.active]="activeTabIndex === i" (click)="onTabChange(i)">{{ label }}</button>
                </div>

                <div class="tab-content active">
                    <div class="table-wrapper" *ngIf="!loading">
                        <table *ngIf="filteredItems.length > 0">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Asset</th>
                                    <th>Person(s) Involved</th>
                                    <th>Location</th>
                                    <th>Incident Date</th>
                                    <th>Reported By</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let row of paginatedItems">
                                    <td>{{ row.incidentId }}</td>
                                    <td>{{ row.asset?.assetName }}</td>
                                    <td>{{ row.personsInvolved || 'N/A' }}</td>
                                    <td>{{ location(row) || 'N/A' }}</td>
                                    <td>{{ row.incidentDate | date: 'mediumDate' }} {{ time(row) }}</td>
                                    <td>{{ reporterName(row) }}</td>
                                    <td>
                                        <span class="tag" [ngClass]="statusClass(row)">{{ row.status }}</span>
                                    </td>
                                    <td>
                                        <div class="actions">
                                            <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" pTooltip="View" (onClick)="view(row)" />
                                            <p-button icon="pi pi-file-pdf" severity="danger" [rounded]="true" [text]="true" pTooltip="Export PDF" (onClick)="exportPdf(row)" />
                                            <ng-container *ngIf="isReviewer">
                                                <ng-container *ngIf="row.status === 'Pending'">
                                                    <p-button icon="pi pi-check" severity="success" [rounded]="true" [text]="true" pTooltip="Approve" (onClick)="approve(row)" />
                                                    <p-button icon="pi pi-times" severity="danger" [rounded]="true" [text]="true" pTooltip="Reject" (onClick)="reject(row)" />
                                                </ng-container>
                                                <p-button *ngIf="row.status === 'Approved'" icon="pi pi-verified" severity="success" [rounded]="true" [text]="true" pTooltip="Resolve" (onClick)="resolve(row)" />
                                            </ng-container>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="paginator" *ngIf="filteredItems.length > 0">
                            <span class="paginator-info">Showing {{ pageStart }} to {{ pageEnd }} of {{ filteredItems.length }} incident reports</span>
                            <button [disabled]="page === 1" (click)="goToPage(1)"><i class="pi pi-angle-double-left"></i></button>
                            <button [disabled]="page === 1" (click)="goToPage(page - 1)"><i class="pi pi-angle-left"></i></button>
                            <span class="page-number">{{ page }}</span>
                            <button [disabled]="page === totalPages" (click)="goToPage(page + 1)"><i class="pi pi-angle-right"></i></button>
                            <button [disabled]="page === totalPages" (click)="goToPage(totalPages)"><i class="pi pi-angle-double-right"></i></button>
                            <select [value]="rowsPerPage" (change)="onRowsPerPageChange($event)">
                                <option *ngFor="let opt of rowsPerPageOptions" [value]="opt">{{ opt }}</option>
                            </select>
                        </div>
                        <div class="empty-message" *ngIf="filteredItems.length === 0">No incident reports found</div>
                    </div>
                    <div class="empty-message" *ngIf="loading">Loading...</div>
                </div>
            </div>
        </div>
    `
})
export class IncidentReportsComponent extends BaseComponent implements OnInit {
    tabLabels = TAB_LABELS;
    activeTabIndex = 0;
    searchValue = '';
    loading = false;
    items: IncidentReport[] = [];
    filteredItems: IncidentReport[] = [];
    page = 1;
    rowsPerPage = 10;
    rowsPerPageOptions = [5, 10, 20, 50];
    isReviewer = false;

    constructor(
        private incidentService: IncidentReportService,
        private authService: AuthService,
        private errorHandler: ErrorHandlerService,
        private messageService: MessageService,
        private incidentPdfService: IncidentReportPdfService
    ) {
        super();
    }

    ngOnInit(): void {
        this.isReviewer = isIncidentReviewer(this.authService.getCurrentUser()?.role);
        this.load();
    }

    load(): void {
        this.loading = true;
        this.incidentService
            .getAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.items = data ?? [];
                    this.loading = false;
                    this.applyFilters();
                },
                error: (error) => {
                    this.loading = false;
                    this.errorHandler.handleHttpError(error, 'load incident reports');
                }
            });
    }

    onTabChange(index: number): void {
        this.activeTabIndex = index;
        this.applyFilters();
    }

    applyFilters(): void {
        const status = this.activeTabIndex === 0 ? null : (TAB_LABELS[this.activeTabIndex] as IncidentStatus);
        const term = this.searchValue.trim().toLowerCase();
        this.filteredItems = this.items.filter((row) => {
            if (status && row.status !== status) return false;
            if (!term) return true;
            const haystack = [row.incidentId, row.asset?.assetName, row.personsInvolved, this.location(row), row.status, this.reporterName(row), row.description].join(' ').toLowerCase();
            return haystack.includes(term);
        });
        this.page = 1;
    }

    // Pagination
    get totalPages(): number {
        return Math.max(1, Math.ceil(this.filteredItems.length / this.rowsPerPage));
    }
    get paginatedItems(): IncidentReport[] {
        const start = (this.page - 1) * this.rowsPerPage;
        return this.filteredItems.slice(start, start + this.rowsPerPage);
    }
    get pageStart(): number {
        return this.filteredItems.length === 0 ? 0 : (this.page - 1) * this.rowsPerPage + 1;
    }
    get pageEnd(): number {
        return Math.min(this.page * this.rowsPerPage, this.filteredItems.length);
    }
    goToPage(p: number): void {
        this.page = Math.min(Math.max(1, p), this.totalPages);
    }
    onRowsPerPageChange(event: Event): void {
        this.rowsPerPage = Number((event.target as HTMLSelectElement).value);
        this.page = 1;
    }

    // Helpers
    reporterName(row: IncidentReport): string {
        return row.reportedBy ? `${row.reportedBy.firstName} ${row.reportedBy.lastName}`.trim() : '';
    }
    statusClass(row: IncidentReport): string {
        return incidentStatusTagClass(row.status);
    }
    location(row: IncidentReport): string {
        return incidentLocation(row);
    }
    time(row: IncidentReport): string {
        return formatIncidentTime(row.incidentTime);
    }

    // Actions
    view(row: IncidentReport): void {
        const e = AssetUtils.escapeHtml;
        const fullName = (u?: { firstName: string; lastName: string } | null) => (u ? `${e(u.firstName)} ${e(u.lastName)}` : 'N/A');
        const date = (v?: string | null) => (v ? e(new Date(v).toLocaleString()) : 'N/A');
        const line = (label: string, value: string) => `<p style="margin: 4px 0;"><strong>${label}:</strong> ${value}</p>`;
        let html =
            line('Incident ID', e(row.incidentId)) +
            line('Asset', e(row.asset?.assetName)) +
            line('Status', e(row.status)) +
            line('Person(s) Involved', e(row.personsInvolved || 'N/A')) +
            line('Incident Date', e(new Date(row.incidentDate).toLocaleDateString())) +
            line('Time', e(this.time(row) || 'N/A')) +
            line('Location', e(this.location(row) || 'N/A')) +
            line('Description', e(row.description)) +
            line('Witnesses', e(formatYesNo(row.hasWitnesses) || 'N/A')) +
            line('Person Injured', e(formatYesNo(row.hasInjuredPerson) || 'N/A')) +
            line('Reported By', fullName(row.reportedBy));
        if (row.reviewedBy || row.reviewedAt) html += line('Reviewed By', fullName(row.reviewedBy)) + line('Reviewed At', date(row.reviewedAt));
        if (row.rejectionReason) html += line('Rejection Reason', e(row.rejectionReason));
        if (row.resolvedBy || row.resolvedAt) html += line('Resolved By', fullName(row.resolvedBy)) + line('Resolved At', date(row.resolvedAt));
        if (row.resolutionNotes) html += line('Resolution Notes', e(row.resolutionNotes));
        Swal.fire({ title: 'Incident Report', html: `<div style="text-align: left; font-size: 14px;">${html}</div>`, confirmButtonText: 'Close' });
    }

    approve(row: IncidentReport): void {
        Swal.fire({
            title: 'Approve incident report?',
            html: `Approve the report for <strong>${AssetUtils.escapeHtml(row.asset?.assetName)}</strong>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Approve'
        }).then((result) => {
            if (!result.isConfirmed) return;
            this.incidentService
                .approve(row.incidentId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => this.afterAction('Incident report approved'),
                    error: (error) => this.errorHandler.handleHttpError(error, 'approve incident report')
                });
        });
    }

    reject(row: IncidentReport): void {
        Swal.fire({
            title: 'Reject incident report',
            input: 'textarea',
            inputLabel: 'Reason',
            inputPlaceholder: 'Enter the reason for rejection',
            showCancelButton: true,
            confirmButtonText: 'Reject',
            confirmButtonColor: '#dc2626',
            preConfirm: (value: string) => {
                if (!value || !value.trim()) {
                    Swal.showValidationMessage('A reason is required');
                    return false;
                }
                return value.trim();
            }
        }).then((result) => {
            if (!result.isConfirmed || !result.value) return;
            this.incidentService
                .reject(row.incidentId, result.value)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => this.afterAction('Incident report rejected'),
                    error: (error) => this.errorHandler.handleHttpError(error, 'reject incident report')
                });
        });
    }

    resolve(row: IncidentReport): void {
        Swal.fire({
            title: 'Resolve incident report',
            input: 'textarea',
            inputLabel: 'Resolution notes',
            inputPlaceholder: 'Describe how the incident was resolved',
            showCancelButton: true,
            confirmButtonText: 'Resolve',
            preConfirm: (value: string) => {
                if (!value || !value.trim()) {
                    Swal.showValidationMessage('Resolution notes are required');
                    return false;
                }
                return value.trim();
            }
        }).then((result) => {
            if (!result.isConfirmed || !result.value) return;
            this.incidentService
                .resolve(row.incidentId, result.value)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => this.afterAction('Incident report resolved'),
                    error: (error) => this.errorHandler.handleHttpError(error, 'resolve incident report')
                });
        });
    }

    private afterAction(message: string): void {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });
        this.load();
    }

    exportPdf(row: IncidentReport): void {
        this.incidentPdfService.generate(row).catch((error) => this.errorHandler.handleError(error, 'export incident report', 'Failed to export the incident report PDF'));
    }

    exportCSV(): void {
        const esc = (value: any) => String(value ?? '').replace(/,/g, ';');
        let csv = 'ID,Asset,Person(s) Involved,Location,Incident Date,Time,Witnesses,Person Injured,Reported By,Status\n';
        this.filteredItems.forEach((row) => {
            csv += `${esc(row.incidentId)},${esc(row.asset?.assetName)},${esc(row.personsInvolved)},${esc(this.location(row))},${esc(row.incidentDate ? new Date(row.incidentDate).toLocaleDateString() : '')},${esc(this.time(row))},${esc(formatYesNo(row.hasWitnesses))},${esc(formatYesNo(row.hasInjuredPerson))},${esc(this.reporterName(row))},${esc(row.status)}\n`;
        });
        const tabName = TAB_LABELS[this.activeTabIndex].toLowerCase();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incident-reports-${tabName}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
