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

@Component({
    selector: 'app-campuses',
    standalone: true,
    imports: [CommonModule, FormsModule, CardModule, TableModule, ToastModule, ButtonModule, DataTableComponent, ToolbarComponent, ActionButtonsComponent],
    styleUrls: ['../../../assets/pages/_campuses.scss'],
    providers: [MessageService],
    template: `
        <p-toast />

        <app-toolbar [showNew]="true" [showDelete]="true" [selectedCount]="selectedCampuses.length" (newClick)="openNewCampusDialog()" (deleteClick)="deleteSelectedCampuses()">
            <ng-template #end>
                <div class="flex items-center gap-2">
                    <button pButton label="Export" icon="pi pi-upload" (click)="exportData()" class="p-button-secondary"></button>
                </div>
            </ng-template>
        </app-toolbar>

        <app-data-table
            [data]="filteredCampuses"
            [columns]="tableColumns"
            [loading]="loading"
            [searchable]="true"
            [selectable]="true"
            [paginator]="true"
            [rows]="10"
            [dataKey]="'campusId'"
            [(selection)]="selectedCampuses"
            (search)="onSearchInput($event)"
        >
            <ng-template #body let-campus>
                <tr>
                    <td>
                        <input type="checkbox" [checked]="isSelected(campus)" (change)="toggleSelection(campus)" class="p-checkbox-box" />
                    </td>
                    <td>{{ formatId(campus.campusId) }}</td>
                    <td>{{ campus.campusName }}</td>
                    <td>{{ campus.campusDirector || 'N/A' }}</td>
                    <td>
                        <app-action-buttons [data]="campus" [showView]="false" (edit)="editCampus($event)" (delete)="deleteCampus($event)" />
                    </td>
                </tr>
            </ng-template>
        </app-data-table>
    `
})
export class CampusesComponent extends BaseComponent implements OnInit {
    // State management
    loadingState: LoadingState = LoadingState.IDLE;
    isUpdating: boolean = false;
    isDeleting: boolean = false;

    // Data
    campuses: any[] = [];
    filteredCampuses: any[] = [];
    selectedCampuses: any[] = [];

    // Search
    private searchSubject$ = new Subject<string>();
    private currentSearchTerm: string = '';

    // Table configuration
    tableColumns: TableColumn[] = [
        { field: 'campusId', header: 'ID', sortable: false },
        { field: 'campusName', header: 'Campus', sortable: true },
        { field: 'campusDirector', header: 'Campus Director', sortable: true },
        { field: 'actions', header: 'Actions', sortable: false }
    ];

    // Computed properties
    get loading(): boolean {
        return isLoading(this.loadingState);
    }

    constructor(
        private userService: UserService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private exportService: ExportService,
        private errorHandler: ErrorHandlerService
    ) {
        super();
    }

    ngOnInit() {
        this.setupSearchDebounce();
        this.loadCampuses();
    }

    /**
     * Setup debounced search
     */
    private setupSearchDebounce(): void {
        this.searchSubject$.pipe(debounceInput(300), takeUntil(this.destroy$)).subscribe((searchTerm) => {
            this.currentSearchTerm = searchTerm;
            this.filterCampuses();
        });
    }

    /**
     * Handle search input
     */
    onSearchInput(searchTerm: string): void {
        this.searchSubject$.next(searchTerm);
    }

