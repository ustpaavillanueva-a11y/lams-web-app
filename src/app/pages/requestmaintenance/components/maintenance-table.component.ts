/**
 * Maintenance Table Component
 * Reusable table with role-based action buttons
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { MaintenanceApproval, MaintenanceAction } from '../../models/maintenance.models';
import { MaintenanceConstants } from '../constants/maintenance.constants';
import { MaintenanceUtils } from '../utils/maintenance.utils';
import { AuthService } from '../../service/auth.service';

@Component({
    selector: 'app-maintenance-table',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule, TooltipModule, InputIconModule, IconFieldModule, InputTextModule],
    template: `
        <div class="mb-4">
            <p-iconfield iconPosition="left">
                <p-inputicon styleClass="pi pi-search" />
                <input type="text" pInputText placeholder="Search by asset name, property number, or requester..." [(ngModel)]="searchValue" (input)="onSearch()" class="w-full" />
            </p-iconfield>
        </div>

        <p-table
            #dt
            [value]="displayApprovals"
            [rows]="10"
            [paginator]="true"
            [rowsPerPageOptions]="[10, 20, 30]"
            [loading]="loading"
            dataKey="maintenanceApprovalId"
            [rowHover]="true"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} records"
        >
            <ng-template #header>
                <tr>
                    <th pSortableColumn="maintenanceRequest.asset.assetName">Asset <p-sortIcon field="maintenanceRequest.asset.assetName" /></th>
                    <th pSortableColumn="maintenanceRequest.asset.propertyNumber">Property No.</th>
                    <th pSortableColumn="maintenanceRequest.requestedBy.lastName">Requested By</th>
                    <th pSortableColumn="maintenanceRequest.maintenanceStatus.requestStatusName">Status</th>
                    <th pSortableColumn="scheduledAt">Scheduled</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th style="width: 200px">Actions</th>
                </tr>
            </ng-template>
            <ng-template #body let-approval>
                <tr>
                    <td>
                        <div class="flex flex-col">
                            <span class="font-semibold">{{ approval.maintenanceRequest?.asset?.assetName || 'N/A' }}</span>
                            <span class="text-sm text-gray-600">{{ approval.maintenanceRequest?.maintenanceName }}</span>
                        </div>
                    </td>
                    <td>{{ approval.maintenanceRequest?.asset?.propertyNumber || 'N/A' }}</td>
                    <td>{{ formatUserName(approval.maintenanceRequest?.requestedBy) }}</td>
                    <td>
                        <p-tag
                            [value]="approval.maintenanceRequest?.maintenanceStatus?.requestStatusName || 'Unknown'"
                            [severity]="getStatusSeverity(approval.maintenanceRequest?.maintenanceStatus?.requestStatusName)"
                            [pTooltip]="getStatusTooltip(approval)"
                        />
                        <span *ngIf="isOverdue(approval)" class="ml-2">
                            <p-tag value="OVERDUE" severity="danger" icon="pi pi-exclamation-triangle" />
                        </span>
                    </td>
                    <td>{{ formatDate(approval.scheduledAt) }}</td>
                    <td>{{ formatUserName(approval.assignedTechnician) }}</td>
                    <td>
                        <p-tag *ngIf="approval.maintenanceRequest?.priorityLevel" [value]="approval.maintenanceRequest.priorityLevel.priorityLevelName" [severity]="getPrioritySeverity(approval.maintenanceRequest.priorityLevel.priorityLevelName)" />
                    </td>
                    <td>
                        <div class="flex gap-2">
                            <!-- View Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.VIEW)" icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" (onClick)="onView(approval)" pTooltip="View details" />

                            <!-- Confirm Schedule Button -->
                            <p-button
                                *ngIf="hasAction(approval, maintenanceActions.CONFIRM_SCHEDULE)"
                                icon="pi pi-calendar-check"
                                severity="success"
                                [rounded]="true"
                                [text]="true"
                                (onClick)="onConfirmSchedule(approval)"
                                pTooltip="Confirm schedule"
                            />

                            <!-- Approve Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.APPROVE)" icon="pi pi-check" severity="success" [rounded]="true" [text]="true" (onClick)="onApprove(approval)" pTooltip="Approve request" />

                            <!-- Decline Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.DECLINE)" icon="pi pi-times" severity="danger" [rounded]="true" [text]="true" (onClick)="onDecline(approval)" pTooltip="Decline request" />

                            <!-- Start Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.START)" icon="pi pi-play" severity="info" [rounded]="true" [text]="true" (onClick)="onStart(approval)" pTooltip="Start maintenance" />

                            <!-- Hold Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.HOLD)" icon="pi pi-pause" severity="warn" [rounded]="true" [text]="true" (onClick)="onHold(approval)" pTooltip="Put on hold" />

                            <!-- Resume Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.RESUME)" icon="pi pi-play" severity="success" [rounded]="true" [text]="true" (onClick)="onResume(approval)" pTooltip="Resume work" />

                            <!-- Complete Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.COMPLETE)" icon="pi pi-check-circle" severity="success" [rounded]="true" [text]="true" (onClick)="onComplete(approval)" pTooltip="Complete maintenance" />

                            <!-- Cancel Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.CANCEL)" icon="pi pi-ban" severity="danger" [rounded]="true" [text]="true" (onClick)="onCancel(approval)" pTooltip="Cancel maintenance" />

                            <!-- Delete Button -->
                            <p-button *ngIf="hasAction(approval, maintenanceActions.DELETE)" icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (onClick)="onDelete(approval)" pTooltip="Delete approval" />
                        </div>
                    </td>
                </tr>
            </ng-template>
            <ng-template #emptymessage>
                <tr>
                    <td colspan="8" class="text-center">No maintenance approvals found.</td>
                </tr>
            </ng-template>
        </p-table>
    `,
    styles: [``]
})
export class MaintenanceTableComponent implements OnChanges {
    @Input() approvals: MaintenanceApproval[] = [];
    @Input() loading: boolean = false;

    @Output() view = new EventEmitter<MaintenanceApproval>();
    @Output() confirmSchedule = new EventEmitter<MaintenanceApproval>();
    @Output() approve = new EventEmitter<MaintenanceApproval>();
    @Output() decline = new EventEmitter<MaintenanceApproval>();
    @Output() start = new EventEmitter<MaintenanceApproval>();
    @Output() hold = new EventEmitter<MaintenanceApproval>();
    @Output() resume = new EventEmitter<MaintenanceApproval>();
    @Output() complete = new EventEmitter<MaintenanceApproval>();
    @Output() cancel = new EventEmitter<MaintenanceApproval>();
    @Output() delete = new EventEmitter<MaintenanceApproval>();

    searchValue: string = '';
    displayApprovals: MaintenanceApproval[] = [];
    maintenanceActions = MaintenanceAction;

    constructor(private authService: AuthService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['approvals']) {
            this.displayApprovals = this.approvals;
            this.onSearch();
        }
    }

    onSearch(): void {
        if (!this.searchValue) {
            this.displayApprovals = this.approvals;
            return;
        }

        const searchLower = this.searchValue.toLowerCase();
        this.displayApprovals = this.approvals.filter((approval) => {
            const assetName = approval.maintenanceRequest?.asset?.assetName?.toLowerCase() || '';
            const propertyNumber = approval.maintenanceRequest?.asset?.propertyNumber?.toLowerCase() || '';
            const requesterName = MaintenanceUtils.formatUserName(approval.maintenanceRequest?.requestedBy).toLowerCase();

            return assetName.includes(searchLower) || propertyNumber.includes(searchLower) || requesterName.includes(searchLower);
        });
    }

    hasAction(approval: MaintenanceApproval, action: MaintenanceAction): boolean {
        const user = this.authService.getCurrentUser();
        if (!user) return false;

        const status = approval.maintenanceRequest?.maintenanceStatus?.requestStatusName || '';
        const isAssigned = approval.assignedTechnician?.userId === user.user_id;
        const availableActions = MaintenanceConstants.getAvailableActions(status, user.role, isAssigned);

        return availableActions.includes(action);
    }

    getStatusSeverity(status: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        return MaintenanceConstants.getStatusSeverity(status);
    }

    getPrioritySeverity(priority: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        return MaintenanceConstants.getPrioritySeverity(priority);
    }

    getStatusTooltip(approval: MaintenanceApproval): string {
        return MaintenanceUtils.getStatusTooltip(approval);
    }

    isOverdue(approval: MaintenanceApproval): boolean {
        return MaintenanceConstants.isOverdue(approval.scheduledAt);
    }

    formatUserName(user: any): string {
        return MaintenanceUtils.formatUserName(user);
    }

    formatDate(date: Date | string | undefined): string {
        return MaintenanceUtils.formatDate(date);
    }

    onView(approval: MaintenanceApproval): void {
        this.view.emit(approval);
    }

    onConfirmSchedule(approval: MaintenanceApproval): void {
        this.confirmSchedule.emit(approval);
    }

    onApprove(approval: MaintenanceApproval): void {
        this.approve.emit(approval);
    }

    onDecline(approval: MaintenanceApproval): void {
        this.decline.emit(approval);
    }

    onStart(approval: MaintenanceApproval): void {
        this.start.emit(approval);
    }

    onHold(approval: MaintenanceApproval): void {
        this.hold.emit(approval);
    }

    onResume(approval: MaintenanceApproval): void {
        this.resume.emit(approval);
    }

    onComplete(approval: MaintenanceApproval): void {
        this.complete.emit(approval);
    }

    onCancel(approval: MaintenanceApproval): void {
        this.cancel.emit(approval);
    }

    onDelete(approval: MaintenanceApproval): void {
        this.delete.emit(approval);
    }
}
