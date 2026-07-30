import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { MaintenanceService } from '../../service/maintenance.service';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
    selector: 'app-maintenance-report',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, TableModule, SelectModule, CardModule, ToastModule, ToolbarModule, TagModule, DatePickerModule],
    providers: [MessageService],
    template: `
        <p-toast />

        <p-toolbar styleClass="mb-4">
            <ng-template #start>
                <h2 class="text-2xl font-bold">Maintenance Report</h2>
            </ng-template>
            <ng-template #end>
                <p-button label="Export to CSV" icon="pi pi-download" severity="success" (onClick)="exportToCSV()" />
                <p-button label="Print" icon="pi pi-print" severity="info" (onClick)="printReport()" class="ml-2" />
            </ng-template>
        </p-toolbar>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="p-4 bg-blue-50 rounded-lg">
                <p class="text-gray-600 text-sm">Total Requests</p>
                <p class="text-3xl font-bold text-blue-600">{{ maintenanceRequests.length }}</p>
            </div>
            <div class="p-4 bg-yellow-50 rounded-lg">
                <p class="text-gray-600 text-sm">Pending</p>
                <p class="text-3xl font-bold text-yellow-600">{{ getPendingCount() }}</p>
            </div>
            <div class="p-4 bg-green-50 rounded-lg">
                <p class="text-gray-600 text-sm">Approved</p>
                <p class="text-3xl font-bold text-green-600">{{ getApprovedCount() }}</p>
            </div>
            <div class="p-4 bg-purple-50 rounded-lg">
                <p class="text-gray-600 text-sm">Completed</p>
                <p class="text-3xl font-bold text-purple-600">{{ getCompletedCount() }}</p>
            </div>
        </div>

        <p-card class="mb-4">
            <ng-template #header>
                <div class="flex gap-4 p-4 flex-wrap">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium mb-2">Status Filter</label>
                        <p-select [(ngModel)]="selectedStatus" [options]="['Pending', 'Approved', 'Completed', 'All']" placeholder="All Status" (onChange)="filterRequests()" />
                    </div>
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium mb-2">Priority Filter</label>
                        <p-select [(ngModel)]="selectedPriority" [options]="['Urgent', 'High', 'Normal', 'Low', 'All']" placeholder="All Priorities" (onChange)="filterRequests()" />
                    </div>
                    <div class="flex items-end">
                        <p-button label="Clear Filters" icon="pi pi-times" severity="secondary" (onClick)="clearFilters()" />
                    </div>
                </div>
            </ng-template>

            <p-table [value]="filteredRequests" responsiveLayout="scroll" [paginator]="true" [rows]="10">
                <ng-template #header>
                    <tr>
                        <th pSortableColumn>Request Name <p-sortIcon field="maintenanceName" /></th>
                        <th pSortableColumn>Type <p-sortIcon field="maintenanceTypeName" /></th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Service</th>
                        <th pSortableColumn>Date <p-sortIcon field="createdDate" /></th>
                    </tr>
                </ng-template>
                <ng-template #body let-req>
                    <tr>
                        <td>{{ req.maintenanceName || 'N/A' }}</td>
                        <td>{{ req.maintenanceTypeName || 'N/A' }}</td>
                        <td>
                            <p-tag [value]="getPriorityLabel(req.priorityLevelName)" [severity]="getPrioritySeverity(req.priorityLevelName)" />
                        </td>
                        <td>
                            <p-tag [value]="req.requestStatusName || 'Pending'" [severity]="getStatusSeverity(req.requestStatusName)" />
                        </td>
                        <td>{{ req.serviceMaintenanceName || 'N/A' }}</td>
                        <td>{{ formatDate(req.createdDate) }}</td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="6" class="text-center p-4">No maintenance requests found.</td>
                    </tr>
                </ng-template>
            </p-table>
        </p-card>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p-card>
                <ng-template #header>
                    <h3 class="text-lg font-bold p-4">Requests by Status</h3>
                </ng-template>
                <p-table [value]="getStatusBreakdown()">
                    <ng-template #header>
                        <tr>
                            <th>Status</th>
                            <th>Count</th>
                            <th>Percentage</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-row>
                        <tr>
                            <td>{{ row.status }}</td>
                            <td>{{ row.count }}</td>
                            <td>{{ ((row.count / maintenanceRequests.length) * 100).toFixed(2) }}%</td>
                        </tr>
                    </ng-template>
                </p-table>
            </p-card>

            <p-card>
                <ng-template #header>
                    <h3 class="text-lg font-bold p-4">Requests by Priority</h3>
                </ng-template>
                <p-table [value]="getPriorityBreakdown()">
                    <ng-template #header>
                        <tr>
                            <th>Priority</th>
                            <th>Count</th>
                            <th>Percentage</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-row>
                        <tr>
                            <td>{{ row.priority }}</td>
                            <td>{{ row.count }}</td>
                            <td>{{ ((row.count / maintenanceRequests.length) * 100).toFixed(2) }}%</td>
                        </tr>
                    </ng-template>
                </p-table>
            </p-card>
        </div>
    `,
    styles: [
        `
            :host ::ng-deep {
                .p-card {
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
            }
        `
    ]
})
export class MaintenanceReportComponent implements OnInit {
    maintenanceRequests: any[] = [];
    filteredRequests: any[] = [];
    selectedStatus: string = 'All';
    selectedPriority: string = 'All';

