import { Component, OnInit, signal, ViewChild, Inject, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AssetService } from '../../service/asset.service';
import { MaintenanceService } from '../../service/maintenance.service';
import { AuthService } from '../../service/auth.service';
import Swal from 'sweetalert2';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';

@Component({
    selector: 'app-requestmaintenance',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        RippleModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        DialogModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        ConfirmDialogModule,
        TooltipModule,
        DatePickerModule,
        TabsModule
    ],
    styles: [],
    template: `
        <p-toast />
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

        <p-tabs (activeIndexChange)="onActiveIndexChange($event)">
            <p-tablist>
                <p-tab value="0" (click)="activeTabIndex = 0">Pending</p-tab>
                <p-tab value="1" (click)="activeTabIndex = 1">Approved</p-tab>
                <p-tab value="3" (click)="activeTabIndex = 2">Completed</p-tab>
            </p-tablist>
            <p-tabpanels>
                <!-- Pending Tab -->
                <p-tabpanel value="0">
                    <p-table
                        [value]="pendingItems"
                        [rows]="10"
                        [paginator]="true"
                        [rowsPerPageOptions]="[10, 20, 30]"
                        [loading]="loading"
                        [rowHover]="true"
                        dataKey="requestId"
                        [(selection)]="selectedItems"
                        (selectionChange)="onSelectionChange($event)"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} pending requests"
                        [showCurrentPageReport]="true"
                        [tableStyle]="{ 'min-width': '120rem' }"
                        styleClass="p-datatable-sm p-datatable-striped"
                    >
                        <ng-template pTemplate="header">
                            <tr>
                                <th style="width:3rem;padding:0.25rem"><p-tableHeaderCheckbox /></th>
                                <th style="min-width:7rem;padding:0.25rem">ID</th>
                                <th pSortableColumn="maintenanceName" style="min-width:9rem;padding:0.25rem">Asset Name <p-sortIcon field="maintenanceName" /></th>
                                <th style="min-width:8rem;padding:0.25rem">Maintenance Type</th>
                                <th style="min-width:8rem;padding:0.25rem">Service Name</th>
                                <th style="min-width:7rem;padding:0.25rem">Priority</th>
                                <th style="min-width:7rem;padding:0.25rem">Request Date</th>
                                <th style="min-width:8rem;padding:0.25rem">Requested By</th>
                                <th style="min-width:7rem;padding:0.25rem">Status</th>
                                <th style="min-width:7rem;padding:0.25rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td style="padding:0.25rem"><p-tableCheckbox [value]="row" /></td>
                                <td style="padding:0.25rem">{{ row.requestId }}</td>
                                <td style="padding:0.25rem">{{ row.maintenanceName }}</td>
                                <td style="padding:0.25rem">{{ row.maintenanceType?.maintenanceTypeName || 'N/A' }}</td>
                                <td style="padding:0.25rem">{{ row.serviceMaintenance?.serviceName || 'N/A' }}</td>
                                <td style="padding:0.25rem"><p-tag [value]="row.priorityLevel?.priorityLevelName" [severity]="getPrioritySeverity(row.priorityLevel?.priorityLevelName)" /></td>
                                <td style="padding:0.25rem">{{ row.requestDate || row.createdAt | date: 'short' }}</td>
                                <td style="padding:0.25rem">{{ getFullName(row) }}</td>
                                <td style="padding:0.25rem"><p-tag [value]="row.maintenanceStatus?.requestStatusName" /></td>
                                <td style="padding:0.25rem">
                                    <div class="flex gap-0.5">
                                        <ng-container *ngIf="isLabTech() || isCampusAdmin()">
                                            <p-button icon="pi pi-check" severity="success" [rounded]="true" [text]="true" pTooltip="Approve" (onClick)="approve(row)" size="small" />
                                            <p-button icon="pi pi-times" severity="danger" [rounded]="true" [text]="true" pTooltip="Decline" (onClick)="decline(row)" size="small" />
                                        </ng-container>
                                        <ng-container *ngIf="!isLabTech() && !isCampusAdmin()">
                                            <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" (onClick)="view(row)" size="small" />
                                            <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (onClick)="delete(row)" size="small" />
                                        </ng-container>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="10" class="text-center py-5">No pending requests found</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </p-tabpanel>

                <!-- Approved Tab -->
                <p-tabpanel value="1">
                    <div *ngIf="activeTabIndex === 1">
                        <p-table
                            [value]="getFilteredApprovedItems()"
                            [rows]="10"
                            [paginator]="true"
                            [rowsPerPageOptions]="[10, 20, 30]"
                            [loading]="loading"
                            [rowHover]="true"
                            dataKey="maintenanceApprovalId"
                            [(selection)]="selectedItems"
                            (selectionChange)="onSelectionChange($event)"
                            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} approved requests"
                            [showCurrentPageReport]="true"
                            [tableStyle]="{ 'min-width': '70rem' }"
                            styleClass="p-datatable-sm p-datatable-striped"
                            [scrollable]="true"
                            scrollHeight="flex"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th style="width:3rem;padding:0.25rem"><p-tableHeaderCheckbox /></th>
                                    <th style="min-width:8rem;padding:0.25rem">ID</th>
                                    <th pSortableColumn="maintenanceRequest.maintenanceName" style="min-width:10rem;padding:0.25rem">Maintenance Name <p-sortIcon field="maintenanceRequest.maintenanceName" /></th>
                                    <th style="min-width:10rem;padding:0.25rem">Assigned Technician</th>
                                    <th style="min-width:8rem;padding:0.25rem">Scheduled Date</th>
                                    <th style="min-width:8rem;padding:0.25rem">Status</th>
                                    <th style="min-width:8rem;padding:0.25rem" *ngIf="isLabTech()">Actions</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td style="padding:0.25rem"><p-tableCheckbox [value]="row" /></td>
                                    <td style="padding:0.25rem">{{ row.maintenanceRequest?.requestId }}</td>
                                    <td style="padding:0.25rem">{{ row.maintenanceRequest?.maintenanceName }}</td>
                                    <td style="padding:0.25rem">{{ row.assignedTechnician?.firstName }} {{ row.assignedTechnician?.lastName || '' }}</td>
                                    <td style="padding:0.25rem">{{ row.scheduledAt | date: 'short' }}</td>
                                    <td style="padding:0.25rem"><p-tag [value]="row.isCompleted ? 'Completed' : row.isApproved ? 'Approved' : 'Pending'" /></td>
                                    <td style="padding:0.25rem" *ngIf="isLabTech()">
                                        <div class="flex gap-0.5">
                                            <p-button label="Confirm" icon="pi pi-check" severity="success" [rounded]="true" [text]="false" (onClick)="confirm(row)" pTooltip="Confirm completion" size="small" />
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td [attr.colspan]="isLabTech() ? 7 : 6" class="text-center py-5">No approved requests found</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-tabpanel>

                <!-- Completed Tab -->
                <p-tabpanel value="2">
                    <div *ngIf="activeTabIndex === 2">
                        <p-table
                            [value]="completedItems"
                            [rows]="10"
                            [paginator]="true"
                            [rowsPerPageOptions]="[10, 20, 30]"
                            [loading]="loading"
                            [rowHover]="true"
                            dataKey="requestId"
                            [(selection)]="selectedItems"
                            (selectionChange)="onSelectionChange($event)"
                            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} completed requests"
                            [showCurrentPageReport]="true"
                            [tableStyle]="{ 'min-width': '70rem' }"
                            styleClass="p-datatable-sm p-datatable-striped"
                        >
                            <ng-template pTemplate="header">
                                <tr>
                                    <th style="width:3rem;padding:0.25rem"><p-tableHeaderCheckbox /></th>
                                    <th style="min-width:12rem;padding:0.25rem">ID</th>
                                    <th pSortableColumn="maintenanceName" style="min-width:14rem;padding:0.25rem">Maintenance Name <p-sortIcon field="maintenanceName" /></th>
                                    <th style="min-width:10rem;padding:0.25rem">Status</th>
                                    <th style="min-width:9rem;padding:0.25rem">Actions</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td style="padding:0.25rem"><p-tableCheckbox [value]="row" /></td>
                                    <td style="padding:0.25rem">{{ row.requestId }}</td>
                                    <td style="padding:0.25rem">{{ row.maintenanceName }}</td>
                                    <td style="padding:0.25rem"><p-tag [value]="row.maintenanceStatus?.requestStatusName" /></td>
                                    <td style="padding:0.25rem">
                                        <div class="flex gap-0.5">
                                            <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" (onClick)="view(row)" size="small" />
                                            <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (onClick)="delete(row)" size="small" />
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="5" class="text-center py-5">No completed requests found</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-tabpanel>

                <!-- Completed Approvals Tab -->
                <p-tabpanel value="3">
                    <p-table
                        [value]="completedApprovedItems"
                        [rows]="10"
                        [paginator]="true"
                        [rowsPerPageOptions]="[10, 20, 30]"
                        [loading]="loading"
                        [rowHover]="true"
                        dataKey="maintenanceApprovalId"
                        [(selection)]="selectedItems"
                        (selectionChange)="onSelectionChange($event)"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} completed approvals"
                        [showCurrentPageReport]="true"
                        [tableStyle]="{ 'min-width': '120rem' }"
                    >
                        <ng-template pTemplate="header">
                            <tr>
                                <th style="width:3rem"><p-tableHeaderCheckbox /></th>
                                <th style="min-width:20rem">ID</th>
                                <th pSortableColumn="maintenanceRequest.maintenanceName" style="min-width:18rem">Maintenance Name <p-sortIcon field="maintenanceRequest.maintenanceName" /></th>
                                <th style="min-width:12rem">Scheduled Date</th>
                                <th style="min-width:15rem">Remarks</th>
                                <th style="min-width:15rem">Action Taken</th>
                                <th style="min-width:15rem">Observations</th>
                                <th style="min-width:12rem">Expected Reading</th>
                                <th style="min-width:12rem">Actual Reading</th>
                                <th style="min-width:10rem">Status</th>
                                <th style="min-width:12rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td><p-tableCheckbox [value]="row" /></td>
                                <td>{{ row.maintenanceApprovalId }}</td>
                                <td>{{ row.maintenanceRequest?.maintenanceName }}</td>
                                <td>{{ row.scheduledAt | date: 'short' }}</td>
                                <td>{{ row.remarks || 'N/A' }}</td>
                                <td>{{ row.actionTaken || 'N/A' }}</td>
                                <td>{{ row.observations || 'N/A' }}</td>
                                <td>{{ row.expectedReading || 'N/A' }}</td>
                                <td>{{ row.actualReading || 'N/A' }}</td>
                                <td><p-tag value="Completed" severity="success" /></td>
                                <td>
                                    <div class="flex gap-2">
                                        <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" (onClick)="view(row)" />
                                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (onClick)="delete(row)" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="11" class="text-center py-5">No completed approvals found</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <p-dialog [(visible)]="approveModalVisible" [header]="'Assign Technician'" [modal]="true" [contentStyle]="{ padding: '2rem' }">
            <div class="space-y-5">
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold text-slate-700">Scheduled Date</label>
                        <p-iconfield class="w-full">
                            <p-inputicon styleClass="pi pi-calendar text-slate-400" />
                            <p-datepicker [(ngModel)]="approveFormData.scheduledAt" dateFormat="yy-mm-dd" appendTo="body" [styleClass]="'w-full'" placeholder="Select date" />
                        </p-iconfield>
                    </div>

                    <div class="space-y-2">
                        <label class="block text-sm font-semibold text-slate-700">Technician</label>
                        <p-select [(ngModel)]="approveFormData.technicianId" [options]="technicians" optionLabel="fullName" optionValue="userId" placeholder="Select technician" [styleClass]="'w-full'" [panelStyleClass]="'rounded'" appendTo="body" />
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="block text-sm font-semibold text-slate-700">Remarks</label>
                    <textarea pInputTextarea [(ngModel)]="approveFormData.remarks" rows="4" placeholder="Enter remarks..." class="w-full text-sm resize-none"></textarea>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="flex gap-2 justify-end pt-4">
                    <p-button label="Cancel" (onClick)="approveModalVisible = false" severity="secondary" outlined />
                    <p-button label="Assign" (onClick)="confirmApprove()" severity="success" icon="pi pi-check" />
                </div>
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="confirmModalVisible" [header]="'Complete Maintenance Request'" [modal]="true" [style]="{ width: '50vw' }">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                    <label class="font-semibold">Remarks</label>
                    <textarea pInputTextarea [(ngModel)]="confirmFormData.remarks" rows="3" placeholder="Enter remarks..."></textarea>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-semibold">Action Taken</label>
                    <textarea pInputTextarea [(ngModel)]="confirmFormData.actionTaken" rows="3" placeholder="Describe the action taken..."></textarea>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-semibold">Observations</label>
                    <textarea pInputTextarea [(ngModel)]="confirmFormData.observations" rows="3" placeholder="Enter observations..."></textarea>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-semibold">Expected Reading</label>
                    <input pInputText [(ngModel)]="confirmFormData.expectedReading" type="text" placeholder="Enter expected reading..." />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-semibold">Actual Reading</label>
                    <input pInputText [(ngModel)]="confirmFormData.actualReading" type="text" placeholder="Enter actual reading..." />
                </div>
            </div>
            <ng-template pTemplate="footer">
                <p-button label="Cancel" (onClick)="confirmModalVisible = false" severity="secondary" />
                <p-button label="Complete" (onClick)="confirmCompletion()" severity="success" />
            </ng-template>
        </p-dialog>
    `,
    providers: [MessageService, AssetService, ConfirmationService]
})
export class RequestmaintenanceComponent implements OnInit, AfterViewInit {
    @ViewChild('dt') dt!: Table;

