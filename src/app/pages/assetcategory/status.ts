import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

// PrimeNG
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';

// Core
import { BaseComponent } from '../../core/base/base.component';
import { LoadingState, isLoading } from '../../core/models/loading-state.enum';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

// Shared
import { DialogService } from '../../shared/services/dialog.service';
import { ExportService, ExportColumn } from '../../shared/services/export.service';
import { debounceInput } from '../../shared/utils/rxjs-operators';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';
import { ActionButtonsComponent } from '../../shared/components/action-buttons/action-buttons.component';

// Services
import { AssetService, Status } from '../service/asset.service';

@Component({
    selector: 'app-status',
    standalone: true,
    imports: [CommonModule, ToastModule, TableModule, DataTableComponent, ToolbarComponent, ActionButtonsComponent],
    styleUrls: ['../../../assets/pages/_assetcategory.scss'],
    providers: [MessageService],
    template: `
        <p-toast />

        <app-toolbar [showNew]="true" [showDelete]="true" [selectedCount]="selectedItems.length" (newClick)="openNewDialog()" (deleteClick)="deleteSelected()" />

        <app-data-table
            [data]="filteredItems"
            [columns]="columns"
            [loading]="loading"
            [searchable]="true"
            [exportable]="true"
            [selectable]="true"
            [paginator]="true"
            [rows]="10"
            title="Status"
            searchPlaceholder="Search status..."
            [(selection)]="selectedItems"
            (search)="onSearchInput($event)"
            (exportExcel)="exportData()"
        >
            <ng-template #body let-item>
                <tr>
                    <td>
                        <input type="checkbox" [checked]="isSelected(item)" (change)="toggleSelection(item)" class="p-checkbox-box" />
                    </td>
                    <td>{{ item.statusId }}</td>
                    <td>{{ item.statusName }}</td>
                    <td>
                        <app-action-buttons [data]="item" [showView]="false" [showEdit]="true" [showDelete]="true" [editDisabled]="isUpdating" [deleteDisabled]="isDeleting" (edit)="edit($event)" (delete)="delete($event)" />
                    </td>
                </tr>
            </ng-template>
        </app-data-table>
    `
})
export class StatusComponent extends BaseComponent implements OnInit {
    // State management
    loadingState: LoadingState = LoadingState.IDLE;
    isUpdating: boolean = false;
    isDeleting: boolean = false;

    items: Status[] = [];
    filteredItems: Status[] = [];
    selectedItems: Status[] = [];

    // Table columns
    columns: TableColumn[] = [
        { field: 'statusId', header: 'ID', sortable: true },
        { field: 'statusName', header: 'Status', sortable: true }
    ];

    private searchSubject$ = new Subject<string>();

    // Computed properties
    get loading(): boolean {
        return isLoading(this.loadingState);
    }

    constructor(
        private assetService: AssetService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private exportService: ExportService,
        private errorHandler: ErrorHandlerService
    ) {
        super();
    }

    ngOnInit() {
        this.loadItems();
        this.setupSearchDebounce();
    }

    /**
     * Setup search debouncing
     */
    private setupSearchDebounce(): void {
        this.searchSubject$.pipe(debounceInput(300), takeUntil(this.destroy$)).subscribe((searchTerm) => {
            this.filterData(searchTerm);
        });
    }

    /**
     * Handle search input
     */
    onSearchInput(searchTerm: string): void {
        this.searchSubject$.next(searchTerm);
    }

    /**
     * Filter data based on search term
     */
    private filterData(searchTerm: string): void {
        if (!searchTerm) {
            this.filteredItems = [...this.items];
            return;
        }

        const term = searchTerm.toLowerCase();
        this.filteredItems = this.items.filter((item) => item.statusName?.toLowerCase().includes(term) || item.statusId?.toString().toLowerCase().includes(term));
    }