    constructor(
        private maintenanceService: MaintenanceService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadMaintenanceRequests();
    }

    loadMaintenanceRequests() {
        this.maintenanceService.getMaintenanceRequests().subscribe({
            next: (data) => {
                this.maintenanceRequests = data;
                this.filteredRequests = data;
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load maintenance requests' });
            }
        });
    }

    filterRequests() {
        this.filteredRequests = this.maintenanceRequests.filter((req) => {
            const matchStatus = this.selectedStatus === 'All' || (req.requestStatusName || 'Pending') === this.selectedStatus;
            const matchPriority = this.selectedPriority === 'All' || (req.priorityLevelName || 'Normal') === this.selectedPriority;
            return matchStatus && matchPriority;
        });
    }

    clearFilters() {
        this.selectedStatus = 'All';
        this.selectedPriority = 'All';
        this.filteredRequests = this.maintenanceRequests;
    }

    getPendingCount(): number {
        return this.maintenanceRequests.filter((r) => (r.requestStatusName || 'Pending') === 'Pending').length;
    }

    getApprovedCount(): number {
        return this.maintenanceRequests.filter((r) => r.requestStatusName === 'Approved').length;
    }

    getCompletedCount(): number {
        return this.maintenanceRequests.filter((r) => r.requestStatusName === 'Completed').length;
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const statusMap: { [key: string]: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' } = {
            Pending: 'warn',
            Approved: 'info',
            Completed: 'success'
        };
        return statusMap[status] || 'secondary';
    }

    getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const priorityMap: { [key: string]: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' } = {
            Urgent: 'danger',
            High: 'warn',
            Normal: 'info',
            Low: 'success'
        };
        return priorityMap[priority] || 'secondary';
    }

    getPriorityLabel(priority: string): string {
        return priority || 'Normal';
    }

    getStatusBreakdown(): any[] {
        const breakdown: { [key: string]: number } = {};
        this.maintenanceRequests.forEach((req) => {
            const status = req.requestStatusName || 'Pending';
            breakdown[status] = (breakdown[status] || 0) + 1;
        });
        return Object.entries(breakdown).map(([status, count]) => ({ status, count }));
    }

    getPriorityBreakdown(): any[] {
        const breakdown: { [key: string]: number } = {};
        this.maintenanceRequests.forEach((req) => {
            const priority = req.priorityLevelName || 'Normal';
            breakdown[priority] = (breakdown[priority] || 0) + 1;
        });
        return Object.entries(breakdown).map(([priority, count]) => ({ priority, count }));
    }

    formatDate(date: any): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString();
    }

    exportToCSV() {
        const headers = ['Request Name', 'Type', 'Priority', 'Status', 'Service', 'Date'];
        const rows = this.filteredRequests.map((r) => [r.maintenanceName || 'N/A', r.maintenanceTypeName || 'N/A', r.priorityLevelName || 'Normal', r.requestStatusName || 'Pending', r.serviceMaintenanceName || 'N/A', this.formatDate(r.createdDate)]);

        let csv = headers.join(',') + '\n';
        rows.forEach((row) => {
            csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `maintenance-report-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Exported', detail: 'Maintenance report exported to CSV' });
    }

    printReport() {
        const rows = this.filteredRequests
            .map(
                (r) => `
            <tr>
                <td>${r.maintenanceName || 'N/A'}</td>
                <td>${r.maintenanceTypeName || 'N/A'}</td>
                <td>${r.priorityLevelName || 'Normal'}</td>
                <td>${r.requestStatusName || 'Pending'}</td>
                <td>${r.serviceMaintenanceName || 'N/A'}</td>
                <td>${this.formatDate(r.createdDate)}</td>
            </tr>
        `
            )
            .join('');

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Maintenance Report</title>
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    body { font-family: Arial, sans-serif; padding: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
                    th { background-color: #2563eb !important; color: white !important; padding: 8px 6px; text-align: left; font-weight: bold; border: 1px solid #1d4ed8; }
                    td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                    tr:nth-child(even) { background-color: #f8fafc !important; }
                    .header { text-align: center; margin-bottom: 10px; }
                    .header h2 { margin: 0; font-size: 18px; color: #333; }
                    .meta-info { display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 10px; }
                    @media print { body { margin: 0; padding-bottom: 100px; } .no-print { display: none !important; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } thead { display: table-header-group; } .print-footer-img { position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; padding: 0 10mm; box-sizing: border-box; } }
                </style>
            </head>
            <body>
                <div style="text-align: center; margin-bottom: 10px;">
                    <img src="${window.location.origin}/header.png" style="width: 100%; max-height: 120px; object-fit: contain;" />
                </div>
                <div class="header">
                    <h2>Maintenance Report</h2>
                </div>
                <div class="meta-info">
                    <span>Generated: ${new Date().toLocaleString()}</span>
                    <span>Total Requests: ${this.filteredRequests.length}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Request Name</th>
                            <th>Type</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Service</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="print-footer-img" style="text-align: center; margin-top: 20px;">
                    <img src="${window.location.origin}/footer.png" style="width: 100%; max-height: 80px; object-fit: contain;" />
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
        }
    }
}