    items: any[] = [];
    pendingItems: any[] = [];
    approvedItems: any[] = [];
    completedItems: any[] = [];
    completedApprovedItems: any[] = [];
    selectedItems: any[] = [];
    searchValue: string = '';
    loading: boolean = true;
    activeTabIndex: number = 0;
    approveModalVisible: boolean = false;
    confirmModalVisible: boolean = false;
    technicians: any[] = [];
    approveFormData: any = { technicianId: null, remarks: '', scheduledAt: null };
    confirmFormData: any = {
        remarks: '',
        actionTaken: '',
        observations: '',
        expectedReading: '',
        actualReading: ''
    };
    selectedItem: any = null;

    constructor(
        private maintenanceService: MaintenanceService,
        private messageService: MessageService,
        private authService: AuthService,
        private activatedRoute: ActivatedRoute
    ) {}

    ngOnInit() {
        // Check for tab parameter in query params
        this.activatedRoute.queryParams.subscribe((params) => {
            const tabParam = params['tab'];
            if (tabParam === 'pending') {
                this.activeTabIndex = 0;
            } else if (tabParam === 'approved') {
                this.activeTabIndex = 1;
            } else if (tabParam === 'completed') {
                this.activeTabIndex = 2;
            }
        });

        this.loadItems();
    }

