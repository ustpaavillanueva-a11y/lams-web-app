import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { MaintenanceService } from '../../service/maintenance.service';
import { AuthService } from '../../service/auth.service';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-requestmaintenance',
    standalone: true,
    imports: [CommonModule, FormsModule, ToolbarModule, ButtonModule, IconFieldModule, InputIconModule, InputTextModule, ToastModule, TooltipModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    styles: [
        `
            .maintenance-container {
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
                overflow-x: auto;
            }

            table {
                width: 100%;
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
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            table td {
                padding: 6px 8px;
                border-bottom: 1px solid #e5e7eb;
                color: #1f2937;
                font-size: 14px;
                height: 32px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
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
        <div class="maintenance-container">
            <!-- Toolbar -->
            <p-toolbar styleClass="mb-4">
                <ng-template #start>
                    <div class="flex items-center gap-2">
                        <p-button label="Delete Selected" icon="pi pi-trash" severity="secondary" outlined (onClick)="deleteSelected()" [disabled]="!selectedItems.length" />
                    </div>
                </ng-template>
                <ng-template #end>
                    <div class="flex items-center gap-2">
                        <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" [(ngModel)]="searchValue" (input)="filterByTab()" placeholder="Search maintenance requests..." />
                        </p-iconfield>
                    </div>
                </ng-template>
            </p-toolbar>

            <!-- Tabs -->
            <div class="tabs-container">
                <div class="tab-headers">
                    <button class="tab-header" [class.active]="activeTabIndex === 0" (click)="onActiveIndexChange(0)">Pending</button>
                    <button class="tab-header" [class.active]="activeTabIndex === 1" (click)="onActiveIndexChange(1)">Approved</button>
                    <button class="tab-header" [class.active]="activeTabIndex === 2" (click)="onActiveIndexChange(2)">Completed</button>
                </div>

                <!-- Pending Tab -->
                <div class="tab-content" [class.active]="activeTabIndex === 0">
                    <div class="table-wrapper" *ngIf="!loading">
                        <table *ngIf="filteredPendingItems.length > 0">
                            <thead>
                                <tr>
                                    <th style="width: 3rem;">
                                        <input type="checkbox" (change)="toggleSelectAll('pending')" />
                                    </th>
                                    <th>Request ID</th>
                                    <th>Asset Name</th>
                                    <th>Maintenance Type</th>
                                    <th>Service Name</th>
                                    <th>Priority</th>
                                    <th>Request Date</th>
                                    <th>Requested By</th>
                                    <th>Status</th>
                                    <th *ngIf="isCampusAdmin()">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let row of paginatedPendingItems">
                                    <td>
                                        <input type="checkbox" [checked]="isSelected(row)" (change)="toggleSelect(row)" />
                                    </td>
                                    <td>{{ formatId(row.requestId) }}</td>
                                    <td>{{ row.maintenanceName }}</td>
                                    <td>{{ row.maintenanceType?.maintenanceTypeName || 'N/A' }}</td>
                                    <td>{{ row.serviceMaintenance?.serviceName || 'N/A' }}</td>
                                    <td>
                                        <span class="tag" [ngClass]="'tag-' + getPriorityClass(row.priorityLevel?.priorityLevelName)">
                                            {{ row.priorityLevel?.priorityLevelName || 'N/A' }}
                                        </span>
                                    </td>
                                    <td>{{ row.requestDate || row.createdAt | date: 'short' }}</td>
                                    <td>{{ getFullName(row) }}</td>
                                    <td>
                                        <span class="tag tag-info">{{ row.maintenanceStatus?.requestStatusName }}</span>
                                    </td>
                                    <td *ngIf="isCampusAdmin()">
                                        <div class="actions">
                                            <p-button icon="pi pi-check" severity="success" [rounded]="true" [text]="true" pTooltip="Approve" (onClick)="approve(row)" />
                                            <p-button icon="pi pi-times" severity="danger" [rounded]="true" [text]="true" pTooltip="Decline" (onClick)="decline(row)" />
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <!-- Paginator for Pending -->
                        <div class="paginator" *ngIf="filteredPendingItems.length > 0">
                            <span class="paginator-info">Showing {{ getPageStart('pending') }} to {{ getPageEnd('pending') }} of {{ getTotalItems('pending') }} requests</span>
                            <button [disabled]="pendingPage === 1" (click)="goToPage('pending', 1)"><i class="pi pi-angle-double-left"></i></button>
                            <button [disabled]="pendingPage === 1" (click)="goToPage('pending', pendingPage - 1)"><i class="pi pi-angle-left"></i></button>
                            <span class="page-number">{{ pendingPage }}</span>
                            <button [disabled]="pendingPage === getTotalPages('pending')" (click)="goToPage('pending', pendingPage + 1)"><i class="pi pi-angle-right"></i></button>
                            <button [disabled]="pendingPage === getTotalPages('pending')" (click)="goToPage('pending', getTotalPages('pending'))"><i class="pi pi-angle-double-right"></i></button>
                            <select [value]="rowsPerPage" (change)="onRowsPerPageChange($event)">
                                <option *ngFor="let opt of rowsPerPageOptions" [value]="opt">{{ opt }}</option>
                            </select>
                        </div>
                        <div class="empty-message" *ngIf="filteredPendingItems.length === 0">No pending requests found</div>
                    </div>
                </div>

                <!-- Approved Tab -->
                <div class="tab-content" [class.active]="activeTabIndex === 1">
                    <div class="table-wrapper" *ngIf="!loading">
                        <table *ngIf="filteredApprovedItems.length > 0">
                            <thead>
                                <tr>
                                    <th style="width: 3rem;">
                                        <input type="checkbox" (change)="toggleSelectAll('approved')" />
                                    </th>
                                    <th>ID</th>
                                    <th>Maintenance Name</th>
                                    <th>Assigned Technician</th>
                                    <th>Scheduled Date</th>
                                    <th>Status</th>
                                    <th *ngIf="isLabTech()">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let row of paginatedApprovedItems">
                                    <td>
                                        <input type="checkbox" [checked]="isSelected(row)" (change)="toggleSelect(row)" />
                                    </td>
                                    <td>{{ formatId(row.maintenanceRequest?.requestId) }}</td>
                                    <td>{{ row.maintenanceRequest?.maintenanceName }}</td>
                                    <td>{{ row.assignedTechnician?.firstName }} {{ row.assignedTechnician?.lastName || '' }}</td>
                                    <td>{{ row.scheduledAt | date: 'short' }}</td>
                                    <td>
                                        <span class="tag tag-info">
                                            {{ row.isCompleted ? 'Completed' : row.isApproved ? 'Approved' : 'Pending' }}
                                        </span>
                                    </td>
                                    <td *ngIf="isLabTech()">
                                        <div class="actions">
                                            <p-button icon="pi pi-check" severity="success" [rounded]="true" [text]="true" pTooltip="Confirm" (onClick)="confirm(row)" />
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <!-- Paginator for Approved -->
                        <div class="paginator" *ngIf="filteredApprovedItems.length > 0">
                            <span class="paginator-info">Showing {{ getPageStart('approved') }} to {{ getPageEnd('approved') }} of {{ getTotalItems('approved') }} requests</span>
                            <button [disabled]="approvedPage === 1" (click)="goToPage('approved', 1)"><i class="pi pi-angle-double-left"></i></button>
                            <button [disabled]="approvedPage === 1" (click)="goToPage('approved', approvedPage - 1)"><i class="pi pi-angle-left"></i></button>
                            <span class="page-number">{{ approvedPage }}</span>
                            <button [disabled]="approvedPage === getTotalPages('approved')" (click)="goToPage('approved', approvedPage + 1)"><i class="pi pi-angle-right"></i></button>
                            <button [disabled]="approvedPage === getTotalPages('approved')" (click)="goToPage('approved', getTotalPages('approved'))"><i class="pi pi-angle-double-right"></i></button>
                            <select [value]="rowsPerPage" (change)="onRowsPerPageChange($event)">
                                <option *ngFor="let opt of rowsPerPageOptions" [value]="opt">{{ opt }}</option>
                            </select>
                        </div>
                        <div class="empty-message" *ngIf="filteredApprovedItems.length === 0">No approved requests found</div>
                    </div>
                </div>

                <!-- Completed Tab -->
                <div class="tab-content" [class.active]="activeTabIndex === 2">
                    <div class="table-wrapper" *ngIf="!loading">
                        <table *ngIf="filteredCompletedItems.length > 0">
                            <thead>
                                <tr>
                                    <th style="width: 3rem;">
                                        <input type="checkbox" (change)="toggleSelectAll('completed')" />
                                    </th>
                                    <th>ID</th>
                                    <th>Maintenance Name</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let row of paginatedCompletedItems">
                                    <td>
                                        <input type="checkbox" [checked]="isSelected(row)" (change)="toggleSelect(row)" />
                                    </td>
                                    <td>{{ formatId(row.requestId || row.maintenanceRequest?.requestId) }}</td>
                                    <td>{{ row.maintenanceName || row.maintenanceRequest?.maintenanceName }}</td>
                                    <td>
                                        <span class="tag tag-success">{{ row.maintenanceStatus?.requestStatusName || 'Completed' }}</span>
                                    </td>
                                    <td>
                                        <div class="actions">
                                            <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" pTooltip="View" (onClick)="view(row)" />
                                            <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" pTooltip="Delete" (onClick)="delete(row)" />
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <!-- Paginator for Completed -->
                        <div class="paginator" *ngIf="filteredCompletedItems.length > 0">
                            <span class="paginator-info">Showing {{ getPageStart('completed') }} to {{ getPageEnd('completed') }} of {{ getTotalItems('completed') }} requests</span>
                            <button [disabled]="completedPage === 1" (click)="goToPage('completed', 1)"><i class="pi pi-angle-double-left"></i></button>
                            <button [disabled]="completedPage === 1" (click)="goToPage('completed', completedPage - 1)"><i class="pi pi-angle-left"></i></button>
                            <span class="page-number">{{ completedPage }}</span>
                            <button [disabled]="completedPage === getTotalPages('completed')" (click)="goToPage('completed', completedPage + 1)"><i class="pi pi-angle-right"></i></button>
                            <button [disabled]="completedPage === getTotalPages('completed')" (click)="goToPage('completed', getTotalPages('completed'))"><i class="pi pi-angle-double-right"></i></button>
                            <select [value]="rowsPerPage" (change)="onRowsPerPageChange($event)">
                                <option *ngFor="let opt of rowsPerPageOptions" [value]="opt">{{ opt }}</option>
                            </select>
                        </div>
                        <div class="empty-message" *ngIf="filteredCompletedItems.length === 0">No completed requests found</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Approve Modal -->
        <div class="modal-overlay" [class.active]="approveModalVisible" (click)="approveModalVisible = false">
            <div class="modal" (click)="$event.stopPropagation()">
                <div class="modal-header">Assign Technician</div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Scheduled Date *</label>
                        <input type="date" class="form-control" [(ngModel)]="approveFormData.scheduledAt" />
                    </div>
                    <!-- Show dropdown for CampusAdmin -->
                    <div class="form-group" *ngIf="isCampusAdmin()">
                        <label class="form-label">Technician *</label>
                        <select class="form-control" [(ngModel)]="approveFormData.technicianId">
                            <option value="">-- Select Technician --</option>
                            <option *ngFor="let tech of technicians" [value]="tech.userId">
                                {{ tech.fullName }}
                            </option>
                        </select>
                    </div>
                    <!-- Show static text for LabTech (auto-assigned to themselves) -->
                    <div class="form-group" *ngIf="isLabTech()">
                        <label class="form-label">Assigned Technician</label>
                        <input type="text" class="form-control" [value]="getCurrentUserFullName()" disabled />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Remarks *</label>
                        <textarea class="form-control" [(ngModel)]="approveFormData.remarks" placeholder="Enter remarks..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" (click)="approveModalVisible = false">Cancel</button>
                    <button class="btn btn-primary" (click)="confirmApprove()">Assign</button>
                </div>
            </div>
        </div>

        <!-- Confirm Modal -->
        <div class="modal-overlay" [class.active]="confirmModalVisible" (click)="confirmModalVisible = false">
            <div class="modal" (click)="$event.stopPropagation()">
                <div class="modal-header">Complete Maintenance Request</div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Reason *</label>
                        <textarea class="form-control" [(ngModel)]="confirmFormData.reason" placeholder="Enter reason..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Action Taken</label>
                        <textarea class="form-control" [(ngModel)]="confirmFormData.actionTaken" placeholder="Describe the action taken..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observations</label>
                        <textarea class="form-control" [(ngModel)]="confirmFormData.observations" placeholder="Enter observations..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Expected Reading</label>
                        <input type="text" class="form-control" [(ngModel)]="confirmFormData.expectedReading" placeholder="Enter expected reading..." />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Actual Reading</label>
                        <input type="text" class="form-control" [(ngModel)]="confirmFormData.actualReading" placeholder="Enter actual reading..." />
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" (click)="confirmModalVisible = false">Cancel</button>
                    <button class="btn btn-primary" (click)="confirmCompletion()">Complete</button>
                </div>
            </div>
        </div>
    `,
    providers: [MessageService]
})
export class RequestmaintenanceComponent implements OnInit, AfterViewInit {
    items: any[] = [];
    pendingItems: any[] = [];
    approvedItems: any[] = [];
    completedItems: any[] = [];
    completedApprovedItems: any[] = [];
    selectedItems: any[] = [];
    searchValue: string = '';
    loading: boolean = true;