    /**
     * Load statuses
     */
    loadItems(): void {
        if (this.loading) return;

        this.loadingState = LoadingState.LOADING;

        this.assetService
            .getStatuses()
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    if (this.loadingState === LoadingState.LOADING) {
                        this.loadingState = LoadingState.IDLE;
                    }
                })
            )
            .subscribe({
                next: (data) => {
                    this.items = data || [];
                    this.filteredItems = [...this.items];
                    this.loadingState = LoadingState.SUCCESS;
                },
                error: (error) => {
                    this.loadingState = LoadingState.ERROR;
                    this.errorHandler.handleError(error, 'loading statuses');
                }
            });
    }

    onSelectionChange(event: any) {}

    /**
     * Open dialog to create new status
     */
    async openNewDialog(): Promise<void> {
        if (this.isUpdating) return;

        const result = await this.dialogService.showForm({
            title: 'New Status',
            fields: [
                {
                    name: 'statusName',
                    label: 'Status Name',
                    type: 'text',
                    required: true,
                    placeholder: 'Enter status name'
                }
            ]
        });

        if (!result.isConfirmed) return;

        this.isUpdating = true;

        this.assetService
            .createStatus(result.value)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isUpdating = false))
            )
            .subscribe({
                next: (created) => {
                    this.items.push(created);
                    this.filteredItems = [...this.items];
                    this.dialogService.showSuccess('Status created successfully');
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'creating status');
                }
            });
    }

    /**
     * Edit status
     */
    async edit(item: Status): Promise<void> {
        if (this.isUpdating) return;

        const result = await this.dialogService.showForm({
            title: 'Edit Status',
            fields: [
                {
                    name: 'statusName',
                    label: 'Status Name',
                    type: 'text',
                    required: true,
                    value: item.statusName
                }
            ]
        });

        if (!result.isConfirmed) return;

        this.isUpdating = true;

        this.assetService
            .updateStatus(item.statusId!, result.value)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isUpdating = false))
            )
            .subscribe({
                next: (updated) => {
                    const idx = this.items.findIndex((s) => s.statusId === updated.statusId);
                    if (idx > -1) this.items[idx] = updated;
                    this.filteredItems = [...this.items];
                    this.dialogService.showSuccess('Status updated successfully');
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'updating status');
                }
            });
    }

    /**
     * Delete status
     */
    async delete(item: Status): Promise<void> {
        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirmDelete(`status "${item.statusName}"`);
        if (!confirmed) return;

        this.isDeleting = true;

        this.assetService
            .deleteStatus(item.statusId!)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isDeleting = false))
            )
            .subscribe({
                next: () => {
                    this.items = this.items.filter((s) => s.statusId !== item.statusId);
                    this.filteredItems = [...this.items];
                    this.dialogService.showSuccess('Status deleted successfully');
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'deleting status');
                }
            });
    }

    /**
     * Delete selected statuses
     */
    async deleteSelected(): Promise<void> {
        if (!this.selectedItems?.length || this.isDeleting) return;

        const confirmed = await this.dialogService.confirm('Delete Selected', `Are you sure you want to delete ${this.selectedItems.length} status(es)?`);

        if (!confirmed) return;

        this.isDeleting = true;
        let deletedCount = 0;
        let failedCount = 0;
        const totalCount = this.selectedItems.length;

        this.selectedItems.forEach((item) => {
            this.assetService
                .deleteStatus(item.statusId!)
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

            // Reload items to get fresh state
            this.loadItems();
            this.selectedItems = [];

            if (failed === 0) {
                this.dialogService.showSuccess(`${deleted} status(es) deleted successfully`);
            } else {
                this.dialogService.showWarning(`${deleted} status(es) deleted, ${failed} failed`, 'Partial Delete');
            }
        }
    }

    /**
     * Check if an item is selected
     */
    isSelected(item: any): boolean {
        return this.selectedItems.some((i) => i.statusId === item.statusId);
    }

    /**
     * Toggle selection of an item
     */
    toggleSelection(item: any): void {
        const index = this.selectedItems.findIndex((i) => i.statusId === item.statusId);
        if (index > -1) {
            this.selectedItems.splice(index, 1);
        } else {
            this.selectedItems.push(item);
        }
    }

    /**
     * Export data to CSV
     */
    exportData(): void {
        if (this.items.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No data to export'
            });
            return;
        }

        const exportColumns: ExportColumn[] = [
            { field: 'statusName', header: 'Status Name' },
            { field: 'statusId', header: 'ID' }
        ];

        this.exportService.exportToCsv(this.items, 'statuses', exportColumns);

        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data exported to CSV'
        });
    }
}