    ngAfterViewInit() {
        // Manually set the active tab after view initialization
        setTimeout(() => {
            const tabs = document.querySelector('p-tabs');
            if (tabs) {
                (tabs as any).activeIndex = this.activeTabIndex;
            }
        }, 100);
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

    isCurrentUserTechnician(technicianUserId: string): boolean {
        const currentUser = this.authService.getCurrentUser();
        // The API returns userId, not user_id
        const currentUserId = (currentUser as any)?.userId;
        const isMatch = currentUserId === technicianUserId;
        console.log('🔍 Comparing:', { currentUserId, technicianUserId, isMatch });
        return isMatch;
    }

    getFilteredApprovedItems(): any[] {
        console.log('📋 All approved items:', this.approvedItems);
        console.log('👤 Current user:', this.authService.getCurrentUser());
        console.log('🔬 Is LabTech?', this.isLabTech());

        if (this.isLabTech()) {
            const filtered = this.approvedItems.filter((item) => {
                const isMatch = this.isCurrentUserTechnician(item.assignedTechnician?.userId);
                console.log(`Item: ${item.maintenanceRequest?.maintenanceName} - Assigned: ${item.assignedTechnician?.userId} - Match: ${isMatch}`);
                return isMatch;
            });
            console.log('✅ Filtered items for LabTech:', filtered);
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
                console.log('Maintenance Requests API Response:', data);
                if (data && data.length > 0) {
                    console.log('First item structure:', JSON.stringify(data[0], null, 2));
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
                console.log('Maintenance Approvals API Response:', data);
                const allApprovals = data || [];

                // Separate into approved (not completed) and completed
                this.approvedItems = allApprovals.filter((item) => !item.isCompleted);
                this.completedApprovedItems = allApprovals.filter((item) => item.isCompleted);

                console.log('✅ Approved items (not completed):', this.approvedItems);
                console.log('✅ Completed approved items:', this.completedApprovedItems);
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
        this.categorizeItems();

        const searchLower = this.searchValue.toLowerCase();

        this.pendingItems = this.pendingItems.filter((item) => item.maintenanceName?.toLowerCase().includes(searchLower) || item.requestId?.toLowerCase().includes(searchLower));

        this.approvedItems = this.approvedItems.filter((item) => {
            const maintenanceName = item.maintenanceRequest?.maintenanceName || item.maintenanceName || '';
            const requestId = item.maintenanceRequest?.requestId || item.requestId || '';
            return maintenanceName.toLowerCase().includes(searchLower) || requestId.toLowerCase().includes(searchLower);
        });

        this.completedItems = this.completedItems.filter((item) => item.maintenanceName?.toLowerCase().includes(searchLower) || item.requestId?.toLowerCase().includes(searchLower));

        this.completedApprovedItems = this.completedApprovedItems.filter((item) => {
            const maintenanceName = item.maintenanceRequest?.maintenanceName || item.maintenanceName || '';
            const requestId = item.maintenanceRequest?.requestId || item.requestId || '';
            return maintenanceName.toLowerCase().includes(searchLower) || requestId.toLowerCase().includes(searchLower);
        });
    }

    onTabChange(event: any) {
        console.log('Tab changed to index:', event.index);
        this.activeTabIndex = event.index;
        this.selectedItems = [];
    }

    onActiveIndexChange(event: any) {
        this.activeTabIndex = event as number;
        this.selectedItems = [];
    }

    filter() {
        this.filterByTab();
    }

    onSelectionChange(event: any) {
        console.log('Selected items:', this.selectedItems);
    }

    approve(item: any) {
        console.log('Approve clicked - Selected item:', item);
        this.selectedItem = item;
        this.approveFormData = { technicianId: null, remarks: '', scheduledAt: null };
        this.loadTechnicians(item.asset?.campus?.campusId);
        this.approveModalVisible = true;
    }

    loadTechnicians(campusId: string) {
        this.maintenanceService.getLabTechnicians().subscribe({
            next: (data: any[]) => {
                console.log('✅ Lab Technicians loaded:', data);
                // Map the data to add a fullName property for display
                this.technicians = data.map((tech) => ({
                    ...tech,
                    fullName: [tech.firstName, tech.middleName, tech.lastName].filter((name) => name && name.trim()).join(' ')
                }));
                console.log('Technicians with fullName:', this.technicians);
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

        console.log('Sending technician assignment payload:', assignmentPayload);

        // Use new endpoint: POST /api/maintenance-approvals/{requestId}/assign-technician
        this.maintenanceService.assignTechnician(this.selectedItem.requestId, assignmentPayload).subscribe({
            next: (response) => {
                console.log('Technician assigned successfully:', response);
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
            text: `Decline "${item.maintenanceName}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Decline',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.messageService.add({ severity: 'success', summary: 'Declined', detail: 'Maintenance request declined' });
                this.loadItems();
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
        console.log('👁️ View clicked - Item data:', item);
        console.log('Has maintenanceApprovalId?', !!item.maintenanceApprovalId);
        console.log('Request ID:', item.maintenanceRequestId || item.id || item.requestId);

        // Check if it's an approval item (has maintenanceApprovalId) or a request item
        if (item.maintenanceApprovalId) {
            console.log('📋 Showing approval details');
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
            console.log('📋 Fetching request details from API');
            // It's a request item - fetch from API
            const requestId = item.maintenanceRequestId || item.id || item.requestId;
            console.log('Using requestId:', requestId);
            this.maintenanceService.getMaintenanceRequest(requestId).subscribe({
                next: (data: any) => {
                    console.log('✅ Request data fetched:', data);
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
        console.log('🗑️ Delete clicked - Item:', item);
        console.log('Using requestId:', requestId);

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
        console.log('Confirm clicked - Selected approval item:', row);
        this.selectedItem = row;
        this.loading = true;

        // Fetch maintenance approval details from API
        this.maintenanceService.getMaintenanceApprovalDetails(row.maintenanceApprovalId).subscribe({
            next: (data: any) => {
                console.log('Maintenance approval details loaded:', data);
                this.confirmFormData = {
                    remarks: data.remarks || '',
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
        if (!this.confirmFormData.remarks.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Remarks is required' });
            return;
        }

        const completionPayload = {
            maintenanceRequest: this.selectedItem.maintenanceRequest?.requestId || this.selectedItem.requestId,
            remarks: this.confirmFormData.remarks.trim(),
            scheduledAt: this.selectedItem.scheduledAt || new Date(),
            isApproved: true,
            isCompleted: true,
            actionTaken: this.confirmFormData.actionTaken.trim(),
            observations: this.confirmFormData.observations.trim(),
            expectedReading: this.confirmFormData.expectedReading.trim(),
            actualReading: this.confirmFormData.actualReading.trim()
        };

        console.log('Sending completion payload:', completionPayload);

        this.maintenanceService.completeMaintenanceApproval(this.selectedItem.maintenanceApprovalId, completionPayload).subscribe({
            next: (response: any) => {
                console.log('Maintenance request completed successfully:', response);
                this.messageService.add({ severity: 'success', summary: 'Completed', detail: 'Maintenance request marked as completed' });
                this.confirmModalVisible = false;

                // Remove from approved items
                const index = this.approvedItems.findIndex((item) => item.maintenanceApprovalId === this.selectedItem.maintenanceApprovalId);
                if (index > -1) {
                    this.approvedItems.splice(index, 1);
                    console.log('Item removed from approved items');
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
