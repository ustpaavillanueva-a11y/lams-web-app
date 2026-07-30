import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

// PrimeNG
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

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
import { AssetService, InvCustlip, Color, Brand } from '../service/asset.service';

@Component({
    selector: 'app-custodian',
    standalone: true,
    imports: [CommonModule, FormsModule, ToastModule, DialogModule, TextareaModule, InputTextModule, SelectModule, DataTableComponent, ToolbarComponent, ActionButtonsComponent],
    template: `
        <p-toast />

        <app-toolbar [showNew]="true" [showDelete]="true" [selectedCount]="selectedInvCustlips.length" (newClick)="openNew()" (deleteClick)="deleteSelectedInvCustlips()" />

        <app-data-table
            [data]="invCustlips()"
            [columns]="columns"
            [loading]="loading"
            [searchable]="true"
            [exportable]="true"
            [selectable]="true"
            [paginator]="true"
            [rows]="10"
            title="Custodian Inventory"
            searchPlaceholder="Search assets..."
            [(selection)]="selectedInvCustlips"
            (search)="onSearch($event)"
            (exportExcel)="exportData()"
        >
            <ng-template #actionButtons let-rowData="rowData">
                <app-action-buttons [data]="rowData" [showView]="false" [showEdit]="true" [showDelete]="true" [editDisabled]="isUpdating" [deleteDisabled]="isDeleting" (edit)="editInvCustlip($event)" (delete)="deleteInvCustlip($event)" />
            </ng-template>
        </app-data-table>

        <p-dialog [(visible)]="invCustlipDialog" [style]="{ width: '800px' }" header="InvCustlip Details" [modal]="true">
            <ng-template #content>
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-6">
                        <label for="quantity" class="block font-bold mb-2">Quantity</label>
                        <input type="number" pInputText id="quantity" [(ngModel)]="invCustlip.Quantity" required fluid />
                        <small class="text-red-500" *ngIf="submitted && !invCustlip.Quantity">Quantity is required.</small>
                    </div>
                    <div class="col-span-6">
                        <label for="uom" class="block font-bold mb-2">Unit of Measure</label>
                        <input type="text" pInputText id="uom" [(ngModel)]="invCustlip.UoM" required fluid />
                        <small class="text-red-500" *ngIf="submitted && !invCustlip.UoM">Unit of Measure is required.</small>
                    </div>
                    <div class="col-span-6">
                        <label for="colorId" class="block font-bold mb-2">Color</label>
                        <p-select id="colorId" [(ngModel)]="invCustlip.color_id" [options]="colors" optionLabel="Description" optionValue="color_id" placeholder="Select a color" fluid> </p-select>
                    </div>
                    <div class="col-span-12">
                        <label for="description" class="block font-bold mb-2">Description</label>
                        <textarea id="description" pTextarea [(ngModel)]="invCustlip.Description" rows="3" fluid required></textarea>
                        <small class="text-red-500" *ngIf="submitted && !invCustlip.Description">Description is required.</small>
                    </div>
                    <div class="col-span-6">
                        <label for="brandId" class="block font-bold mb-2">Brand</label>
                        <p-select id="brandId" [(ngModel)]="invCustlip.brand_id" [options]="brands" optionLabel="BrandName" optionValue="brand_id" placeholder="Select a brand" fluid> </p-select>
                    </div>
                    <div class="col-span-6">
                        <label for="height" class="block font-bold mb-2">Height</label>
                        <input type="number" pInputText id="height" [(ngModel)]="invCustlip.height" step="0.01" fluid />
                    </div>
                    <div class="col-span-6">
                        <label for="width" class="block font-bold mb-2">Width</label>
                        <input type="number" pInputText id="width" [(ngModel)]="invCustlip.width" step="0.01" fluid />
                    </div>
                    <div class="col-span-6">
                        <label for="package" class="block font-bold mb-2">Package</label>
                        <input type="text" pInputText id="package" [(ngModel)]="invCustlip.package" fluid />
                    </div>
                    <div class="col-span-6">
                        <label for="material" class="block font-bold mb-2">Material</label>
                        <input type="text" pInputText id="material" [(ngModel)]="invCustlip.material" fluid />
                    </div>
                    <div class="col-span-6">
                        <label for="invNo" class="block font-bold mb-2">Inventory No</label>
                        <input type="text" pInputText id="invNo" [(ngModel)]="invCustlip.InvNo" fluid />
                    </div>
                    <div class="col-span-6">
                        <label for="dateAcquiredInv" class="block font-bold mb-2">Date Acquired</label>
                        <input type="date" pInputText id="dateAcquiredInv" [(ngModel)]="invCustlip.DateAcquired" fluid />
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
                <p-button label="Save" icon="pi pi-check" (click)="saveInvCustlip()" [disabled]="isUpdating" />
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [MessageService]
})
export class CustodianComponent extends BaseComponent implements OnInit {
    // State management
    loadingState: LoadingState = LoadingState.IDLE;
    isUpdating: boolean = false;
    isDeleting: boolean = false;

    invCustlipDialog: boolean = false;
    invCustlips = signal<InvCustlip[]>([]);
    invCustlip: InvCustlip = {};
    selectedInvCustlips: InvCustlip[] = [];
    submitted: boolean = false;

    // Reference data for dropdowns
    colors: Color[] = [];
    brands: Brand[] = [];

    // Table columns
    columns: TableColumn[] = [
        { field: 'InvNo', header: 'Inventory No', sortable: true },
        { field: 'Description', header: 'Description', sortable: true },
        { field: 'Quantity', header: 'Quantity', sortable: true },
        { field: 'UoM', header: 'Unit', sortable: true },
        { field: 'brand_id', header: 'Brand', sortable: true },
        { field: 'color_id', header: 'Color', sortable: true },
        { field: 'DateAcquired', header: 'Date Acquired', sortable: true }
    ];

    private searchSubject$ = new Subject<string>();
    private allItems: InvCustlip[] = [];

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
        this.loadInvCustlips();
        this.loadReferenceData();
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
    onSearch(searchTerm: string): void {
        this.searchSubject$.next(searchTerm);
    }

    /**
     * Filter data based on search term
     */
    private filterData(searchTerm: string): void {
        if (!searchTerm) {
            this.invCustlips.set(this.allItems);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = this.allItems.filter(
            (item) =>
                item.Description?.toLowerCase().includes(term) ||
                item.InvNo?.toLowerCase().includes(term) ||
                item.UoM?.toLowerCase().includes(term) ||
                this.getBrandName(item.brand_id)?.toLowerCase().includes(term) ||
                this.getColorName(item.color_id)?.toLowerCase().includes(term)
        );
        this.invCustlips.set(filtered);
    }

    /**
     * Load InvCustlips
     */
    loadInvCustlips(): void {
        if (this.loading) return;

        this.loadingState = LoadingState.LOADING;

        this.assetService
            .getInvCustlips()
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
                    this.allItems = data;
                    this.invCustlips.set(data);
                    this.loadingState = LoadingState.SUCCESS;
                },
                error: (error) => {
                    this.loadingState = LoadingState.ERROR;
                    this.errorHandler.handleError(error, 'loading inventory items');
                }
            });
    }

    /**
     * Load reference data (colors, brands)
     */
    loadReferenceData(): void {
        // Load colors
        this.assetService
            .getColors()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.colors = data;
                },
                error: (error) => {}
            });

        // Load brands
        this.assetService
            .getBrands()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.brands = data;
                },
                error: (error) => {}
            });
    }

    openNew() {
        this.invCustlip = {
            specs: {}
        };
        this.submitted = false;
        this.invCustlipDialog = true;
    }

    editInvCustlip(invCustlip: InvCustlip) {
        this.invCustlip = { ...invCustlip };
        if (!this.invCustlip.specs) {
            this.invCustlip.specs = {};
        }
        this.invCustlipDialog = true;
    }

    /**
     * Delete selected InvCustlips
     */
    async deleteSelectedInvCustlips(): Promise<void> {
        if (!this.selectedInvCustlips || this.selectedInvCustlips.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select items to delete'
            });
            return;
        }

        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirm('Confirm Delete', `Are you sure you want to delete ${this.selectedInvCustlips.length} item(s)?`);

        if (!confirmed) return;

        this.isDeleting = true;
        let deletedCount = 0;
        let failedCount = 0;
        const totalCount = this.selectedInvCustlips.length;

        this.selectedInvCustlips.forEach((item) => {
            this.assetService
                .deleteInvCustlip(item.inv_custlip_id!)
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
            this.selectedInvCustlips = [];
            this.loadInvCustlips();

            if (failed === 0) {
                this.dialogService.showSuccess(`${deleted} item(s) deleted successfully`);
            } else {
                this.dialogService.showWarning(`${deleted} item(s) deleted, ${failed} failed`, 'Partial Delete');
            }
        }
    }

    hideDialog() {
        this.invCustlipDialog = false;
        this.submitted = false;
    }

    /**
     * Delete single InvCustlip
     */
    async deleteInvCustlip(invCustlip: InvCustlip): Promise<void> {
        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirmDelete(`item "${invCustlip.Description}"`);
        if (!confirmed) return;

        this.isDeleting = true;

        this.assetService
            .deleteInvCustlip(invCustlip.inv_custlip_id!)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isDeleting = false))
            )
            .subscribe({
                next: () => {
                    this.loadInvCustlips();
                    this.invCustlip = { specs: {} };
                    this.dialogService.showSuccess('Item deleted successfully');
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'deleting item');
                }
            });
    }

    getBrandName(brandId?: string | number): string {
        if (!brandId) return '';
        const brand = this.brands.find((b: Brand) => b.brandId === String(brandId));
        return brand?.brandName || '';
    }

    getColorName(colorId?: string | number): string {
        if (!colorId) return '';
        const color = this.colors.find((c: Color) => c.colorId === String(colorId));
        return color?.colorName || '';
    }

    /**
     * Save InvCustlip
     */
    saveInvCustlip(): void {
        this.submitted = true;

        if (!this.invCustlip.Description?.trim()) {
            this.dialogService.showWarning('Description is required', 'Missing Information');
            return;
        }

        if (this.isUpdating) return;
        this.isUpdating = true;

        const saveOperation = this.invCustlip.inv_custlip_id ? this.assetService.updateInvCustlip(this.invCustlip.inv_custlip_id, this.invCustlip) : this.assetService.createInvCustlip(this.invCustlip);

        saveOperation
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isUpdating = false))
            )
            .subscribe({
                next: () => {
                    this.loadInvCustlips();
                    this.invCustlipDialog = false;
                    this.invCustlip = { specs: {} };
                    this.submitted = false;

                    const message = this.invCustlip.inv_custlip_id ? 'Item updated successfully' : 'Item created successfully';
                    this.dialogService.showSuccess(message);
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'saving item');
                }
            });
    }

    /**
     * Export data to CSV
     */
    exportData(): void {
        const items = this.invCustlips();
        if (items.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No data to export'
            });
            return;
        }

        const exportColumns: ExportColumn[] = [
            { field: 'InvNo', header: 'Invoice No' },
            { field: 'Description', header: 'Description' },
            { field: 'Quantity', header: 'Quantity' },
            { field: 'UoM', header: 'Unit' },
            { field: 'DateAcquired', header: 'Date Acquired' }
        ];

        this.exportService.exportToCsv(items, 'custodian_inventory', exportColumns);

        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data exported to CSV'
        });
    }
}
