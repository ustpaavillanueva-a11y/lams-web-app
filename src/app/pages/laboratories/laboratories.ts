import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { BaseComponent } from '../../core/base/base.component';
import { LoadingState, isLoading } from '../../core/models/loading-state.enum';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { DialogService } from '../../shared/services/dialog.service';
import { ExportService, ExportColumn } from '../../shared/services/export.service';
import { debounceInput } from '../../shared/utils/rxjs-operators';
import { LaboratoriesWebSocketService } from './laboratories-websocket.service';

import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-laboratories',
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
        TagModule,
        InputIconModule,
        IconFieldModule,
        TooltipModule,
        DialogModule,
        SelectModule,
        InputNumberModule,
        TextareaModule,
        DatePickerModule
    ],
    providers: [MessageService],
    template: `
        <p-toast />

        <!-- Laboratory Details View (when viewing specific lab via route param) -->
        <div *ngIf="selectedLaboratoryId && selectedLaboratoryData" class="mb-4">
            <p-toolbar styleClass="mb-4 mt-4">
                <ng-template #start>
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-semibold">Assets in {{ selectedLaboratoryData.laboratoryName }} ({{ selectedLaboratoryData.assets?.length || 0 }})</span>
                    </div>
                </ng-template>
                <ng-template #end>
                    <div class="flex items-center gap-2">
                        <p-button label="Delete Selected" icon="pi pi-trash" severity="secondary" outlined (onClick)="deleteSelectedAssets()" [disabled]="!selectedAssets.length" />
                        <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportAssetsCSV()" />
                    </div>
                </ng-template>
            </p-toolbar>

            <p-table
                #dtAssets
                [value]="selectedLaboratoryData.assets || []"
                [rows]="10"
                [paginator]="true"
                [rowsPerPageOptions]="[10, 20, 30]"
                [loading]="loading"
                [rowHover]="true"
                dataKey="assetId"
                [(selection)]="selectedAssets"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} assets"
                [showCurrentPageReport]="true"
            >
                <ng-template pTemplate="header">
                    <tr>
                        <th style="width:3rem"><p-tableHeaderCheckbox /></th>
                        <th pSortableColumn="assetName">Asset <p-sortIcon field="assetName" /></th>
                        <th>Property #</th>
                        <th>Category</th>
                        <th>Issued To</th>
                        <th style="width:5rem">QR Code</th>
                        <!-- <th style="min-width:12rem">Actions</th> -->
                    </tr>
                </ng-template>

                <ng-template pTemplate="body" let-asset>
                    <tr>
                        <td style="width: 3rem"><p-tableCheckbox [value]="asset" /></td>
                        <td>{{ asset.assetName }}</td>
                        <td>{{ asset.propertyNumber }}</td>
                        <td><p-tag [value]="asset.category || 'N/A'" /></td>
                        <td>{{ asset.issuedTo }}</td>
                        <td>
                            <div *ngIf="asset.qrCode" class="inline-block">
                                <img
                                    *ngIf="isBase64Image(asset.qrCode)"
                                    [src]="asset.qrCode"
                                    alt="QR Code"
                                    class="w-14 h-14 rounded-lg border-2 border-gray-300 cursor-pointer hover:shadow-lg hover:scale-110 transition-all"
                                    pTooltip="Click to view QR Code"
                                />
                                <span *ngIf="!isBase64Image(asset.qrCode)" class="text-sm bg-blue-100 px-2 py-1 rounded cursor-pointer hover:bg-blue-200 transition-colors" pTooltip="Click to copy QR Code">
                                    {{ asset.qrCode }}
                                </span>
                            </div>
                            <span *ngIf="!asset.qrCode" class="text-gray-400">N/A</span>
                        </td>
                        <td>
                            <!-- <div class="flex gap-2">
                                <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" pTooltip="View" />
                                <p-button icon="pi pi-pencil" severity="secondary" [rounded]="true" [text]="true" pTooltip="Edit" />
                                <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" pTooltip="Delete" />
                            </div> -->
                        </td>
                    </tr>
                </ng-template>

                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="7" class="text-center py-5">No assets in this laboratory</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <!-- Laboratories List View (when not viewing specific lab) -->
        <div *ngIf="!selectedLaboratoryId">
            <p-toolbar styleClass="mb-4">
                <ng-template #start>
                    <div class="flex items-center gap-2">
                        <p-button label="New" icon="pi pi-plus" severity="secondary" (onClick)="openNew()" />
                        <p-button label="Delete Selected" icon="pi pi-trash" severity="secondary" outlined (onClick)="deleteSelected()" [disabled]="!selectedLabs.length" />
                    </div>
                </ng-template>
                <ng-template #end>
                    <div class="flex items-center gap-2">
                        <p-button label="Reports" icon="pi pi-chart-bar" severity="info" [outlined]="true" (onClick)="goToReports()" />
                        <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" [(ngModel)]="currentSearchTerm" (input)="filter()" placeholder="Search laboratories..." />
                        </p-iconfield>
                    </div>
                </ng-template>
            </p-toolbar>

            <p-table
                #dt
                [value]="laboratories"
                [rows]="10"
                [paginator]="true"
                [rowsPerPageOptions]="[10, 20, 30]"
                [loading]="loading"
                [rowHover]="true"
                dataKey="laboratoryId"
                [(selection)]="selectedLabs"
                (selectionChange)="onSelectionChange($event)"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} laboratories"
                [showCurrentPageReport]="true"
            >
                <ng-template pTemplate="header">
                    <tr>
                        <th style="width:3rem"><p-tableHeaderCheckbox /></th>
                        <th>ID</th>
                        <th pSortableColumn="laboratoryName">Laboratory Name <p-sortIcon field="laboratoryName" /></th>
                        <th>Campus</th>
                        <th style="width:6rem">Actions</th>
                    </tr>
                </ng-template>

                <ng-template pTemplate="body" let-lab>
                    <tr>
                        <td style="width: 3rem"><p-tableCheckbox [value]="lab" /></td>
                        <td>{{ lab.laboratoryId }}</td>
                        <td>{{ lab.laboratoryName }}</td>
                        <td>{{ lab.campus?.campusName }}</td>
                        <td>
                            <div class="flex gap-2">
                                <!-- <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" (onClick)="view(lab)" /> -->
                                <p-button icon="pi pi-pencil" severity="secondary" [rounded]="true" [text]="true" (onClick)="edit(lab)" />
                                <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (onClick)="delete(lab)" />
                            </div>
                        </td>
                    </tr>
                </ng-template>

                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="5" class="text-center py-5">No laboratories found</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>

        <!-- New Laboratory Dialog -->
        <p-dialog [(visible)]="labDialog" [style]="{ width: '500px' }" header="Laboratory" [modal]="true" [closable]="true" (onHide)="closeDialog()">
            <ng-template #content>
                <div class="grid grid-cols-12 gap-4 mt-2">
                    <div class="col-span-12">
                        <label class="block font-bold mb-2">Laboratory Name *</label>
                        <input pInputText [(ngModel)]="newLab.laboratoryName" placeholder="Enter laboratory name" class="w-full" />
                    </div>
                    <div class="col-span-12">
                        <label class="block font-bold mb-2">Laboratory Location *</label>
                        <input pInputText [(ngModel)]="newLab.laboratoryLocation" placeholder="Enter laboratory location" class="w-full" />
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" text (click)="closeDialog()" />
                    <p-button label="Save" icon="pi pi-check" (click)="saveLab()" />
                </div>
            </ng-template>
        </p-dialog>

        <!-- Reports Dialog -->
        <p-dialog [(visible)]="reportDialog" [style]="{ width: '95vw', maxWidth: '1200px' }" header="Laboratory Utilization Report" [modal]="true" [closable]="true" [maximizable]="true" (onHide)="closeReportDialog()">
            <ng-template #content>
                <!-- USTP Header -->
                <div class="text-center mb-4">
                    <img [src]="headerImgUrl" alt="USTP Header" class="mx-auto mb-2" style="max-width: 100%; height: auto;" onerror="this.style.display='none'" />
                    <h3 class="text-lg font-bold m-0">LABORATORY MANAGEMENT OFFICE</h3>
                    <h2 class="text-xl font-bold m-0 mt-1">LABORATORY UTILIZATION REPORT</h2>
                </div>

                <!-- Filters -->
                <div class="flex flex-wrap items-end gap-4 mb-4 p-3 bg-gray-50 rounded-lg border">
                    <div>
                        <label class="block font-bold mb-1 text-sm">Month</label>
                        <p-datepicker [(ngModel)]="reportFilters.month" view="month" dateFormat="MM yy" [showIcon]="true" [style]="{ width: '200px' }" (onSelect)="onMonthChange()" />
                    </div>
                    <div>
                        <label class="block font-bold mb-1 text-sm">Inclusive Dates (Week)</label>
                        <p-select [options]="weekOptions" [(ngModel)]="reportFilters.week" optionLabel="label" optionValue="value" placeholder="Select Week" [style]="{ width: '280px' }" (onChange)="generateReport()" />
                    </div>
                    <div>
                        <p-button label="Generate" icon="pi pi-refresh" (onClick)="generateReport()" severity="info" />
                    </div>
                    <div *ngIf="reportWeekData.length > 0">
                        <p-button label="Download Excel" icon="pi pi-download" (onClick)="downloadExcelReport()" severity="success" />
                    </div>
                </div>

                <!-- Excel-like Utilization Table -->
                <div *ngIf="reportWeekData.length > 0" class="overflow-auto border rounded-lg">
                    <table class="w-full border-collapse text-sm" style="min-width: 850px;">
                        <thead>
                            <tr class="bg-blue-800 text-white">
                                <th class="border border-gray-300 px-3 py-2 text-left" rowspan="2" style="width: 180px;">Laboratory</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" rowspan="2" style="width: 100px;"></th>
                                <th class="border border-gray-300 px-2 py-1 text-center" *ngFor="let day of weekDayHeaders">{{ day }}</th>
                                <th class="border border-gray-300 px-2 py-2 text-center font-bold" rowspan="2">Total</th>
                                <th class="border border-gray-300 px-2 py-2 text-center font-bold" rowspan="2">% Utilization</th>
                            </tr>
                        </thead>
                        <tbody>
                            <ng-container *ngFor="let lab of reportWeekData; let i = index">
                                <!-- Available Hours Row -->
                                <tr [ngClass]="{ 'bg-blue-50': i % 2 === 0, 'bg-white': i % 2 !== 0 }">
                                    <td class="border border-gray-300 px-3 py-1 font-semibold" [attr.rowspan]="2">{{ lab.laboratoryName }}</td>
                                    <td class="border border-gray-300 px-2 py-1 text-center text-xs font-medium bg-gray-100">Available Hrs</td>
                                    <td class="border border-gray-300 px-2 py-1 text-center" *ngFor="let hrs of lab.availableHours">{{ hrs }}</td>
                                    <td class="border border-gray-300 px-2 py-1 text-center font-bold">{{ lab.totalAvailable }}</td>
                                    <td class="border border-gray-300 px-2 py-1 text-center font-bold text-lg text-black" [attr.rowspan]="2">{{ lab.totalAvailable > 0 ? (lab.utilization | number: '1.2-2') : '0.00' }}%</td>
                                </tr>
                                <!-- Actual Hours Row -->
                                <tr [ngClass]="{ 'bg-blue-50': i % 2 === 0, 'bg-white': i % 2 !== 0 }">
                                    <td class="border border-gray-300 px-2 py-1 text-center text-xs font-medium bg-gray-100">Actual Hrs</td>
                                    <td class="border border-gray-300 px-1 py-0 text-center" *ngFor="let hrs of lab.actualHours; let j = index">
                                        <input
                                            type="number"
                                            [value]="hrs"
                                            min="0"
                                            [max]="lab.availableHours[j]"
                                            class="w-full text-center border-0 bg-transparent outline-none py-1 text-sm text-black"
                                            style="appearance: textfield; -moz-appearance: textfield; -webkit-appearance: none;"
                                            (change)="onActualHoursChange(i, j, $event)"
                                        />
                                    </td>
                                    <td class="border border-gray-300 px-2 py-1 text-center font-bold text-black">{{ lab.totalActual }}</td>
                                </tr>
                            </ng-container>
                        </tbody>
                    </table>
                </div>

                <!-- Signatories -->
                <div *ngIf="reportWeekData.length > 0" class="mt-8 grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                        <p class="mb-8">Prepared by:</p>
                        <div class="border-t border-black mx-4 pt-1">
                            <p class="font-bold m-0">_________________________</p>
                            <p class="text-xs text-gray-600 m-0">Laboratory Technician</p>
                        </div>
                    </div>
                    <div>
                        <p class="mb-8">Noted by:</p>
                        <div class="border-t border-black mx-4 pt-1">
                            <p class="font-bold m-0">_________________________</p>
                            <p class="text-xs text-gray-600 m-0">LMO Coordinator</p>
                        </div>
                    </div>
                    <div>
                        <p class="mb-8">Head:</p>
                        <div class="border-t border-black mx-4 pt-1">
                            <p class="font-bold m-0">_________________________</p>
                            <p class="text-xs text-gray-600 m-0">Academic Head</p>
                        </div>
                    </div>
                </div>

                <!-- Notes -->
                <div *ngIf="reportWeekData.length > 0" class="mt-6 p-3 bg-gray-50 rounded-lg border text-xs text-gray-600">
                    <p class="font-bold mb-1">Notes:</p>
                    <ul class="list-disc pl-4 m-0 space-y-1">
                        <li><strong>Available Hours</strong> — the total number of hours the laboratory is open and available for use (based on operating schedule).</li>
                        <li><strong>Actual Hours</strong> — the total number of hours the laboratory was actually used by students/faculty.</li>
                        <li><strong>% Utilization</strong> = (Actual Hours / Available Hours) × 100.</li>
                        <li>Sundays and holidays are excluded from available hours.</li>
                    </ul>
                </div>

                <div *ngIf="reportWeekData.length === 0" class="text-center py-8 text-gray-500">
                    <i class="pi pi-chart-bar text-4xl mb-2"></i>
                    <p>Select a month and week to generate the utilization report.</p>
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class LaboratoriesComponent extends BaseComponent implements OnInit {
    @ViewChild('dt') dt: Table | undefined;

    // State management
    loadingState: LoadingState = LoadingState.IDLE;
    isUpdating: boolean = false;
    isDeleting: boolean = false;

    laboratories: any[] = [];
    filteredLaboratories: any[] = [];
    selectedLabs: any[] = [];
    selectedAssets: any[] = [];
    selectedLaboratoryId: string | null = null;
    selectedLaboratoryData: any = null;

    // Search
    private searchSubject$ = new Subject<string>();
    currentSearchTerm: string = '';

    // Dialog state
    labDialog: boolean = false;
    newLab: any = this.getEmptyLab();

    // Report dialog state
    reportDialog: boolean = false;
    reportFilters: any = { month: new Date(), week: null };
    weekOptions: any[] = [];
    weekDayHeaders: string[] = [];
    reportWeekData: any[] = [];
    headerImgUrl = `${window.location.origin}/header.png`;

    // Computed properties
    get loading(): boolean {
        return isLoading(this.loadingState);
    }

    private apiUrl = `${environment.apiUrl}/laboratories`;

    constructor(
        private messageService: MessageService,
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private dialogService: DialogService,
        private exportService: ExportService,
        private errorHandler: ErrorHandlerService,
        private laboratoriesWebSocketService: LaboratoriesWebSocketService
    ) {
        super();
    }

    ngOnInit() {
        this.setupSearchDebounce();
        this.connectToWebSocket();

        // Check if navigated with a specific laboratory ID
        this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            const labId = params.get('id');
            if (labId) {
                this.selectedLaboratoryId = labId;
                this.loadLaboratories(labId);
            } else {
                this.loadLaboratories();
            }
        });
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
            this.laboratoriesWebSocketService.connect();

            // Listen for laboratory creation
            this.laboratoriesWebSocketService
                .onLaboratoryCreated()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (event) => {
                        if (event.success) {
                            this.loadLaboratories();
                            this.messageService.add({
                                severity: 'info',
                                summary: 'Laboratory Created',
                                detail: `${event.data.laboratoryName} was created`,
                                life: 3000
                            });
                        }
                    },
                    error: (error) => {}
                });

            // Listen for laboratory updates
            this.laboratoriesWebSocketService
                .onLaboratoryUpdated()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (event) => {
                        if (event.success) {
                            const index = this.laboratories.findIndex((l) => l.laboratoryId === event.data.laboratoryId);
                            if (index !== -1) {
                                this.laboratories[index] = event.data;
                                this.filter();
                            }
                            this.messageService.add({
                                severity: 'info',
                                summary: 'Laboratory Updated',
                                detail: `${event.data.laboratoryName} was updated`,
                                life: 3000
                            });
                        }
                    },
                    error: (error) => {}
                });

            // Listen for laboratory deletions
            this.laboratoriesWebSocketService
                .onLaboratoryDeleted()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (event) => {
                        if (event.success) {
                            this.laboratories = this.laboratories.filter((l) => l.laboratoryId !== event.data.laboratoryId);
                            this.filter();
                            this.messageService.add({
                                severity: 'info',
                                summary: 'Laboratory Deleted',
                                detail: 'A laboratory was deleted',
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
        this.laboratoriesWebSocketService.disconnect();
        super.ngOnDestroy();
    }

    /**
     * Setup debounced search
     */
    private setupSearchDebounce(): void {
        this.searchSubject$.pipe(debounceInput(300), takeUntil(this.destroy$)).subscribe((searchTerm) => {
            this.currentSearchTerm = searchTerm;
            this.filter();
        });
    }

    getEmptyLab() {
        return {
            laboratoryId: '',
            laboratoryName: '',
            laboratoryLocation: '',
            campus: null
        };
    }

    loadLaboratories(laboratoryId?: string) {
        if (this.loading) return;

        this.loadingState = LoadingState.LOADING;

        this.http
            .get<any[]>(this.apiUrl)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    if (this.loadingState === LoadingState.LOADING) {
                        this.loadingState = LoadingState.IDLE;
                    }
                })
            )
            .subscribe({
                next: (data: any[]) => {
                    this.laboratories = data || [];

                    // If a specific laboratory ID is provided, filter to show only that one
                    if (laboratoryId) {
                        const filtered = this.laboratories.filter((lab) => lab.laboratoryId === laboratoryId);
                        if (filtered.length > 0) {
                            this.selectedLaboratoryData = filtered[0];
                            this.filteredLaboratories = filtered;
                        } else {
                            console.warn('⚠️ Laboratory not found with ID:', laboratoryId);
                            this.filteredLaboratories = [];
                        }
                    } else {
                        this.filteredLaboratories = [...this.laboratories];
                    }

                    this.loadingState = LoadingState.SUCCESS;
                },
                error: (error: any) => {
                    this.loadingState = LoadingState.ERROR;
                    this.errorHandler.handleError(error, 'loading laboratories');
                }
            });
    }

    filter() {
        const searchValue = this.currentSearchTerm.toLowerCase();

        if (!searchValue.trim()) {
            this.filteredLaboratories = [...this.laboratories];
            return;
        }

        this.filteredLaboratories = this.laboratories.filter((lab) => {
            return lab.laboratoryName?.toLowerCase().includes(searchValue) || lab.laboratoryId?.toLowerCase().includes(searchValue) || lab.campus?.campusName?.toLowerCase().includes(searchValue);
        });
    }

    onSelectionChange(event: any) {}

    openNew() {
        this.newLab = this.getEmptyLab();
        this.labDialog = true;
    }

    closeDialog() {
        this.labDialog = false;
        this.newLab = this.getEmptyLab();
    }

    saveLab() {
        if (!this.newLab.laboratoryName || !this.newLab.laboratoryLocation) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Laboratory Name and Location are required'
            });
            return;
        }

        if (this.isUpdating) return;
        this.isUpdating = true;

        const payload = {
            laboratoryName: this.newLab.laboratoryName,
            laboratoryLocation: this.newLab.laboratoryLocation
        };

        // Check if this is an update (has laboratoryId) or create (no laboratoryId)
        const isUpdate = !!this.newLab.laboratoryId;
        const request$ = isUpdate ? this.http.patch<any>(`${this.apiUrl}/${this.newLab.laboratoryId}`, payload) : this.http.post<any>(this.apiUrl, payload);

        const successMessage = isUpdate ? 'Laboratory updated successfully' : 'Laboratory created successfully';

        request$
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isUpdating = false))
            )
            .subscribe({
                next: (response) => {
                    this.dialogService.showSuccess(successMessage);
                    this.closeDialog();
                    this.loadLaboratories();
                },
                error: (error) => {
                    const action = isUpdate ? 'updating' : 'creating';
                    this.errorHandler.handleError(error, `${action} laboratory`);
                }
            });
    }

    view(lab: any) {
        this.messageService.add({
            severity: 'info',
            summary: 'View Laboratory',
            detail: `Viewing: ${lab.laboratoryName}`
        });
    }

    edit(lab: any) {
        this.newLab = { ...lab };
        this.labDialog = true;
    }

    async delete(lab: any) {
        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirmDelete(`laboratory "${lab.laboratoryName}"`);
        if (!confirmed) return;

        this.isDeleting = true;

        this.http
            .delete(`${this.apiUrl}/${lab.laboratoryId}`)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.isDeleting = false))
            )
            .subscribe({
                next: () => {
                    this.dialogService.showSuccess('Laboratory deleted successfully');
                    this.loadLaboratories();
                },
                error: (error) => {
                    this.errorHandler.handleError(error, 'deleting laboratory');
                }
            });
    }

    async deleteSelected() {
        if (!this.selectedLabs || this.selectedLabs.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select laboratories to delete'
            });
            return;
        }

        if (this.isDeleting) return;

        const confirmed = await this.dialogService.confirm('Confirm Delete', `Are you sure you want to delete ${this.selectedLabs.length} laboratory(ies)?`);

        if (!confirmed) return;

        this.isDeleting = true;
        let deletedCount = 0;
        let failedCount = 0;
        const totalCount = this.selectedLabs.length;

        this.selectedLabs.forEach((lab) => {
            this.http
                .delete(`${this.apiUrl}/${lab.laboratoryId}`)
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

    private checkBulkDeleteComplete(deleted: number, failed: number, total: number): void {
        if (deleted + failed === total) {
            this.isDeleting = false;
            this.selectedLabs = [];
            this.loadLaboratories();

            if (failed === 0) {
                this.dialogService.showSuccess(`${deleted} laboratory(ies) deleted successfully`);
            } else {
                this.dialogService.showWarning(`${deleted} laboratory(ies) deleted, ${failed} failed`, 'Partial Delete');
            }
        }
    }

    goToReports() {
        this.reportFilters = { month: new Date(), week: null };
        this.reportWeekData = [];
        this.weekOptions = [];
        this.weekDayHeaders = [];
        this.reportDialog = true;
        this.onMonthChange();
    }

    closeReportDialog() {
        this.reportDialog = false;
        this.reportWeekData = [];
    }

    onMonthChange() {
        if (!this.reportFilters.month) return;
        const month = this.reportFilters.month;
        const year = month.getFullYear();
        const mon = month.getMonth();
        const daysInMonth = new Date(year, mon + 1, 0).getDate();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        // Build week options (Mon-Sat blocks)
        this.weekOptions = [];
        let weekStart = 1;
        // Find first Monday
        while (weekStart <= daysInMonth) {
            const dayOfWeek = new Date(year, mon, weekStart).getDay();
            if (dayOfWeek === 1) break; // Monday
            weekStart++;
        }
        // If month doesn't start on Monday, include partial first week
        if (weekStart > 1) {
            const firstDay = 1;
            const endDay = weekStart - 1;
            this.weekOptions.push({
                label: `${monthNames[mon]} ${firstDay}-${endDay}, ${year}`,
                value: { start: firstDay, end: endDay }
            });
        }
        // Full weeks Mon-Sat
        while (weekStart <= daysInMonth) {
            let weekEnd = weekStart + 5; // Mon to Sat = 6 days
            if (weekEnd > daysInMonth) weekEnd = daysInMonth;
            this.weekOptions.push({
                label: `${monthNames[mon]} ${weekStart}-${weekEnd}, ${year}`,
                value: { start: weekStart, end: weekEnd }
            });
            weekStart = weekStart + 7; // next Monday
        }

        this.reportFilters.week = null;
        this.reportWeekData = [];
    }

    generateReport() {
        if (!this.reportFilters.month || !this.reportFilters.week) return;

        const month = this.reportFilters.month;
        const year = month.getFullYear();
        const mon = month.getMonth();
        const { start, end } = this.reportFilters.week;

        const DAILY_HOURS = 8; // 8AM-12PM + 1PM-5PM
        const dayShortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Build day headers for the selected week
        const dayDates: { day: number; dayOfWeek: number }[] = [];
        for (let d = start; d <= end; d++) {
            const dow = new Date(year, mon, d).getDay();
            if (dow !== 0) {
                // skip Sunday
                dayDates.push({ day: d, dayOfWeek: dow });
            }
        }
        this.weekDayHeaders = dayDates.map((dd) => `${dayShortNames[dd.dayOfWeek]} (${dd.day})`);

        // Build data per laboratory
        this.reportWeekData = this.laboratories.map((lab) => {
            const availableHours = dayDates.map(() => DAILY_HOURS);
            const actualHours = dayDates.map(() => 0); // placeholder — will be from API
            const totalAvailable = availableHours.reduce((a, b) => a + b, 0);
            const totalActual = actualHours.reduce((a, b) => a + b, 0);
            const utilization = totalAvailable > 0 ? (totalActual / totalAvailable) * 100 : 0;

            return {
                laboratoryName: lab.laboratoryName,
                laboratoryId: lab.laboratoryId,
                availableHours,
                actualHours,
                totalAvailable,
                totalActual,
                utilization
            };
        });

        this.cdr.detectChanges();
    }

    onActualHoursChange(labIndex: number, dayIndex: number, event: Event) {
        const input = event.target as HTMLInputElement;
        let value = parseFloat(input.value) || 0;
        const maxHrs = this.reportWeekData[labIndex].availableHours[dayIndex];
        if (value < 0) value = 0;
        if (value > maxHrs) value = maxHrs;
        input.value = value.toString();

        const lab = this.reportWeekData[labIndex];
        lab.actualHours[dayIndex] = value;
        lab.totalActual = lab.actualHours.reduce((a: number, b: number) => a + b, 0);
        lab.utilization = lab.totalAvailable > 0 ? (lab.totalActual / lab.totalAvailable) * 100 : 0;
        this.cdr.detectChanges();
    }

    async downloadExcelReport() {
        if (!this.reportWeekData.length || !this.reportFilters.week) return;

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Utilization Report');

        const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        const month = this.reportFilters.month;
        const year = month.getFullYear();
        const mon = month.getMonth();
        const { start, end } = this.reportFilters.week;
        const numDays = this.weekDayHeaders.length;

        // Column widths: Lab name, Type, Mon-Sat..., Total, % Utilization
        const totalCols = numDays + 4; // lab + type + days + total + %util
        ws.columns = [
            { width: 25 }, // A: Laboratory
            { width: 16 }, // B: Available/Actual
            ...this.weekDayHeaders.map(() => ({ width: 10 })), // C-H: days
            { width: 10 }, // Total
            { width: 15 } // % Utilization
        ];

        const lastCol = totalCols;
        const thinBorder: Partial<ExcelJS.Borders> = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        const headerFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6DCE4' } };
        const boldCenter: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

        // --- HEADER ---
        // Try to load header image
        try {
            const response = await fetch(this.headerImgUrl);
            if (response.ok) {
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();
                const imgId = wb.addImage({ buffer, extension: 'png' });
                ws.mergeCells(1, 1, 3, lastCol);
                ws.addImage(imgId, {
                    tl: { col: 0, row: 0 },
                    ext: { width: 750, height: 80 }
                });
            }
        } catch (e) {}

        // Row 4: LABORATORY MANAGEMENT OFFICE
        let row = 4;
        ws.mergeCells(row, 1, row, lastCol);
        const lmoCell = ws.getCell(row, 1);
        lmoCell.value = 'LABORATORY MANAGEMENT OFFICE';
        lmoCell.font = { bold: true, size: 11 };
        lmoCell.alignment = { horizontal: 'center' };

        // Row 5: LABORATORY UTILIZATION REPORT
        row = 5;
        ws.mergeCells(row, 1, row, lastCol);
        const titleCell = ws.getCell(row, 1);
        titleCell.value = 'LABORATORY UTILIZATION REPORT';
        titleCell.font = { bold: true, size: 12 };
        titleCell.alignment = { horizontal: 'center' };

        // Row 7: Month
        row = 7;
        ws.getCell(row, 1).value = 'Month:';
        ws.getCell(row, 1).font = { bold: true };
        ws.getCell(row, 2).value = `${monthNames[mon]} ${year}`;

        // Row 8: Inclusive dates
        row = 8;
        ws.getCell(row, 1).value = 'Inclusive dates:';
        ws.getCell(row, 1).font = { bold: true };
        ws.getCell(row, 2).value = `${start}-${end}`;

        // Row 9: Table header - day names
        row = 9;
        const headerRow = ws.getRow(row);
        headerRow.height = 20;
        // Columns: A=Lab, B=Type, C..=Days, Total, %Util
        const headers = ['', '', ...this.weekDayHeaders, 'Total', '% UTILIZATION'];
        headers.forEach((h, idx) => {
            const cell = ws.getCell(row, idx + 1);
            cell.value = h;
            cell.font = { bold: true, size: 10 };
            cell.alignment = boldCenter;
            cell.fill = headerFill;
            cell.border = thinBorder;
        });

        // Data rows
        row = 10;
        this.reportWeekData.forEach((lab) => {
            // Available Hours row
            const availRow = row;
            ws.getCell(availRow, 1).value = lab.laboratoryName;
            ws.getCell(availRow, 1).font = { bold: true, size: 10 };
            ws.getCell(availRow, 1).alignment = { vertical: 'middle' };
            ws.mergeCells(availRow, 1, availRow + 1, 1); // merge lab name across 2 rows
            ws.getCell(availRow, 2).value = 'Available Hours';
            ws.getCell(availRow, 2).font = { italic: true, size: 9 };
            ws.getCell(availRow, 2).alignment = boldCenter;
            lab.availableHours.forEach((hrs: number, di: number) => {
                const cell = ws.getCell(availRow, 3 + di);
                cell.value = hrs || '';
                cell.alignment = boldCenter;
            });
            ws.getCell(availRow, 3 + numDays).value = lab.totalAvailable || '';
            ws.getCell(availRow, 3 + numDays).font = { bold: true };
            ws.getCell(availRow, 3 + numDays).alignment = boldCenter;

            // % Utilization (merged across 2 rows)
            const utilCol = 3 + numDays + 1;
            ws.mergeCells(availRow, utilCol, availRow + 1, utilCol);
            const utilCell = ws.getCell(availRow, utilCol);
            utilCell.value = lab.totalAvailable > 0 ? parseFloat(lab.utilization.toFixed(2)) + '%' : '0.00%';
            utilCell.font = { bold: true, size: 11 };
            utilCell.alignment = boldCenter;

            // Actual Hours row
            const actualRow = availRow + 1;
            ws.getCell(actualRow, 2).value = 'Actual Hours';
            ws.getCell(actualRow, 2).font = { italic: true, size: 9 };
            ws.getCell(actualRow, 2).alignment = boldCenter;
            lab.actualHours.forEach((hrs: number, di: number) => {
                const cell = ws.getCell(actualRow, 3 + di);
                cell.value = hrs || '';
                cell.alignment = boldCenter;
            });
            ws.getCell(actualRow, 3 + numDays).value = lab.totalActual || '';
            ws.getCell(actualRow, 3 + numDays).font = { bold: true };
            ws.getCell(actualRow, 3 + numDays).alignment = boldCenter;

            // Borders for all cells in these 2 rows
            for (let r = availRow; r <= actualRow; r++) {
                for (let c = 1; c <= lastCol; c++) {
                    ws.getCell(r, c).border = thinBorder;
                }
            }

            row += 2;
        });

        // Blank row
        row += 1;

        // --- SIGNATORIES ---
        const sigRow = row + 1;
        ws.getCell(sigRow, 1).value = 'Prepared by:';
        ws.getCell(sigRow, 1).font = { bold: false, size: 10 };
        const notedCol = Math.ceil(lastCol / 2);
        ws.getCell(sigRow, notedCol).value = 'Noted by:';
        ws.getCell(sigRow, notedCol).font = { bold: false, size: 10 };
        const headCol = lastCol - 1;
        ws.getCell(sigRow, headCol).value = '';

        const nameRow = sigRow + 3;
        ws.getCell(nameRow, 1).value = '_________________________';
        ws.getCell(nameRow, 1).font = { bold: true, size: 10 };
        ws.getCell(nameRow + 1, 1).value = 'Laboratory Technician';
        ws.getCell(nameRow + 1, 1).font = { size: 9 };

        ws.getCell(nameRow, notedCol).value = '_________________________';
        ws.getCell(nameRow, notedCol).font = { bold: true, size: 10 };
        ws.getCell(nameRow + 1, notedCol).value = 'LMO - Coordinator';
        ws.getCell(nameRow + 1, notedCol).font = { size: 9 };

        ws.getCell(nameRow, headCol).value = '_________________________';
        ws.getCell(nameRow, headCol).font = { bold: true, size: 10 };
        ws.getCell(nameRow + 1, headCol).value = 'Head, Academic Head';
        ws.getCell(nameRow + 1, headCol).font = { size: 9 };

        // --- NOTES ---
        const noteRow = nameRow + 4;
        const notes = ['*Available hours - potential student clock hours', '*Actual hours - based on actual number of hours the laboratory is utilized', '*% utilization = actual hours / available hours', '*Cut-off is per month'];
        notes.forEach((note, idx) => {
            ws.mergeCells(noteRow + idx, 1, noteRow + idx, lastCol);
            const cell = ws.getCell(noteRow + idx, 1);
            cell.value = note;
            cell.font = { italic: true, size: 9 };
        });

        // Generate and download
        const buffer = await wb.xlsx.writeBuffer();
        const fileName = `Laboratory_Utilization_Report_${monthNames[mon]}_${year}_${start}-${end}.xlsx`;
        saveAs(new Blob([buffer]), fileName);
    }

    exportCSV() {
        if (this.laboratories.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No data to export'
            });
            return;
        }

        const exportColumns: ExportColumn[] = [
            { field: 'laboratoryId', header: 'Laboratory ID' },
            { field: 'laboratoryName', header: 'Laboratory Name' },
            { field: 'campus.campusName', header: 'Campus' }
        ];

        this.exportService.exportToCsv(this.laboratories, 'laboratories_export', exportColumns);

        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Laboratories exported to CSV'
        });
    }

    isBase64Image(qrCode: string): boolean {
        return qrCode?.startsWith('data:image') || qrCode?.startsWith('http');
    }

    deleteSelectedAssets() {
        if (!this.selectedAssets || this.selectedAssets.length === 0) return;
        this.messageService.add({
            severity: 'warn',
            summary: 'Delete',
            detail: `Delete ${this.selectedAssets.length} asset(s)?`
        });
    }

    exportAssetsCSV() {
        const assets = this.selectedLaboratoryData?.assets || [];
        let csv = 'Asset Name,Property #,Category,Issued To\n';
        assets.forEach((asset: any) => {
            csv += `${asset.assetName},${asset.propertyNumber},${asset.category || 'N/A'},${asset.issuedTo}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.selectedLaboratoryData?.laboratoryName || 'laboratory'}_assets.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}
