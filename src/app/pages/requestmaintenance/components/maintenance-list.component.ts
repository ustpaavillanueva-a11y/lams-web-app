/**
 * Maintenance List Component
 * Main container with tab-based status filtering
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tabs } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { MessageService } from 'primeng/api';
import { MaintenanceStateService } from '../services/maintenance-state.service';
import {
    MaintenanceApproval,
    MaintenanceStatus,
    MaintenanceFilter,
    MaintenanceSummary,
    ConfirmSchedulePayload,
    StartMaintenancePayload,
    HoldMaintenancePayload,
    ResumeMaintenancePayload,
    CompleteMaintenancePayload,
    CancelMaintenancePayload
} from '../../models/maintenance.models';
import { MaintenanceTableComponent } from './maintenance-table.component';
import { MaintenanceDetailModalComponent } from './maintenance-detail-modal.component';
import { MaintenanceActionDialogsComponent } from './maintenance-action-dialogs.component';
import { MaintenanceUtils } from '../utils/maintenance.utils';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../service/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-maintenance-list',
    standalone: true,
    imports: [CommonModule, FormsModule, Tabs, ButtonModule, TooltipModule, SelectModule, DatePickerModule, ToggleButtonModule, MaintenanceTableComponent, MaintenanceDetailModalComponent, MaintenanceActionDialogsComponent],
    providers: [MessageService],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">Maintenance Approvals</h2>
                <div class="flex gap-2">
                    <p-button icon="pi pi-filter" [rounded]="true" [text]="true" (onClick)="toggleFilters()" pTooltip="Toggle filters" [badge]="activeFilterCount > 0 ? activeFilterCount.toString() : null" />
                    <p-button icon="pi pi-refresh" [rounded]="true" [text]="true" (onClick)="refresh()" pTooltip="Refresh data" />
                </div>
            </div>

            <!-- Advanced Filters Panel -->
            <div *ngIf="showFilters" class="mb-4 p-4 bg-gray-50 dark:bg-surface-700 rounded-lg border border-gray-200 dark:border-surface-600">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Campus Filter (Super Admin only) -->
                    <div *ngIf="isSuperAdmin()">
                        <label class="block text-sm font-medium mb-2">Campus</label>
                        <p-select [(ngModel)]="filterCampus" [options]="campuses" optionLabel="campusName" optionValue="campusId" placeholder="All Campuses" class="w-full" [showClear]="true" (onChange)="applyFilters()" />
                    </div>

                    <!-- Priority Filter -->
                    <div>
                        <label class="block text-sm font-medium mb-2">Priority</label>
                        <p-select [(ngModel)]="filterPriority" [options]="priorities" optionLabel="priorityLevelName" optionValue="priorityLevelId" placeholder="All Priorities" class="w-full" [showClear]="true" (onChange)="applyFilters()" />
                    </div>

                    <!-- Maintenance Type Filter -->
                    <div>
                        <label class="block text-sm font-medium mb-2">Type</label>
                        <p-select
                            [(ngModel)]="filterMaintenanceType"
                            [options]="maintenanceTypes"
                            optionLabel="maintenanceTypeName"
                            optionValue="maintenanceTypeId"
                            placeholder="All Types"
                            class="w-full"
                            [showClear]="true"
                            (onChange)="applyFilters()"
                        />
                    </div>

                    <!-- Date From -->
                    <div>
                        <label class="block text-sm font-medium mb-2">From Date</label>
                        <p-datepicker [(ngModel)]="filterDateFrom" placeholder="Select start date" [showButtonBar]="true" class="w-full" (onSelect)="applyFilters()" (onClear)="applyFilters()" />
                    </div>

                    <!-- Date To -->
                    <div>
                        <label class="block text-sm font-medium mb-2">To Date</label>
                        <p-datepicker [(ngModel)]="filterDateTo" placeholder="Select end date" [showButtonBar]="true" class="w-full" (onSelect)="applyFilters()" (onClear)="applyFilters()" />
                    </div>

                    <!-- Overdue Toggle -->
                    <div>
                        <label class="block text-sm font-medium mb-2">Show Overdue Only</label>
                        <p-togglebutton [(ngModel)]="filterOverdue" onLabel="Yes" offLabel="No" class="w-full" (onChange)="applyFilters()" />
                    </div>

                    <!-- Assigned Technician (Lab Techs) -->
                    <div>
                        <label class="block text-sm font-medium mb-2">Assigned To</label>
                        <p-select [(ngModel)]="filterTechnician" [options]="technicians" optionLabel="fullName" optionValue="userId" placeholder="All Technicians" class="w-full" [showClear]="true" (onChange)="applyFilters()" />
                    </div>
                </div>

                <!-- Filter Actions -->
                <div class="flex justify-end gap-2 mt-4">
                    <p-button label="Clear All" icon="pi pi-times" [text]="true" severity="secondary" (onClick)="clearFilters()" />
                </div>
            </div>

            <p-tabs [(activeIndex)]="activeTabIndex" (onChange)="onTabChange($event)">
                <!-- All Tab (every role; records are already scoped by role on the backend) -->
                <p-tabpanel [header]="'All (' + ((summary$ | async)?.totalCount || 0) + ')'">
                    <app-maintenance-table
                        [approvals]="allApprovals"
                        [loading]="loading"
                        (view)="onView($event)"
                        (confirmSchedule)="onConfirmSchedule($event)"
                        (approve)="onApprove($event)"
                        (decline)="onDecline($event)"
                        (start)="onStart($event)"
                        (hold)="onHold($event)"
                        (resume)="onResume($event)"
                        (complete)="onComplete($event)"
                        (cancel)="onCancel($event)"
                        (delete)="onDelete($event)"
                    />
                </p-tabpanel>

                <!-- Pending Tab -->
                <p-tabpanel [header]="'Pending (' + (summary$ | async)?.pendingCount + ')'">
                    <app-maintenance-table
                        [approvals]="pendingApprovals"
                        [loading]="loading"
                        (view)="onView($event)"
                        (confirmSchedule)="onConfirmSchedule($event)"
                        (approve)="onApprove($event)"
                        (decline)="onDecline($event)"
                        (start)="onStart($event)"
                        (hold)="onHold($event)"
                        (resume)="onResume($event)"
                        (complete)="onComplete($event)"
                        (cancel)="onCancel($event)"
                        (delete)="onDelete($event)"
                    />
                </p-tabpanel>

                <!-- Scheduled Tab (includes both Scheduled and legacy Approved statuses) -->
                <p-tabpanel [header]="'Scheduled (' + (((summary$ | async)?.scheduledCount || 0) + ((summary$ | async)?.approvedCount || 0)) + ')'">
                    <app-maintenance-table
                        [approvals]="scheduledApprovals"
                        [loading]="loading"
                        (view)="onView($event)"
                        (confirmSchedule)="onConfirmSchedule($event)"
                        (approve)="onApprove($event)"
                        (decline)="onDecline($event)"
                        (start)="onStart($event)"
                        (hold)="onHold($event)"
                        (resume)="onResume($event)"
                        (complete)="onComplete($event)"
                        (cancel)="onCancel($event)"
                        (delete)="onDelete($event)"
                    />
                </p-tabpanel>

                <!-- In Progress Tab -->
                <p-tabpanel [header]="'In Progress (' + (summary$ | async)?.inProgressCount + ')'">
                    <app-maintenance-table
                        [approvals]="inProgressApprovals"
                        [loading]="loading"
                        (view)="onView($event)"
                        (confirmSchedule)="onConfirmSchedule($event)"
                        (approve)="onApprove($event)"
                        (decline)="onDecline($event)"
                        (start)="onStart($event)"
                        (hold)="onHold($event)"
                        (resume)="onResume($event)"
                        (complete)="onComplete($event)"
                        (cancel)="onCancel($event)"
                        (delete)="onDelete($event)"
                    />
                </p-tabpanel>

                <!-- On Hold Tab -->
                <p-tabpanel [header]="'On Hold (' + (summary$ | async)?.onHoldCount + ')'">
                    <app-maintenance-table
                        [approvals]="onHoldApprovals"
                        [loading]="loading"
                        (view)="onView($event)"
                        (confirmSchedule)="onConfirmSchedule($event)"
                        (approve)="onApprove($event)"
                        (decline)="onDecline($event)"
                        (start)="onStart($event)"
                        (hold)="onHold($event)"
                        (resume)="onResume($event)"
                        (complete)="onComplete($event)"
                        (delete)="onDelete($event)"
                    />
                </p-tabpanel>

                <!-- Completed Tab -->
                <p-tabpanel [header]="'Completed (' + (summary$ | async)?.completedCount + ')'">
                    <app-maintenance-table
                        [approvals]="completedApprovals"
                        [loading]="loading"
                        (view)="onView($event)"
                        (confirmSchedule)="onConfirmSchedule($event)"
                        (approve)="onApprove($event)"
                        (decline)="onDecline($event)"
                        (start)="onStart($event)"
                        (hold)="onHold($event)"
                        (resume)="onResume($event)"
                        (complete)="onComplete($event)"
                        (cancel)="onCancel($event)"
                        (delete)="onDelete($event)"
                    />
                </p-tabpanel>

                <!-- Cancelled Tab -->
                <p-tabpanel [header]="'Cancelled (' + (summary$ | async)?.cancelledCount + ')'">
                    <app-maintenance-table
                        [approvals]="cancelledApprovals"
                        [loading]="loading"
                        (view)="onView($event)"
                        (confirmSchedule)="onConfirmSchedule($event)"
                        (approve)="onApprove($event)"
                        (decline)="onDecline($event)"
                        (start)="onStart($event)"
                        (hold)="onHold($event)"
                        (resume)="onResume($event)"
                        (complete)="onComplete($event)"
                        (cancel)="onCancel($event)"
                        (delete)="onDelete($event)"
                    />
                </p-tabpanel>
            </p-tabs>
        </div>

        <!-- Detail Modal -->
        <app-maintenance-detail-modal [(visible)]="detailModalVisible" [approval]="selectedApproval" (close)="onDetailModalClose()" />

        <!-- Action Dialogs -->
        <app-maintenance-action-dialogs
            [selectedApproval]="selectedApproval"
            [(confirmScheduleVisible)]="confirmScheduleDialogVisible"
            [(startMaintenanceVisible)]="startMaintenanceDialogVisible"
            [(holdMaintenanceVisible)]="holdMaintenanceDialogVisible"
            [(resumeMaintenanceVisible)]="resumeMaintenanceDialogVisible"
            [(completeMaintenanceVisible)]="completeMaintenanceDialogVisible"
            [(cancelMaintenanceVisible)]="cancelMaintenanceDialogVisible"
            (confirmSchedule)="handleConfirmSchedule($event)"
            (startMaintenance)="handleStartMaintenance($event)"
            (holdMaintenance)="handleHoldMaintenance($event)"
            (resumeMaintenance)="handleResumeMaintenance($event)"
            (completeMaintenance)="handleCompleteMaintenance($event)"
            (cancelMaintenance)="handleCancelMaintenance($event)"
        />
    `,
    styles: [``]
})
export class MaintenanceListComponent implements OnInit {
    activeTabIndex = 0;

    // Initialize observables in constructor to avoid initialization order issues
    summary$!: Observable<MaintenanceSummary>;
    loading$!: Observable<boolean>;
    loading = false;

    allApprovals: MaintenanceApproval[] = [];
    pendingApprovals: MaintenanceApproval[] = [];
    scheduledApprovals: MaintenanceApproval[] = []; // Includes both Scheduled and Approved (legacy)
    inProgressApprovals: MaintenanceApproval[] = [];
    onHoldApprovals: MaintenanceApproval[] = [];
    completedApprovals: MaintenanceApproval[] = [];
    cancelledApprovals: MaintenanceApproval[] = [];

    selectedApproval: MaintenanceApproval | null = null;
    detailModalVisible = false;
    confirmScheduleDialogVisible = false;
    startMaintenanceDialogVisible = false;
    holdMaintenanceDialogVisible = false;
    resumeMaintenanceDialogVisible = false;
    completeMaintenanceDialogVisible = false;
    cancelMaintenanceDialogVisible = false;

    // Filter properties
    showFilters = false;
    filterCampus: string | null = null;
    filterPriority: string | null = null;
    filterMaintenanceType: string | null = null;
    filterDateFrom: Date | null = null;
    filterDateTo: Date | null = null;
    filterOverdue = false;
    filterTechnician: string | null = null;

    // Reference data
    campuses: any[] = [];
    priorities: any[] = [];
    maintenanceTypes: any[] = [];
    technicians: any[] = [];

    get activeFilterCount(): number {
        let count = 0;
        if (this.filterCampus) count++;
        if (this.filterPriority) count++;
        if (this.filterMaintenanceType) count++;
        if (this.filterDateFrom) count++;
        if (this.filterDateTo) count++;
        if (this.filterOverdue) count++;
        if (this.filterTechnician) count++;
        return count;
    }

    constructor(
        private stateService: MaintenanceStateService,
        private authService: AuthService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        // Initialize observables after dependency injection
        this.summary$ = this.stateService.summary$;
        this.loading$ = this.stateService.loading$;

        this.loadData();
        this.subscribeToApprovals();
        this.subscribeToLoading();
        this.subscribeToReferenceData();
    }

    loadData(): void {
        this.stateService.loadReferenceData();
        this.stateService.loadApprovals();
    }

    subscribeToApprovals(): void {
        this.stateService.approvals$.subscribe((approvals) => {
            this.allApprovals = this.stateService.getScopedApprovals();
            this.pendingApprovals = MaintenanceUtils.filterByStatus(this.allApprovals, MaintenanceStatus.PENDING);

            // Combine Scheduled and Approved (legacy) into one list
            const scheduled = MaintenanceUtils.filterByStatus(this.allApprovals, MaintenanceStatus.SCHEDULED);
            const approved = MaintenanceUtils.filterByStatus(this.allApprovals, MaintenanceStatus.APPROVED);
            this.scheduledApprovals = [...scheduled, ...approved];

            this.inProgressApprovals = MaintenanceUtils.filterByStatus(this.allApprovals, MaintenanceStatus.IN_PROGRESS);
            this.onHoldApprovals = MaintenanceUtils.filterByStatus(this.allApprovals, MaintenanceStatus.ON_HOLD);
            this.completedApprovals = MaintenanceUtils.filterByStatus(this.allApprovals, MaintenanceStatus.COMPLETED);
            this.cancelledApprovals = MaintenanceUtils.filterByStatus(this.allApprovals, MaintenanceStatus.CANCELLED);
        });
    }

    subscribeToLoading(): void {
        this.loading$.subscribe((loading) => {
            this.loading = loading;
        });
    }

    subscribeToReferenceData(): void {
        this.stateService.campuses$.subscribe((campuses) => {
            this.campuses = campuses;
        });

        this.stateService.priorities$.subscribe((priorities) => {
            this.priorities = priorities;
        });

        this.stateService.types$.subscribe((types) => {
            this.maintenanceTypes = types;
        });

        this.stateService.technicians$.subscribe((technicians) => {
            this.technicians = technicians.map((t) => ({
                ...t,
                fullName: `${t.firstName} ${t.lastName}`
            }));
        });
    }

    refresh(): void {
        this.stateService.refresh();
        this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Data refreshed successfully', life: 2000 });
    }

    onTabChange(event: any): void {
        this.activeTabIndex = event.index;
    }

    // ==================== FILTERS ====================

    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }

    applyFilters(): void {
        const filter: MaintenanceFilter = {
            campusId: this.filterCampus || undefined,
            priorityLevel: this.filterPriority || undefined,
            maintenanceType: this.filterMaintenanceType || undefined,
            dateFrom: this.filterDateFrom || undefined,
            dateTo: this.filterDateTo || undefined,
            isOverdue: this.filterOverdue || undefined,
            assignedTechnicianId: this.filterTechnician || undefined
        };

        const filtered = MaintenanceUtils.filterMaintenanceApprovals(this.stateService.getScopedApprovals(), filter);
        this.allApprovals = filtered;
        this.pendingApprovals = MaintenanceUtils.filterByStatus(filtered, MaintenanceStatus.PENDING);

        // Combine Scheduled and Approved (legacy) into one list
        const scheduled = MaintenanceUtils.filterByStatus(filtered, MaintenanceStatus.SCHEDULED);
        const approved = MaintenanceUtils.filterByStatus(filtered, MaintenanceStatus.APPROVED);
        this.scheduledApprovals = [...scheduled, ...approved];

        this.inProgressApprovals = MaintenanceUtils.filterByStatus(filtered, MaintenanceStatus.IN_PROGRESS);
        this.onHoldApprovals = MaintenanceUtils.filterByStatus(filtered, MaintenanceStatus.ON_HOLD);
        this.completedApprovals = MaintenanceUtils.filterByStatus(filtered, MaintenanceStatus.COMPLETED);
        this.cancelledApprovals = MaintenanceUtils.filterByStatus(filtered, MaintenanceStatus.CANCELLED);
    }

    clearFilters(): void {
        this.filterCampus = null;
        this.filterPriority = null;
        this.filterMaintenanceType = null;
        this.filterDateFrom = null;
        this.filterDateTo = null;
        this.filterOverdue = false;
        this.filterTechnician = null;
        this.subscribeToApprovals(); // Reset to unfiltered data
        this.messageService.add({ severity: 'info', summary: 'Filters Cleared', detail: 'All filters have been removed', life: 2000 });
    }

    // ==================== VIEW ====================

    onView(approval: MaintenanceApproval): void {
        this.selectedApproval = approval;
        this.detailModalVisible = true;
    }

    onDetailModalClose(): void {
        this.selectedApproval = null;
        this.detailModalVisible = false;
    }

    // ==================== PERMISSION CHECK ====================

    private checkPermission(approval: MaintenanceApproval, actionName: string = 'this action'): boolean {
        const user = this.authService.getCurrentUser();
        const permissionCheck = MaintenanceUtils.canPerformActionOnApproval(approval, user?.role || '', user?.campus || '', user?.user_id || '');

        if (!permissionCheck.allowed) {
            this.messageService.add({ severity: 'error', summary: 'Permission Denied', detail: permissionCheck.reason || `You do not have permission to ${actionName}`, life: 4000 });
            return false;
        }

        return true;
    }

    // ==================== CONFIRM SCHEDULE ====================

    onConfirmSchedule(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'confirm schedule')) return;

        this.selectedApproval = approval;
        this.confirmScheduleDialogVisible = true;
    }

    handleConfirmSchedule(payload: ConfirmSchedulePayload): void {
        if (!this.selectedApproval) return;

        this.stateService.confirmSchedule(this.selectedApproval.maintenanceApprovalId, payload.notes).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Schedule Confirmed', detail: 'Maintenance schedule confirmed successfully', life: 3000 });
                this.selectedApproval = null;
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to confirm schedule', life: 5000 });
            }
        });
    }

    // ==================== APPROVE ====================

    onApprove(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'approve this request')) return;

        // This would open a separate approval dialog with technician assignment
        // For now, using SweetAlert for simple approval
        Swal.fire({
            title: 'Approve Maintenance',
            text: `Approve maintenance for ${approval.maintenanceRequest?.asset?.assetName}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Approve',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.stateService
                    .approveRequest({
                        requestId: approval.maintenanceRequest?.requestId,
                        reason: 'Approved'
                    })
                    .subscribe({
                        next: () => {
                            this.messageService.add({ severity: 'success', summary: 'Approved', detail: 'Maintenance request approved successfully', life: 3000 });
                        },
                        error: (error) => {
                            this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to approve request', life: 5000 });
                        }
                    });
            }
        });
    }
    // ==================== CANCEL ====================

    onCancel(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'cancel maintenance')) return;

        this.selectedApproval = approval;
        this.cancelMaintenanceDialogVisible = true;
    }

    handleCancelMaintenance(payload: CancelMaintenancePayload): void {
        if (!this.selectedApproval) return;

        const status = this.selectedApproval.maintenanceRequest?.maintenanceStatus?.requestStatusName;
        const wasInProgress = status === 'In Progress';

        this.stateService.cancelMaintenance(this.selectedApproval.maintenanceApprovalId, payload.reason).subscribe({
            next: () => {
                const assetStatusMessage = wasInProgress ? ' Asset restored to serviceable.' : '';
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Cancelled',
                    detail: `Maintenance cancelled.${assetStatusMessage}`,
                    life: 4000
                });
                this.selectedApproval = null;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.error?.message || 'Failed to cancel maintenance',
                    life: 5000
                });
            }
        });
    }
    // ==================== DECLINE ====================

    onDecline(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'decline this request')) return;

        Swal.fire({
            title: 'Decline Maintenance',
            text: 'Please provide a reason for declining:',
            input: 'textarea',
            inputPlaceholder: 'Enter reason for declining...',
            showCancelButton: true,
            confirmButtonText: 'Decline',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
                if (!value) {
                    return 'Reason is required!';
                }
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.stateService.declineRequest(approval.maintenanceRequest?.requestId, result.value).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'info', summary: 'Declined', detail: 'Maintenance request declined', life: 3000 });
                    },
                    error: (error) => {
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to decline request', life: 5000 });
                    }
                });
            }
        });
    }

    // ==================== START ====================

    onStart(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'start maintenance')) return;

        this.selectedApproval = approval;
        this.startMaintenanceDialogVisible = true;
    }

    handleStartMaintenance(payload: StartMaintenancePayload): void {
        if (!this.selectedApproval) return;

        this.stateService.startMaintenance(this.selectedApproval.maintenanceApprovalId, payload.notes).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Started', detail: 'Maintenance work started. Asset marked as unserviceable.', life: 3000 });
                this.selectedApproval = null;
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to start maintenance', life: 5000 });
            }
        });
    }

    // ==================== HOLD ====================

    onHold(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'put maintenance on hold')) return;

        this.selectedApproval = approval;
        this.holdMaintenanceDialogVisible = true;
    }

    handleHoldMaintenance(payload: HoldMaintenancePayload): void {
        if (!this.selectedApproval) return;

        this.stateService.holdMaintenance(this.selectedApproval.maintenanceApprovalId, payload.reason).subscribe({
            next: () => {
                this.messageService.add({ severity: 'warn', summary: 'On Hold', detail: 'Maintenance work put on hold', life: 3000 });
                this.selectedApproval = null;
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to hold maintenance', life: 5000 });
            }
        });
    }

    // ==================== RESUME ====================

    onResume(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'resume maintenance')) return;

        this.selectedApproval = approval;
        this.resumeMaintenanceDialogVisible = true;
    }

    handleResumeMaintenance(payload: ResumeMaintenancePayload): void {
        if (!this.selectedApproval) return;

        this.stateService.resumeMaintenance(this.selectedApproval.maintenanceApprovalId, payload.notes).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Resumed', detail: 'Maintenance work resumed', life: 3000 });
                this.selectedApproval = null;
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to resume maintenance', life: 5000 });
            }
        });
    }
    // ==================== COMPLETE ====================

    onComplete(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'complete maintenance')) return;

        this.selectedApproval = approval;
        this.completeMaintenanceDialogVisible = true;
    }

    handleCompleteMaintenance(payload: CompleteMaintenancePayload): void {
        if (!this.selectedApproval) return;

        this.stateService.completeMaintenance(this.selectedApproval.maintenanceApprovalId, payload).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Completed', detail: 'Maintenance work completed successfully. Asset marked as serviceable.', life: 4000 });
                this.selectedApproval = null;
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to complete maintenance', life: 5000 });
            }
        });
    }
    // ==================== DELETE ====================

    onDelete(approval: MaintenanceApproval): void {
        if (!this.checkPermission(approval, 'delete this approval')) return;

        Swal.fire({
            title: 'Delete Maintenance Approval?',
            text: `Delete maintenance approval for ${approval.maintenanceRequest?.asset?.assetName}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444'
        }).then((result) => {
            if (result.isConfirmed) {
                this.stateService.deleteApproval(approval.maintenanceApprovalId).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Maintenance approval deleted successfully', life: 3000 });
                    },
                    error: (error) => {
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to delete approval', life: 5000 });
                    }
                });
            }
        });
    }

    // ==================== ROLE CHECKS ====================

    isSuperAdmin(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.role === 'SuperAdmin';
    }

    isCampusAdmin(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.role?.toLowerCase() === 'campusadmin';
    }

    isLabTech(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.role === 'LabTech';
    }

    isFaculty(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.role === 'Faculty';
    }
}
