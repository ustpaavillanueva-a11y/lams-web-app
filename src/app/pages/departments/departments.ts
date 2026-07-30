import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

// PrimeNG
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

// Core
import { BaseComponent } from '../../core/base/base.component';
import { LoadingState, isLoading } from '../../core/models/loading-state.enum';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

// Shared
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';
import { ActionButtonsComponent } from '../../shared/components/action-buttons/action-buttons.component';
import { DialogService } from '../../shared/services/dialog.service';
import { ExportService, ExportColumn } from '../../shared/services/export.service';
import { debounceInput } from '../../shared/utils/rxjs-operators';

// Services
import { UserService } from '../service/user.service';
import { AuthService } from '../service/auth.service';
import { DepartmentsWebSocketService } from './departments-websocket.service';

@Component({
    selector: 'app-departments',
    standalone: true,
    imports: [CommonModule, FormsModule, CardModule, TableModule, ToastModule, ButtonModule, DataTableComponent, ToolbarComponent, ActionButtonsComponent],
    styleUrls: ['../../../assets/pages/_departments.scss'],
    providers: [MessageService],
    template: `
        <p-toast />

        <app-toolbar [showNew]="!isSuperAdmin" [showDelete]="true" [selectedCount]="selectedDepartments.length" (newClick)="openNewDepartmentDialog()" (deleteClick)="deleteSelectedDepartments()">
            <ng-template #end>
                <div class="flex items-center gap-2">
                    <button pButton label="Export" icon="pi pi-upload" (click)="exportData()" class="p-button-secondary"></button>
                </div>
            </ng-template>
        </app-toolbar>

        <app-data-table
            [data]="filteredDepartments"
            [columns]="tableColumns"
            [loading]="loading"
            [searchable]="true"
            [selectable]="true"
            [paginator]="true"
            [rows]="10"
            [dataKey]="'departmentId'"
            [(selection)]="selectedDepartments"
            (search)="onSearchInput($event)"
        >
            <ng-template #body let-department>
                <tr>
                    <td>
                        <input type="checkbox" [checked]="isSelected(department)" (change)="toggleSelection(department)" class="p-checkbox-box" />
                    </td>
                    <td>{{ formatId(department.departmentId) }}</td>
                    <td>{{ department.departmentName }}</td>
                    <td>{{ department.campus?.campusName || 'N/A' }}</td>
                    <td>
                        <app-action-buttons [data]="department" [showView]="false" (edit)="editDepartment($event)" (delete)="deleteDepartment($event)" />
                    </td>
                </tr>
            </ng-template>
        </app-data-table>
    `
})
export class DepartmentsComponent extends BaseComponent implements OnInit {
    // State management
    loadingState: LoadingState = LoadingState.IDLE;
    isUpdating: boolean = false;
    isDeleting: boolean = false;

    // Data
    departments: any[] = [];
    filteredDepartments: any[] = [];
    selectedDepartments: any[] = [];
    campuses: any[] = [];

    // User role
    isSuperAdmin: boolean = false;

    // Search
    private searchSubject$ = new Subject<string>();
    private currentSearchTerm: string = '';

    // Table configuration
    tableColumns: TableColumn[] = [
        { field: 'departmentId', header: 'ID', sortable: false },
        { field: 'departmentName', header: 'Department', sortable: true },
        { field: 'campus.campusName', header: 'Campus', sortable: true },
        { field: 'actions', header: 'Actions', sortable: false }
    ];

    // Computed properties
    get loading(): boolean {
        return isLoading(this.loadingState);
    }

    constructor(
        private userService: UserService,
        private messageService: MessageService,
        private authService: AuthService,
        private dialogService: DialogService,
        private exportService: ExportService,
        private errorHandler: ErrorHandlerService,
        private departmentsWebSocketService: DepartmentsWebSocketService
    ) {
        super();
    }

    ngOnInit() {
        this.checkUserRole();
        this.setupSearchDebounce();
        this.loadDepartments();
        this.loadCampuses();
        this.connectToWebSocket();
    }

    /**
     * Connect to WebSocket and subscribe to real-time updates
     */
    private connectToWebSocket(): void {
        // Check if user is authenticated before connecting
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠️ Skipping WebSocket connection - user not authenticated');
            return;
        }