    /**
     * Load all campuses
     */
    loadCampuses(): void {
        if (this.loading) return;

        this.loadingState = LoadingState.LOADING;

        this.userService
            .getCampuses()
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
                    this.campuses = Array.isArray(response) ? response : response.data || [];
                    this.filteredCampuses = [...this.campuses];
                    this.loadingState = LoadingState.SUCCESS;
                },
                error: (error) => {
                    this.loadingState = LoadingState.ERROR;
                    this.errorHandler.handleErrorSilent(error, 'loading campuses');
                }
            });
    }

    /**
     * Filter campuses based on search term
     */
    private filterCampuses(): void {
        const searchValue = this.currentSearchTerm.toLowerCase();

        if (!searchValue.trim()) {
            this.filteredCampuses = [...this.campuses];
            return;
        }

        this.filteredCampuses = this.campuses.filter((campus) => campus.campusName?.toLowerCase().includes(searchValue) || campus.campusDirector?.toLowerCase().includes(searchValue));
    }

    /**
     * Open dialog to create new campus
     */
    async openNewCampusDialog(): Promise<void> {
        if (this.isUpdating) return;

        const result = await this.dialogService.showForm({
            title: '➕ Add New Campus',
            fields: [
                {
                    id: 'campusName',
                    label: 'Campus Name *',
                    type: 'text',
                    placeholder: 'Campus Name',
                    required: true
                },
                {
                    id: 'campusDirector',
                    label: 'Campus Director *',
                    type: 'text',
                    placeholder: 'Director Name',
                    required: true
                }
            ],
            confirmButtonText: 'Create Campus'
        });

        if (!result.isConfirmed || !result.value) return;

        const { campusName, campusDirector } = result.value;

        if (!campusName?.trim() || !campusDirector?.trim()) {
            this.dialogService.showError('Campus Name and Director are required');
            return;
        }

        this.isUpdating = true;

        this.userService
            .createCampus({
                campusName: campusName.trim(),
                campusDirector: campusDirector.trim()
            })
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isUpdating = false))
            )
            .subscribe({
                next: () => {
                    this.dialogService.showSuccess('Campus created successfully');
                    this.loadCampuses();
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'creating campus');
                }
            });
    }

    /**
     * Edit existing campus
     */
    async editCampus(campus: any): Promise<void> {
        if (this.isUpdating) return;

        const result = await this.dialogService.showForm({
            title: '✎ Edit Campus',
            fields: [
                {
                    id: 'campusName',
                    label: 'Campus Name *',
                    type: 'text',
                    value: campus.campusName,
                    required: true
                },
                {
                    id: 'campusDirector',
                    label: 'Campus Director *',
                    type: 'text',
                    value: campus.campusDirector,
                    required: true
                }
            ],
            confirmButtonText: 'Update Campus'
        });

        if (!result.isConfirmed || !result.value) return;

        const { campusName, campusDirector } = result.value;

        if (!campusName?.trim() || !campusDirector?.trim()) {
            this.dialogService.showError('Campus Name and Director are required');
            return;
        }

        this.isUpdating = true;

        this.userService
            .updateCampus(campus.campusId, {
                campusName: campusName.trim(),
                campusDirector: campusDirector.trim()
            })
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isUpdating = false))
            )
            .subscribe({
                next: () => {
                    this.dialogService.showSuccess('Campus updated successfully');
                    this.loadCampuses();
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'updating campus');
                }
            });
    }

    /**
     * Delete single campus
     */
    async deleteCampus(campus: any): Promise<void> {
        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirmDelete(`campus "${campus.campusName}"`);
        if (!confirmed) return;

        this.isDeleting = true;

        this.userService
            .deleteCampus(campus.campusId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isDeleting = false))
            )
            .subscribe({
                next: () => {
                    this.dialogService.showSuccess('Campus deleted successfully');
                    this.loadCampuses();
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'deleting campus');
                }
            });
    }

    /**
     * Delete multiple selected campuses
     */
    async deleteSelectedCampuses(): Promise<void> {
        if (!this.selectedCampuses || this.selectedCampuses.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select campuses to delete'
            });
            return;
        }

        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirm('Confirm Delete', `Are you sure you want to delete ${this.selectedCampuses.length} campus(es)?`);

        if (!confirmed) return;

        this.isDeleting = true;
        let deletedCount = 0;
        let failedCount = 0;
        const totalCount = this.selectedCampuses.length;

        this.selectedCampuses.forEach((campus) => {
            this.userService
                .deleteCampus(campus.campusId)
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
            this.selectedCampuses = [];
            this.loadCampuses();

            if (failed === 0) {
                this.dialogService.showSuccess(`${deleted} campus(es) deleted successfully`);
            } else {
                this.dialogService.showWarning(`${deleted} campus(es) deleted, ${failed} failed`, 'Partial Delete');
            }
        }
    }

    /**
     * Export campuses data
     */
    exportData(): void {
        if (this.filteredCampuses.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No data to export'
            });
            return;
        }

        const exportColumns: ExportColumn[] = [
            { field: 'campusName', header: 'Campus Name' },
            { field: 'campusDirector', header: 'Campus Director' }
        ];

        this.exportService.exportToCsv(this.filteredCampuses, 'campuses_export', exportColumns);

        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Campuses exported to CSV'
        });
    }

    /**
     * Check if a campus is selected
     */
    isSelected(campus: any): boolean {
        return this.selectedCampuses.some((c) => c.campusId === campus.campusId);
    }

    /**
     * Toggle selection of a campus
     */
    toggleSelection(campus: any): void {
        const index = this.selectedCampuses.findIndex((c) => c.campusId === campus.campusId);
        if (index > -1) {
            this.selectedCampuses.splice(index, 1);
        } else {
            this.selectedCampuses.push(campus);
        }
    }

    /**
     * Format ID to show only numbers (e.g., CAMPUS001 → 001)
     */
    formatId(id: string): string {
        if (!id) return '';
        return id.replace(/[^0-9]/g, '');
    }
}