    // Pagination state
    pendingPage: number = 1;
    approvedPage: number = 1;
    completedPage: number = 1;
    rowsPerPage: number = 10;
    rowsPerPageOptions: number[] = [10, 20, 30];
    activeTabIndex: number = 0;
    approveModalVisible: boolean = false;
    confirmModalVisible: boolean = false;
    technicians: any[] = [];
    approveFormData: any = { technicianId: null, remarks: '', scheduledAt: null };
    confirmFormData: any = {
        reason: '',
        actionTaken: '',
        observations: '',
        expectedReading: '',
        actualReading: ''
    };
    selectedItem: any = null;

    constructor(
        private maintenanceService: MaintenanceService,
        private messageService: MessageService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.loadItems();
    }

    ngAfterViewInit() {
        // Component initialization complete
    }

    checkUserRole() {
        const currentUser = this.authService.getCurrentUser();
    }

    isLabTech(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.role?.toLowerCase() === 'labtech';
    }

    isCampusAdmin(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.role?.toLowerCase() === 'campusadmin';
    }

    getCurrentUserFullName(): string {
        const user = this.authService.getCurrentUser() as any;
        if (!user) return '';
        return [user.firstName, user.middleName, user.lastName].filter((name) => name && name.trim()).join(' ');
    }

    isCurrentUserTechnician(technicianUserId: string): boolean {
        const currentUser = this.authService.getCurrentUser();
        // The API returns userId, not user_id
        const currentUserId = (currentUser as any)?.userId;
        const isMatch = currentUserId === technicianUserId;
        return isMatch;
    }