        try {
            this.departmentsWebSocketService.connect();

            // Listen for department creation
            this.departmentsWebSocketService
                .onDepartmentCreated()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (event) => {
                        if (event.success) {
                            this.loadDepartments();
                            this.messageService.add({
                                severity: 'info',
                                summary: 'Department Created',
                                detail: `${event.data.departmentName} was created`,
                                life: 3000
                            });
                        }
                    },
                    error: (error) => {}
                });

            // Listen for department updates
            this.departmentsWebSocketService
                .onDepartmentUpdated()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (event) => {
                        if (event.success) {
                            const index = this.departments.findIndex((d) => d.departmentId === event.data.departmentId);
                            if (index !== -1) {
                                this.departments[index] = event.data;
                                this.filterDepartments();
                            }
                            this.messageService.add({
                                severity: 'info',
                                summary: 'Department Updated',
                                detail: `${event.data.departmentName} was updated`,
                                life: 3000
                            });
                        }
                    },
                    error: (error) => {}
                });

            // Listen for department deletions
            this.departmentsWebSocketService
                .onDepartmentDeleted()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (event) => {
                        if (event.success) {
                            this.departments = this.departments.filter((d) => d.departmentId !== event.data.departmentId);
                            this.filterDepartments();
                            this.messageService.add({
                                severity: 'info',
                                summary: 'Department Deleted',
                                detail: 'A department was deleted',
                                life: 3000
                            });
                        }
                    },
                    error: (error) => {}
                });
        } catch (error) {}
    }

    /**
     * Override ngOnDestroy to disconnect from WebSocket
     */
    override ngOnDestroy(): void {
        this.departmentsWebSocketService.disconnect();
        super.ngOnDestroy();
    }

    /**
     * Check if user is SuperAdmin
     */
    private checkUserRole(): void {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                this.isSuperAdmin = user.role === 'SuperAdmin';
            } catch (error) {
                this.isSuperAdmin = false;
            }
        }
    }

    /**
     * Setup debounced search
     */
    private setupSearchDebounce(): void {
        this.searchSubject$.pipe(debounceInput(300), takeUntil(this.destroy$)).subscribe((searchTerm) => {
            this.currentSearchTerm = searchTerm;
            this.filterDepartments();
        });
    }

    /**
     * Handle search input
     */
    onSearchInput(searchTerm: string): void {
        this.searchSubject$.next(searchTerm);
    }

    /**
     * Load all departments
     */
    loadDepartments(): void {
        if (this.loading) return;

        this.loadingState = LoadingState.LOADING;

        this.userService
            .getDepartments()
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    if (this.loadingState === LoadingState.LOADING) {
                        this.loadingState = LoadingState.IDLE;
                    }
                })
            )
            .subscribe({
                next: (response: any) => {
                    this.departments = Array.isArray(response) ? response : response.data || [];
                    this.filteredDepartments = [...this.departments];
                    this.loadingState = LoadingState.SUCCESS;
                },
                error: (error) => {
                    this.loadingState = LoadingState.ERROR;
                    this.errorHandler.handleError(error, 'loading departments');
                }
            });
    }

    /**
     * Load campuses for dropdown
     */
    loadCampuses(): void {
        this.userService
            .getCampuses()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    this.campuses = Array.isArray(response) ? response : response.data || [];
                },
                error: (error) => {}
            });
    }

    /**
     * Filter departments based on search term
     */
    private filterDepartments(): void {
        const searchValue = this.currentSearchTerm.toLowerCase();

        if (!searchValue.trim()) {
            this.filteredDepartments = [...this.departments];
            return;
        }

        this.filteredDepartments = this.departments.filter((dept) => dept.departmentName?.toLowerCase().includes(searchValue) || dept.campus?.campusName?.toLowerCase().includes(searchValue));
    }

    /**
     * Open dialog to create new department
     */
    async openNewDepartmentDialog(): Promise<void> {
        if (this.isUpdating) return;

        const result = await this.dialogService.showForm({
            title: '➕ Add New Department',
            fields: [
                {
                    id: 'departmentName',
                    label: 'Department Name *',
                    type: 'text',
                    placeholder: 'Department Name',
                    required: true
                }
            ],
            confirmButtonText: 'Create Department'
        });

        if (!result.isConfirmed || !result.value) return;

        const { departmentName } = result.value;

        if (!departmentName?.trim()) {
            this.dialogService.showError('Department Name is required');
            return;
        }

        this.isUpdating = true;

        this.userService
            .createDepartment({ departmentName: departmentName.trim() })
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isUpdating = false))
            )
            .subscribe({
                next: () => {
                    this.dialogService.showSuccess('Department created successfully');
                    this.loadDepartments();
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'creating department');
                }
            });
    }

    /**
     * Edit existing department
     */
    async editDepartment(department: any): Promise<void> {
        if (this.isUpdating) return;

        const result = await this.dialogService.showForm({
            title: '✎ Edit Department',
            fields: [
                {
                    id: 'departmentName',
                    label: 'Department Name *',
                    type: 'text',
                    value: department.departmentName,
                    required: true
                }
            ],
            confirmButtonText: 'Update Department'
        });

        if (!result.isConfirmed || !result.value) return;

        const { departmentName } = result.value;

        if (!departmentName?.trim()) {
            this.dialogService.showError('Department Name is required');
            return;
        }

        this.isUpdating = true;

        this.userService
            .updateDepartment(department.departmentId, {
                departmentName: departmentName.trim()
            })
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isUpdating = false))
            )
            .subscribe({
                next: () => {
                    this.dialogService.showSuccess('Department updated successfully');
                    this.loadDepartments();
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'updating department');
                }
            });
    }

    /**
     * Delete single department
     */
    async deleteDepartment(department: any): Promise<void> {
        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirmDelete(`department "${department.departmentName}"`);
        if (!confirmed) return;

        this.isDeleting = true;

        this.userService
            .deleteDepartment(department.departmentId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isDeleting = false))
            )
            .subscribe({
                next: () => {
                    this.dialogService.showSuccess('Department deleted successfully');
                    this.loadDepartments();
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'deleting department');
                }
            });
    }

    /**
     * Delete multiple selected departments
     */
    async deleteSelectedDepartments(): Promise<void> {
        if (!this.selectedDepartments || this.selectedDepartments.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select departments to delete'
            });
            return;
        }

        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirm('Confirm Delete', `Are you sure you want to delete ${this.selectedDepartments.length} department(s)?`);

        if (!confirmed) return;

        this.isDeleting = true;
        let deletedCount = 0;
        let failedCount = 0;
        const totalCount = this.selectedDepartments.length;

        this.selectedDepartments.forEach((department) => {
            this.userService
                .deleteDepartment(department.departmentId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        deletedCount++;
                        this.checkBulkDeleteComplete(deletedCount, failedCount, totalCount);
                    },
                    error: (error) => {
                        failedCount++;
                        this.checkBulkDeleteComplete(deletedCount, failedCount, totalCount);
                    }
                });
        });
    }

    /**
     * Check if bulk delete operation is complete
     */
    private checkBulkDeleteComplete(deleted: number, failed: number, total: number): void {
        if (deleted + failed === total) {
            this.isDeleting = false;
            this.selectedDepartments = [];
            this.loadDepartments();

            if (failed === 0) {
                this.dialogService.showSuccess(`${deleted} department(s) deleted successfully`);
            } else {
                this.dialogService.showWarning(`${deleted} department(s) deleted, ${failed} failed`, 'Partial Delete');
            }
        }
    }

    /**
     * Export departments data
     */
    exportData(): void {
        if (this.filteredDepartments.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No data to export'
            });
            return;
        }

        const exportColumns: ExportColumn[] = [
            { field: 'departmentName', header: 'Department Name' },
            { field: 'campus.campusName', header: 'Campus Name' }
        ];

        this.exportService.exportToCsv(this.filteredDepartments, 'departments_export', exportColumns);

        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Departments exported to CSV'
        });
    }

    /**
     * Check if a department is selected
     */
    isSelected(department: any): boolean {
        return this.selectedDepartments.some((d) => d.departmentId === department.departmentId);
    }

    /**
     * Toggle selection of a department
     */
    toggleSelection(department: any): void {
        const index = this.selectedDepartments.findIndex((d) => d.departmentId === department.departmentId);
        if (index > -1) {
            this.selectedDepartments.splice(index, 1);
        } else {
            this.selectedDepartments.push(department);
        }
    }

    /**
     * Format ID to show only numbers (e.g., DEPT001 → 001)
     */
    formatId(id: string): string {
        if (!id) return '';
        return id.replace(/[^0-9]/g, '');
    }
}