    getFilteredApprovedItems(): any[] {
        if (this.isLabTech()) {
            const filtered = this.approvedItems.filter((item) => {
                const isMatch = this.isCurrentUserTechnician(item.assignedTechnician?.userId);
                return isMatch;
            });
            return filtered;
        }
        return this.approvedItems;
    }

    getFullName(row: any): string {
        const firstName = row.requestedBy?.firstName || '';
        const middleName = row.requestedBy?.middleName || '';
        const lastName = row.requestedBy?.lastName || '';
        return [firstName, middleName, lastName].filter((name) => name.trim()).join(' ');
    }

    getPrioritySeverity(priorityLevel: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const level = priorityLevel?.toLowerCase() || '';
        if (level.includes('critical') || level.includes('urgent') || level.includes('high')) {
            return 'danger';
        } else if (level.includes('medium') || level.includes('moderate')) {
            return 'warn';
        } else if (level.includes('low')) {
            return 'success';
        }
        return 'secondary';
    }

    loadItems() {
        this.loading = true;
        this.maintenanceService.getMaintenanceRequests?.()?.subscribe({
            next: (data: any[]) => {
                if (data && data.length > 0) {
                }
                this.items = data || [];
                this.categorizeItems();
                this.loadApprovals();
                this.loading = false;
            },
            error: (error: any) => {
                console.error('Error loading maintenance requests:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load maintenance requests' });
                this.loading = false;
            }
        });
    }

    loadApprovals() {
        this.maintenanceService.getMaintenanceApprovals().subscribe({
            next: (data: any[]) => {
                const allApprovals = data || [];

                // Separate into approved (not completed) and completed
                this.approvedItems = allApprovals.filter((item) => !item.isCompleted);
                this.completedApprovedItems = allApprovals.filter((item) => item.isCompleted);

                console.table(this.approvedItems);
            },
            error: (error: any) => {
                console.error('Error loading maintenance approvals:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load maintenance approvals' });
            }
        });
    }

    categorizeItems() {
        this.pendingItems = this.items.filter((item) => item.maintenanceStatus?.requestStatusName?.toLowerCase() === 'pending');
        this.completedItems = this.items.filter((item) => item.maintenanceStatus?.requestStatusName?.toLowerCase() === 'completed');
    }

    filterByTab() {
        // Just re-categorize items - the computed getters (filteredPendingItems, etc.) handle the actual search filtering
        this.categorizeItems();
        // Reset pages when search changes
        this.pendingPage = 1;
        this.approvedPage = 1;
        this.completedPage = 1;
    }

    onTabChange(event: any) {
        this.activeTabIndex = event.index;
        this.selectedItems = [];
    }

    onActiveIndexChange(index: number) {
        this.activeTabIndex = index;
        this.selectedItems = [];
    }

    filter() {
        this.filterByTab();
        // Reset pages when filtering
        this.pendingPage = 1;
        this.approvedPage = 1;
        this.completedPage = 1;
    }

    // Computed properties for filtered items
    get filteredPendingItems(): any[] {
        const searchLower = this.searchValue.toLowerCase().trim();
        if (!searchLower) return this.pendingItems;

        return this.pendingItems.filter((item) => {
            const formattedId = this.formatId(item.requestId).toLowerCase();
            const maintenanceName = (item.maintenanceName || '').toLowerCase();
            const maintenanceType = (item.maintenanceType?.maintenanceTypeName || '').toLowerCase();
            const serviceName = (item.serviceMaintenance?.serviceName || '').toLowerCase();
            const priority = (item.priorityLevel?.priorityLevelName || '').toLowerCase();
            const status = (item.maintenanceStatus?.requestStatusName || '').toLowerCase();
            const requestedBy = this.getFullName(item).toLowerCase();
            const rawId = (item.requestId || '').toLowerCase();
            return (
                formattedId.includes(searchLower) ||
                maintenanceName.includes(searchLower) ||
                maintenanceType.includes(searchLower) ||
                serviceName.includes(searchLower) ||
                priority.includes(searchLower) ||
                status.includes(searchLower) ||
                requestedBy.includes(searchLower) ||
                rawId.includes(searchLower)
            );
        });
    }

    get filteredApprovedItems(): any[] {
        const searchLower = this.searchValue.toLowerCase().trim();
        const filtered = this.getFilteredApprovedItems();
        if (!searchLower) return filtered;

        return filtered.filter((item) => {
            const requestId = item.maintenanceRequest?.requestId || item.requestId || '';
            const formattedId = this.formatId(requestId).toLowerCase();
            const maintenanceName = (item.maintenanceRequest?.maintenanceName || item.maintenanceName || '').toLowerCase();
            const technicianName = `${item.assignedTechnician?.firstName || ''} ${item.assignedTechnician?.lastName || ''}`.toLowerCase();
            const status = item.isCompleted ? 'completed' : item.isApproved ? 'approved' : 'pending';
            const rawId = requestId.toLowerCase();

            return formattedId.includes(searchLower) || maintenanceName.includes(searchLower) || technicianName.includes(searchLower) || status.includes(searchLower) || rawId.includes(searchLower);
        });
    }

    get filteredCompletedItems(): any[] {
        const searchLower = this.searchValue.toLowerCase().trim();
        let items: any[] = [];

        // Include both completed requests and completed approvals
        items = [...this.completedItems, ...this.completedApprovedItems];

        if (!searchLower) return items;

        return items.filter((item) => {
            const requestId = item.requestId || item.maintenanceRequest?.requestId || '';
            const formattedId = this.formatId(requestId).toLowerCase();
            const maintenanceName = (item.maintenanceName || item.maintenanceRequest?.maintenanceName || '').toLowerCase();
            const status = (item.maintenanceStatus?.requestStatusName || 'Completed').toLowerCase();
            const rawId = requestId.toLowerCase();

            return formattedId.includes(searchLower) || maintenanceName.includes(searchLower) || status.includes(searchLower) || rawId.includes(searchLower);
        });
    }

    // Paginated getters
    get paginatedPendingItems(): any[] {
        const start = (this.pendingPage - 1) * this.rowsPerPage;
        return this.filteredPendingItems.slice(start, start + this.rowsPerPage);
    }

    get paginatedApprovedItems(): any[] {
        const start = (this.approvedPage - 1) * this.rowsPerPage;
        return this.filteredApprovedItems.slice(start, start + this.rowsPerPage);
    }

    get paginatedCompletedItems(): any[] {
        const start = (this.completedPage - 1) * this.rowsPerPage;
        return this.filteredCompletedItems.slice(start, start + this.rowsPerPage);
    }

    // Pagination helper methods
    getTotalPages(tab: 'pending' | 'approved' | 'completed'): number {
        let total = 0;
        if (tab === 'pending') total = this.filteredPendingItems.length;
        else if (tab === 'approved') total = this.filteredApprovedItems.length;
        else if (tab === 'completed') total = this.filteredCompletedItems.length;
        return Math.ceil(total / this.rowsPerPage) || 1;
    }

    getCurrentPage(tab: 'pending' | 'approved' | 'completed'): number {
        if (tab === 'pending') return this.pendingPage;
        if (tab === 'approved') return this.approvedPage;
        return this.completedPage;
    }

    goToPage(tab: 'pending' | 'approved' | 'completed', page: number) {
        const totalPages = this.getTotalPages(tab);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        if (tab === 'pending') this.pendingPage = page;
        else if (tab === 'approved') this.approvedPage = page;
        else if (tab === 'completed') this.completedPage = page;
    }

    onRowsPerPageChange(event: any) {
        this.rowsPerPage = +event.target.value;
        this.pendingPage = 1;
        this.approvedPage = 1;
        this.completedPage = 1;
    }

    getPageStart(tab: 'pending' | 'approved' | 'completed'): number {
        const page = this.getCurrentPage(tab);
        let total = 0;
        if (tab === 'pending') total = this.filteredPendingItems.length;
        else if (tab === 'approved') total = this.filteredApprovedItems.length;
        else if (tab === 'completed') total = this.filteredCompletedItems.length;
        if (total === 0) return 0;
        return (page - 1) * this.rowsPerPage + 1;
    }

    getPageEnd(tab: 'pending' | 'approved' | 'completed'): number {
        const page = this.getCurrentPage(tab);
        let total = 0;
        if (tab === 'pending') total = this.filteredPendingItems.length;
        else if (tab === 'approved') total = this.filteredApprovedItems.length;
        else if (tab === 'completed') total = this.filteredCompletedItems.length;
        return Math.min(page * this.rowsPerPage, total);
    }

    getTotalItems(tab: 'pending' | 'approved' | 'completed'): number {
        if (tab === 'pending') return this.filteredPendingItems.length;
        if (tab === 'approved') return this.filteredApprovedItems.length;
        return this.filteredCompletedItems.length;
    }

    // Selection management methods
    toggleSelect(item: any) {
        const index = this.selectedItems.findIndex((selected) => selected.requestId === item.requestId || selected.maintenanceApprovalId === item.maintenanceApprovalId || selected.id === item.id);

        if (index > -1) {
            this.selectedItems.splice(index, 1);
        } else {
            this.selectedItems.push(item);
        }
    }

    toggleSelectAll(tab: string) {
        let items: any[] = [];

        if (tab === 'pending') {
            items = this.filteredPendingItems;
        } else if (tab === 'approved') {
            items = this.filteredApprovedItems;
        } else if (tab === 'completed') {
            items = this.filteredCompletedItems;
        }

        // Check if all items in this tab are already selected
        const allSelected = items.length > 0 && items.every((item) => this.isSelected(item));

        if (allSelected) {
            // Deselect all items from this tab
            this.selectedItems = this.selectedItems.filter((selected) => !items.some((item) => item.requestId === selected.requestId || item.maintenanceApprovalId === selected.maintenanceApprovalId || item.id === selected.id));
        } else {
            // Select all items from this tab
            items.forEach((item) => {
                if (!this.isSelected(item)) {
                    this.selectedItems.push(item);
                }
            });
        }
    }

    isSelected(item: any): boolean {
        return this.selectedItems.some((selected) => selected.requestId === item.requestId || selected.maintenanceApprovalId === item.maintenanceApprovalId || selected.id === item.id);
    }

    // Priority level helper
    getPriorityClass(priorityLevel: string): string {
        const level = priorityLevel?.toLowerCase() || '';
        if (level.includes('critical') || level.includes('urgent') || level.includes('high')) {
            return 'danger';
        } else if (level.includes('medium') || level.includes('moderate')) {
            return 'warning';
        } else if (level.includes('low')) {
            return 'success';
        }
        return 'info';
    }

    // Format ID to show only numbers from each segment (e.g., CAMPUS004-LAB002-021126-MR001 → 004-002-021126-001)
    formatId(id: string): string {
        if (!id) return '';
        // Split by dash, remove letters from each segment, rejoin with dash
        return id
            .split('-')
            .map((segment) => segment.replace(/[^0-9]/g, ''))
            .join('-');
    }

    onSelectionChange(event: any) {}

    approve(item: any) {
        this.selectedItem = item;

        // For LabTech, auto-assign themselves as technician
        if (this.isLabTech()) {
            const currentUser = this.authService.getCurrentUser();
            this.approveFormData = {
                technicianId: (currentUser as any)?.userId,
                remarks: '',
                scheduledAt: null
            };
        } else {
            // For CampusAdmin, let them choose a technician
            this.approveFormData = { technicianId: null, remarks: '', scheduledAt: null };
            this.loadTechnicians(item.asset?.campus?.campusId);
        }

        this.approveModalVisible = true;
    }

    loadTechnicians(campusId: string) {
        this.maintenanceService.getLabTechnicians().subscribe({
            next: (data: any[]) => {
                // Map the data to add a fullName property for display
                this.technicians = data.map((tech) => ({
                    ...tech,
                    fullName: [tech.firstName, tech.middleName, tech.lastName].filter((name) => name && name.trim()).join(' ')
                }));
            },
            error: (error: any) => {
                console.error('Error loading technicians:', error);
                this.technicians = [];
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load technicians' });
            }
        });
    }

    confirmApprove() {
        if (!this.approveFormData.technicianId) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Technician is required' });
            return;
        }
        if (!this.approveFormData.scheduledAt) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Scheduled Date is required' });
            return;
        }
        if (!this.approveFormData.remarks.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Remarks is required' });
            return;
        }

        const assignmentPayload = {
            technicianId: this.approveFormData.technicianId,
            remarks: this.approveFormData.remarks.trim(),
            scheduledAt: this.approveFormData.scheduledAt
        };

        // Use new endpoint: POST /api/maintenance-approvals/{requestId}/assign-technician
        this.maintenanceService.assignTechnician(this.selectedItem.requestId, assignmentPayload).subscribe({
            next: (response) => {
                const technicianName = this.technicians.find((t) => t.userId === this.approveFormData.technicianId)?.firstName;
                this.messageService.add({ severity: 'success', summary: 'Assigned', detail: `Maintenance assigned to ${technicianName}` });
                this.approveModalVisible = false;
                this.loadItems();
            },
            error: (error) => {
                console.error('Error assigning technician:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to assign technician: ' + (error.error?.message || error.message) });
            }
        });
    }

    decline(item: any) {
        Swal.fire({
            title: 'Decline Maintenance Request',
            html: `
                <p style="margin-bottom: 1rem;">Decline "${item.maintenanceName}"?</p>
                <textarea id="declineReason" class="swal2-textarea" placeholder="Enter reason for declining..."></textarea>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Decline',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const reason = (document.getElementById('declineReason') as HTMLTextAreaElement)?.value?.trim();
                if (!reason) {
                    Swal.showValidationMessage('Please enter a reason for declining');
                    return false;
                }
                return reason;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const reason = result.value;
                console.log('🔴 Declining with reason:', reason);
                this.maintenanceService.declineMaintenanceRequest(item.requestId, reason).subscribe({
                    next: (response) => {
                        console.log('✅ Decline successful:', response);
                        this.messageService.add({ severity: 'success', summary: 'Declined', detail: 'Maintenance request declined successfully' });
                        this.loadItems();
                    },
                    error: (error) => {
                        console.error('❌ Error declining request:', error);
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to decline maintenance request: ' + (error.error?.message || error.message) });
                    }
                });
            }
        });
    }

    openNewDialog() {
        Swal.fire({
            title: 'New Maintenance Request',
            html: `<input type="text" id="maintenanceName" class="swal2-input" placeholder="Maintenance Name" />`,
            confirmButtonText: 'Create',
            cancelButtonText: 'Cancel',
            showCancelButton: true,
            preConfirm: () => {
                const maintenanceName = (document.getElementById('maintenanceName') as HTMLInputElement)?.value.trim();
                if (!maintenanceName) {
                    Swal.showValidationMessage('Maintenance name is required');
                    return false;
                }
                return { maintenanceName };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.maintenanceService.createMaintenanceRequest(result.value).subscribe({
                    next: (created) => {
                        this.items.push(created);
                        this.categorizeItems();
                        this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Maintenance request created' });
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Create failed' })
                });
            }
        });
    }

    view(item: any) {
        // Check if it's an approval item (has maintenanceApprovalId) or a request item
        if (item.maintenanceApprovalId) {
            // It's a completed approval - show approval details
            const html = `
                <div style="text-align: left;">
                    <p><strong>Maintenance Name:</strong> ${item.maintenanceRequest?.maintenanceName || 'N/A'}</p>
                    <p><strong>Scheduled Date:</strong> ${new Date(item.scheduledAt).toLocaleDateString() || 'N/A'}</p>
                    <p><strong>Remarks:</strong> ${item.remarks || 'N/A'}</p>
                    <p><strong>Action Taken:</strong> ${item.actionTaken || 'N/A'}</p>
                    <p><strong>Observations:</strong> ${item.observations || 'N/A'}</p>
                    <p><strong>Expected Reading:</strong> ${item.expectedReading || 'N/A'}</p>
                    <p><strong>Actual Reading:</strong> ${item.actualReading || 'N/A'}</p>
                </div>
            `;
            Swal.fire({ title: 'Maintenance Approval Details', html, icon: 'info' });
        } else {
            // It's a request item - fetch from API
            const requestId = item.maintenanceRequestId || item.id || item.requestId;
            this.maintenanceService.getMaintenanceRequest(requestId).subscribe({
                next: (data: any) => {
                    const html = `
                        <div style="text-align: left;">
                            <p><strong>Name:</strong> ${data.maintenanceName || 'N/A'}</p>
                            <p><strong>Type:</strong> ${data.maintenanceType?.maintenanceTypeName || 'N/A'}</p>
                            <p><strong>Service:</strong> ${data.serviceMaintenance?.serviceName || 'N/A'}</p>
                            <p><strong>Asset:</strong> ${data.asset?.assetName || 'N/A'}</p>
                            <p><strong>Priority:</strong> ${data.priorityLevel?.priorityLevelName || 'N/A'}</p>
                            <p><strong>Status:</strong> ${data.maintenanceStatus?.requestStatusName || 'N/A'}</p>
                            <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
                        </div>
                    `;
                    Swal.fire({ title: 'Maintenance Request Details', html, icon: 'info' });
                }
            });
        }
    }

    edit(item: any) {
        const requestId = item.maintenanceRequestId || item.id;
        this.maintenanceService.getMaintenanceRequest(requestId).subscribe({
            next: (data: any) => {
                Swal.fire({
                    title: 'Edit Maintenance Request',
                    html: `<input type="text" id="maintenanceName" class="swal2-input" value="${data.maintenanceName || ''}" placeholder="Maintenance Name" />`,
                    confirmButtonText: 'Update',
                    cancelButtonText: 'Cancel',
                    showCancelButton: true,
                    preConfirm: () => {
                        const maintenanceName = (document.getElementById('maintenanceName') as HTMLInputElement)?.value.trim();
                        if (!maintenanceName) {
                            Swal.showValidationMessage('Maintenance name is required');
                            return false;
                        }
                        return { maintenanceName };
                    }
                }).then((result) => {
                    if (result.isConfirmed && result.value) {
                        this.maintenanceService.updateMaintenanceRequest(requestId, result.value).subscribe({
                            next: () => {
                                this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Maintenance request updated successfully' });
                                this.loadItems();
                            },
                            error: (err) => {
                                console.error('Error updating maintenance request:', err);
                                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update maintenance request' });
                            }
                        });
                    }
                });
            },
            error: (err) => {
                console.error('Error fetching maintenance request:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load maintenance request' });
            }
        });
    }

    delete(item: any) {
        const requestId = item.requestId || item.maintenanceRequestId || item.id;
        const requestName = item.maintenanceName || 'Maintenance Request';

        Swal.fire({
            title: 'Delete Maintenance Request',
            text: `Delete "${requestName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.maintenanceService.deleteMaintenanceRequest(requestId).subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Deleted!',
                            text: 'Maintenance request has been deleted successfully.',
                            icon: 'success',
                            confirmButtonText: 'OK'
                        });
                        this.loadItems();
                    },
                    error: (err) => {
                        console.error('Error deleting maintenance request:', err);
                        Swal.fire({
                            title: 'Error!',
                            text: 'Failed to delete maintenance request.',
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                    }
                });
            }
        });
    }

    deleteSelected() {
        if (!this.selectedItems?.length) return;
        Swal.fire({
            title: 'Delete Selected',
            text: `Delete ${this.selectedItems.length} maintenance request(s)?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete'
        }).then((res) => {
            if (res.isConfirmed) {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Selected maintenance requests deleted' });
                this.loadItems();
            }
        });
    }

    exportCSV() {
        let csv = 'Maintenance Name,Status,ID\n';
        this.items.forEach((item) => {
            csv += `${(item.maintenanceName || '').replace(/,/g, ';')},${item.maintenanceStatus?.requestStatusName || 'N/A'},${item.requestId}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'maintenance-requests.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    confirm(row: any) {
        console.log('🔵 Confirm clicked - Row data:', row);
        console.log('🔵 Maintenance Approval ID:', row.maintenanceApprovalId);
        console.log('🔵 Request ID:', row.maintenanceRequest?.requestId || row.requestId);

        this.selectedItem = row;
        this.loading = true;

        // Fetch maintenance approval details from API
        this.maintenanceService.getMaintenanceApprovalDetails(row.maintenanceApprovalId).subscribe({
            next: (data: any) => {
                this.confirmFormData = {
                    reason: data.reason || '',
                    actionTaken: data.actionTaken || '',
                    observations: data.observations || '',
                    expectedReading: data.expectedReading || '',
                    actualReading: data.actualReading || ''
                };
                this.confirmModalVisible = true;
                this.loading = false;
            },
            error: (error: any) => {
                console.error('Error loading maintenance approval details:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load approval details' });
                this.loading = false;
            }
        });
    }

    confirmCompletion() {
        if (!this.confirmFormData.reason.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Reason is required' });
            return;
        }

        const completionPayload = {
            maintenanceRequest: this.selectedItem.maintenanceRequest?.requestId || this.selectedItem.requestId,
            reason: this.confirmFormData.reason.trim(),
            scheduledAt: this.selectedItem.scheduledAt || new Date(),
            isApproved: true,
            isCompleted: true,
            actionTaken: this.confirmFormData.actionTaken.trim(),
            observations: this.confirmFormData.observations.trim(),
            expectedReading: this.confirmFormData.expectedReading.trim(),
            actualReading: this.confirmFormData.actualReading.trim()
        };

        console.log('🟢 Selected Item:', this.selectedItem);
        console.log('🟢 Maintenance Approval ID:', this.selectedItem.maintenanceApprovalId);
        console.log('🟢 Completion Payload:', completionPayload);

        this.maintenanceService.completeMaintenanceApproval(this.selectedItem.maintenanceApprovalId, completionPayload).subscribe({
            next: (response: any) => {
                this.messageService.add({ severity: 'success', summary: 'Completed', detail: 'Maintenance request marked as completed' });
                this.confirmModalVisible = false;

                // Remove from approved items
                const index = this.approvedItems.findIndex((item) => item.maintenanceApprovalId === this.selectedItem.maintenanceApprovalId);
                if (index > -1) {
                    this.approvedItems.splice(index, 1);
                }

                this.loadItems();
            },
            error: (error: any) => {
                console.error('Error completing maintenance request:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to complete maintenance request: ' + (error.error?.message || error.message) });
            }
        });
    }
}
