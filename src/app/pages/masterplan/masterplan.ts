import { saveAs } from 'file-saver';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import * as XLSX from 'xlsx';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MasterPlanService, MasterPlanData, MaintenanceSchedule, EquipmentParticulars } from '../service/masterplan.service';
import { MasterPlanPdfService } from '../service/masterplan-pdf.service';
@Component({
    selector: 'app-masterplan',
    standalone: true,
    imports: [CommonModule, ToolbarModule, ButtonModule, RippleModule, TableModule, InputTextModule, FormsModule, DialogModule, ToastModule],
    providers: [MessageService, MasterPlanService, MasterPlanPdfService],
    template: `
        <p-toolbar styleClass="mb-4 master-toolbar">
            <!-- LEFT TITLE -->
            <ng-template #start>
                <div class="toolbar-title">
                    <i class="pi pi-calendar"></i>
                    <span>Master Plan</span>
                </div>
            </ng-template>

            <!-- RIGHT FILTER AREA -->
            <ng-template #end>
                <div class="filter-container">
                    <div class="filter-label">
                        <i class="pi pi-filter"></i>
                        <span>Filters</span>
                    </div>

                    <!-- YEAR -->
                    <div class="filter-group">
                        <label>Year</label>
                        <select [(ngModel)]="selectedYear" (ngModelChange)="onFilterChange()" class="filter-input">
                            <option value="">All Years</option>
                            <option *ngFor="let year of years" [value]="year">
                                {{ year }}
                            </option>
                        </select>
                    </div>

                    <!-- LAB -->
                    <div class="filter-group">
                        <label>Laboratory</label>
                        <select [(ngModel)]="selectedLaboratory" (ngModelChange)="onFilterChange()" class="filter-input">
                            <option value="">Select Laboratory</option>
                            <option *ngFor="let lab of laboratories" [value]="lab.laboratoryId">
                                {{ lab.laboratoryName }}
                            </option>
                        </select>
                    </div>

                    <!-- CATEGORY -->
                    <div class="filter-group">
                        <label>Category</label>
                        <select [(ngModel)]="selectedCategory" (ngModelChange)="onFilterChange()" class="filter-input">
                            <option value="">All Categories</option>
                            <option *ngFor="let category of categories" [value]="category">
                                {{ category }}
                            </option>
                        </select>
                    </div>

                    <!-- ACTION BUTTONS -->
                    <div class="filter-actions">
                        <p-button [label]="showSchedule ? 'Hide Schedule' : 'Show Schedule'" icon="pi pi-calendar" severity="info" [outlined]="true" (onClick)="toggleSchedule()"> </p-button>

                        <p-button label="Export Excel" icon="pi pi-file-excel" severity="success" [outlined]="true" (onClick)="showExportMenu()" />

                        <p-button label="Export PDF" icon="pi pi-file-pdf" severity="danger" [outlined]="true" (onClick)="exportToPdf()" />
                    </div>
                </div>
            </ng-template>
        </p-toolbar>

        <div class="master-plan-container">
            <div class="table-scroll">
                <table class="master-plan-table">
                    <thead>
                        <tr>
                            <th colspan="8" class="particulars-header">PARTICULARS</th>

                            <th *ngIf="showSchedule" colspan="4" class="schedule-header">MAINTENANCE SCHEDULE</th>
                        </tr>

                        <tr>
                            <th>ID Number</th>
                            <th>Asset Name</th>
                            <th>Serial Number</th>
                            <th>Quantity</th>
                            <th>Date Acquired</th>
                            <th>Location</th>
                            <th>Price</th>
                            <th>Functional</th>
                            <th>Under Repair</th>

                            <th *ngIf="showSchedule">Inventory</th>
                            <th *ngIf="showSchedule">Preventive</th>
                            <th *ngIf="showSchedule">Corrective</th>
                            <th *ngIf="showSchedule">Calibration</th>
                        </tr>
                    </thead>

                    <tbody>
                        <ng-container *ngIf="equipmentList.length > 0; else empty">
                            <tr *ngFor="let item of equipmentList">
                                <td>{{ item.equipment?.assetId || 'N/A' }}</td>

                                <td style="text-align:left">
                                    {{ item.equipment?.equipmentName || 'N/A' }}
                                </td>

                                <td style="text-align:left">
                                    {{ item.equipment?.serialNumber || 'N/A' }}
                                </td>

                                <td>{{ item.quantity || 1 }}</td>

                                <td>{{ formatDate(item.equipment?.dateAcquired) }}</td>

                                <td>{{ item.equipment?.location || 'N/A' }}</td>

                                <td>{{ formatPrice(item.equipment?.price) }}</td>

                                <td>
                                    <span *ngIf="item.isFunctional !== false">Yes</span>
                                    <span *ngIf="item.isFunctional === false">No</span>
                                </td>

                                <td>
                                    <span *ngIf="item.isUnderRepair">Yes</span>
                                    <span *ngIf="!item.isUnderRepair">No</span>
                                </td>

                                <!-- SCHEDULE -->
                                <td *ngIf="showSchedule" class="schedule-cell" (click)="openEditDialog(item, 'inventory')">
                                    <span class="schedule-text">{{ getScheduleText(item, 'inventory') }}</span>
                                    <i class="pi pi-pencil edit-icon"></i>
                                </td>

                                <td *ngIf="showSchedule" class="schedule-cell" (click)="openEditDialog(item, 'preventive')">
                                    <span class="schedule-text">{{ getScheduleText(item, 'preventive') }}</span>
                                    <i class="pi pi-pencil edit-icon"></i>
                                </td>

                                <td *ngIf="showSchedule" class="schedule-cell" (click)="openEditDialog(item, 'corrective')">
                                    <span class="schedule-text">{{ getScheduleText(item, 'corrective') }}</span>
                                    <i class="pi pi-pencil edit-icon"></i>
                                </td>

                                <td *ngIf="showSchedule" class="schedule-cell" (click)="openEditDialog(item, 'calibration')">
                                    <span class="schedule-text">{{ getScheduleText(item, 'calibration') }}</span>
                                    <i class="pi pi-pencil edit-icon"></i>
                                </td>
                            </tr>
                        </ng-container>

                        <ng-template #empty>
                            <tr>
                                <td colspan="12" style="text-align:center;padding:40px">No data available</td>
                            </tr>
                        </ng-template>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- EXPORT OPTIONS DIALOG -->
        <p-dialog [(visible)]="showExportDialog" [modal]="true" [style]="{ width: '500px' }" [draggable]="false" [resizable]="false">
            <ng-template pTemplate="header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); display: flex; align-items: center; justify-content: center;">
                        <i class="pi pi-file-excel text-white" style="font-size: 24px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">Export to Excel</h3>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Choose export format</p>
                    </div>
                </div>
            </ng-template>

            <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                <div
                    (click)="exportCurrentView()"
                    style="padding: 20px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s;"
                    onmouseover="this.style.borderColor='#3b82f6'; this.style.background='#f0f9ff'"
                    onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'"
                >
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="pi pi-table" style="font-size: 24px; color: #3b82f6;"></i>
                        <div>
                            <p style="margin: 0; font-weight: 600; font-size: 15px; color: #1e293b;">Current View</p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Export the currently displayed equipment list</p>
                        </div>
                    </div>
                </div>

                <div
                    (click)="exportWithSheets()"
                    style="padding: 20px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s;"
                    onmouseover="this.style.borderColor='#10b981'; this.style.background='#f0fdf4'"
                    onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'"
                >
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="pi pi-clone" style="font-size: 24px; color: #10b981;"></i>
                        <div>
                            <p style="margin: 0; font-weight: 600; font-size: 15px; color: #1e293b;">Multiple Sheets</p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Export with separate sheets per laboratory</p>
                        </div>
                    </div>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div style="display: flex; justify-content: flex-end; padding: 16px 24px; border-top: 2px solid #f1f5f9;">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" [outlined]="true" (onClick)="showExportDialog = false"></p-button>
                </div>
            </ng-template>
        </p-dialog>

        <!-- EDIT DIALOG -->
        <p-dialog [(visible)]="showEditDialog" [modal]="true" [style]="{ width: '650px' }" [draggable]="false" [resizable]="false" styleClass="maintenance-dialog">
            <ng-template pTemplate="header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
                        <i class="pi pi-calendar text-white" style="font-size: 24px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">Edit {{ getMaintenanceTypeTitle() }} Schedule</h3>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Manage maintenance dates for equipment</p>
                    </div>
                </div>
            </ng-template>

            <div style="padding: 24px;">
                <!-- Equipment Info Card -->
                <div style="padding: 16px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 12px; border: 2px solid #667eea30; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="pi pi-box text-white" style="font-size: 20px;"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Equipment</p>
                            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                {{ selectedEquipment?.equipment?.equipmentName }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Date Picker Section -->
                <div style="margin-bottom: 24px;">
                    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-weight: 600; font-size: 15px; color: #334155;">
                        <i class="pi pi-calendar-plus" style="color: #667eea;"></i>
                        Select Maintenance Dates
                    </label>
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                        <i class="pi pi-info-circle" style="font-size: 14px;"></i>
                        Choose dates when maintenance should be performed
                    </p>
                    <div style="position: relative;">
                        <input
                            type="date"
                            (change)="onDateSelected($event)"
                            min="{{ selectedYear }}-01-01"
                            max="{{ selectedYear }}-12-31"
                            class="date-input"
                            style="width: 100%; padding: 14px 16px; padding-left: 48px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 15px; font-weight: 500; transition: all 0.2s; outline: none; color: #334155;"
                        />
                        <i class="pi pi-calendar" style="position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 16px; pointer-events: none;"></i>
                    </div>
                </div>

                <!-- Selected Dates Section -->
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; border: 2px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <p style="margin: 0; font-weight: 600; font-size: 15px; color: #334155; display: flex; align-items: center; gap: 8px;">
                            <i class="pi pi-check-circle" style="color: #10b981;"></i>
                            Selected Dates
                        </p>
                        <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;">
                            {{ selectedDates.length }}
                        </span>
                    </div>

                    <div style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
                        <div *ngIf="selectedDates.length === 0" style="text-align: center; padding: 32px 20px;">
                            <i class="pi pi-calendar" style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px;"></i>
                            <p style="color: #94a3b8; font-style: italic; margin: 0; font-size: 14px;">No dates selected yet</p>
                            <p style="color: #cbd5e1; font-size: 12px; margin: 4px 0 0 0;">Add dates using the calendar above</p>
                        </div>

                        <div
                            *ngFor="let date of selectedDates; let i = index"
                            style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: white; border-radius: 10px; margin-bottom: 10px; border: 2px solid #e2e8f0; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"
                        >
                            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <span style="color: white; font-weight: 700; font-size: 14px;">{{ i + 1 }}</span>
                                </div>
                                <div>
                                    <p style="margin: 0; font-weight: 600; color: #1e293b; font-size: 15px;">{{ formatDisplayDate(date) }}</p>
                                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">{{ getMaintenanceTypeTitle() }} maintenance</p>
                                </div>
                            </div>
                            <button
                                (click)="removeDate(date)"
                                style="background: #fee2e2; border: none; color: #ef4444; cursor: pointer; padding: 8px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; transition: all 0.2s; display: flex; align-items: center; gap: 6px;"
                                onmouseover="this.style.background='#fecaca'; this.style.transform='scale(1.05)'"
                                onmouseout="this.style.background='#fee2e2'; this.style.transform='scale(1)'"
                            >
                                <i class="pi pi-trash" style="font-size: 13px;"></i>
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div style="display: flex; gap: 12px; padding: 16px 24px; border-top: 2px solid #f1f5f9;">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" [outlined]="true" (onClick)="showEditDialog = false" styleClass="flex-1"></p-button>
                    <p-button label="Save Changes" icon="pi pi-check" severity="primary" (onClick)="saveMaintenanceChanges()" styleClass="flex-1"></p-button>
                </div>
            </ng-template>
        </p-dialog>

        <!-- TOAST -->
        <p-toast></p-toast>
    `,
    styles: [
        `
            .table-scroll {
                overflow: auto;
                max-height: calc(100vh - 250px);
            }

            table {
                width: 100%;
                min-width: 1400px;
                border-collapse: collapse;
            }

            th,
            td {
                border: 1px solid #e0e0e0;
                padding: 8px;
                text-align: center;
            }

            th {
                background: #3b82f6;
                color: white;
                position: sticky;
                top: 0;
            }

            .schedule-header {
                background: #10b981;
            }
            .master-toolbar {
                background: var(--surface-card);
                border-radius: 12px;
                padding: 12px 16px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            }

            /* TITLE */
            .toolbar-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 1.2rem;
                font-weight: 700;
            }

            .toolbar-title i {
                font-size: 1.6rem;
                color: #667eea;
            }

            /* FILTER CONTAINER */
            .filter-container {
                display: flex;
                align-items: flex-end;
                gap: 18px;
                background: #f8fafc;
                padding: 14px 18px;
                border-radius: 10px;
                border: 1px solid #e5e7eb;
            }

            /* FILTER LABEL */
            .filter-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: 600;
                color: #475569;
                margin-right: 10px;
            }

            /* GROUP */
            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .filter-group label {
                font-size: 0.75rem;
                font-weight: 600;
                color: #64748b;
            }

            /* INPUT */
            .filter-input {
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid #cbd5e1;
                min-width: 160px;
                background: white;
                transition: 0.2s;
            }

            .filter-input:focus {
                outline: none;
                border-color: #6366f1;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
            }

            /* ACTION BUTTONS */
            .filter-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: 10px;
            }

            /* SCHEDULE CELL HOVER */
            .schedule-cell {
                cursor: pointer;
                position: relative;
                transition: background-color 0.2s;
            }

            .schedule-cell:hover {
                background-color: #f0f9ff;
            }

            .schedule-cell .edit-icon {
                display: none;
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                color: #3b82f6;
                font-size: 0.9rem;
            }

            .schedule-cell:hover .edit-icon {
                display: inline-block;
            }

            .schedule-text {
                display: inline-block;
                padding-right: 20px;
            }

            /* ENHANCED MODAL STYLES */
            :host ::ng-deep .maintenance-dialog .p-dialog-header {
                padding: 24px 24px 20px 24px;
                border-bottom: 2px solid #f1f5f9;
            }

            :host ::ng-deep .maintenance-dialog .p-dialog-content {
                padding: 0;
            }

            :host ::ng-deep .maintenance-dialog .p-dialog-footer {
                padding: 0;
                border-top: none;
            }

            /* Date Input Focus */
            .date-input:focus {
                border-color: #667eea !important;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
            }

            .date-input:hover {
                border-color: #cbd5e1;
            }

            /* Scrollbar Styling */
            :host ::ng-deep .maintenance-dialog ::-webkit-scrollbar {
                width: 8px;
            }

            :host ::ng-deep .maintenance-dialog ::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 10px;
            }

            :host ::ng-deep .maintenance-dialog ::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 10px;
            }

            :host ::ng-deep .maintenance-dialog ::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        `
    ]
})
export class MasterPlanComponent implements OnInit {
    selectedYear = '';
    selectedLaboratory = '';
    selectedCategory = '';

    laboratories: any[] = [];
    years: string[] = [];
    categories: string[] = ['Software', 'Hardware'];

    equipmentList: any[] = [];

    /** ✅ NEW TOGGLE STATE */
    showSchedule = false;

    /** EDIT DIALOG */
    showEditDialog = false;
    selectedEquipment: any = null;
    editMaintenanceType: string = '';
    editMonthlyData: any[] = [];
    selectedDates: string[] = [];

    /** EXPORT DIALOG */
    showExportDialog = false;

    private currentYear = new Date().getFullYear();

    constructor(
        private http: HttpClient,
        private messageService: MessageService,
        private masterPlanService: MasterPlanService,
        private masterPlanPdfService: MasterPlanPdfService
    ) {}

    ngOnInit() {
        this.generateYears();
        this.loadLaboratories();
    }

    toggleSchedule() {
        this.showSchedule = !this.showSchedule;
    }

    generateYears() {
        for (let i = this.currentYear; i >= this.currentYear - 10; i--) {
            this.years.push(i.toString());
        }
    }

    onFilterChange() {
        if (this.selectedYear && this.selectedLaboratory) {
            this.fetchMasterPlanData();
        }
    }

    fetchMasterPlanData() {
        const apiUrl = `${environment.apiUrl}/laboratories/${this.selectedLaboratory}/maintenance-plans`;

        this.http
            .get<any>(apiUrl, {
                params: {
                    year: this.selectedYear
                }
            })
            .subscribe((data) => {
                console.log('=== MASTER PLAN DATA ===');
                console.log('Raw data:', data);

                let allEquipment = data.equipmentMaintenances || [];

                // Split equipment with multiple serial numbers for display
                const expandedEquipment: any[] = [];

                allEquipment.forEach((item: any) => {
                    const serialNumber = item.equipment?.serialNumber;

                    // Check if serial number contains comma (multiple serials)
                    if (serialNumber && serialNumber.includes(',')) {
                        // Split by comma and create one row per serial
                        const serials = serialNumber.split(',').map((s: string) => s.trim());
                        console.log(`📦 Expanding equipment ${item.equipment?.assetId}: ${serials.length} serials`);

                        serials.forEach((serial: string, index: number) => {
                            // Create a copy of the equipment for each serial
                            const expandedItem = {
                                ...item,
                                equipment: {
                                    ...item.equipment,
                                    serialNumber: serial
                                },
                                quantity: 1, // 1 per row
                                _displayId: `${item.equipment?.assetId}_${index}` // Unique identifier
                            };
                            expandedEquipment.push(expandedItem);
                        });
                    } else {
                        // Single serial number, add as-is
                        expandedEquipment.push(item);
                    }
                });

                console.log('Expanded equipment for display:', expandedEquipment.length);
                console.log('========================');

                // Apply category filter to expanded list
                this.equipmentList = this.selectedCategory ? expandedEquipment.filter((x: any) => x.equipment?.category === this.selectedCategory) : expandedEquipment;
            });
    }

    loadLaboratories() {
        this.http.get<any[]>(`${environment.apiUrl}/laboratories`).subscribe((data) => (this.laboratories = data || []));
    }

    formatDate(date: any) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString();
    }

    formatPrice(price: any) {
        if (!price) return 'N/A';
        return (
            '₱' +
            Number(price).toLocaleString(undefined, {
                minimumFractionDigits: 2
            })
        );
    }

    getScheduleText(item: any, type: string) {
        if (!item?.monthlyData) return '-';

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Collect all valid dates for this type
        let allDates: Date[] = [];

        if (type === 'inventory') {
            item.monthlyData.forEach((m: any) => {
                const dateStr = m.maintenance?.inventory || m.maintenance?.inventoryCreated || m.maintenance?.inventoryUpdated;
                if (dateStr && dateStr !== '') {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) allDates.push(d);
                }
            });
        } else {
            item.monthlyData.forEach((m: any) => {
                const dateStr = m.maintenance?.[type];
                if (dateStr && dateStr !== '') {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) allDates.push(d);
                }
            });
        }

        if (allDates.length === 0) return '-';

        // Return only the latest date
        const latest = allDates.sort((a, b) => b.getTime() - a.getTime())[0];
        return `${months[latest.getMonth()]} ${latest.getDate()}`;
    }

    openEditDialog(item: any, maintenanceType: string) {
        this.selectedEquipment = item;
        this.editMaintenanceType = maintenanceType;
        this.selectedDates = [];

        this.editMonthlyData = (item.monthlyData || []).map((month: any) => {
            let dateStr = null;

            if (maintenanceType === 'inventory') {
                const inv = month.maintenance?.inventory;
                const created = month.maintenance?.inventoryCreated;
                const updated = month.maintenance?.inventoryUpdated;
                dateStr = (inv && inv !== '') ? inv : (created && created !== '') ? created : (updated && updated !== '') ? updated : null;
            } else {
                dateStr = month.maintenance?.[maintenanceType];
                if (dateStr === '') dateStr = null;
            }

            // Add existing dates to selectedDates array
            if (dateStr) {
                const formattedDate = dateStr.split('T')[0]; // Get YYYY-MM-DD part
                if (!this.selectedDates.includes(formattedDate)) {
                    this.selectedDates.push(formattedDate);
                }
            }

            // Try to get ID from maintenance object or from month object directly
            const recordId = month.maintenance?.id || month.id || null;

            // Log each month's maintenance data and ID
            console.log(`${month.monthName}:`, {
                monthObject: month,
                maintenance: month.maintenance,
                recordId: recordId,
                hasId: !!recordId
            });

            return {
                month: month.month,
                monthName: month.monthName,
                recordId: recordId
            };
        });

        // Sort dates
        this.selectedDates.sort();
        this.showEditDialog = true;
    }

    onDateSelected(event: any) {
        const dateValue = event.target.value;
        if (dateValue && !this.selectedDates.includes(dateValue)) {
            this.selectedDates.push(dateValue);
            this.selectedDates.sort();
        }
        // Clear the input
        event.target.value = '';
    }

    removeDate(date: string) {
        this.selectedDates = this.selectedDates.filter((d) => d !== date);
    }

    formatDisplayDate(dateStr: string): string {
        const date = new Date(dateStr);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    saveMaintenanceChanges() {
        const updates: Promise<any>[] = [];

        const assetId = this.selectedEquipment?.equipment?.assetId;

        if (!assetId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Asset ID not found'
            });
            return;
        }

        // Create a POST request for each selected date
        this.selectedDates.forEach((dateStr) => {
            const payload = {
                assetId: assetId,
                maintenanceType: this.editMaintenanceType,
                scheduledDate: dateStr
            };

            const apiUrl = `${environment.apiUrl}/laboratories/${this.selectedLaboratory}/maintenance-plans`;
            updates.push(this.http.post(apiUrl, payload).toPromise());
        });

        Promise.all(updates)
            .then(() => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Maintenance schedule updated successfully'
                });
                this.showEditDialog = false;
                this.fetchMasterPlanData(); // Refresh data
            })
            .catch((error) => {
                console.error('Error updating maintenance schedule:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to update maintenance schedule'
                });
            });
    }

    formatDateForAPI(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getMaintenanceTypeTitle(): string {
        return this.editMaintenanceType.charAt(0).toUpperCase() + this.editMaintenanceType.slice(1);
    }

    // ===== EXPORT METHODS =====

    showExportMenu(): void {
        this.showExportDialog = true;
    }

    async exportCurrentView(): Promise<void> {
        if (!this.equipmentList.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Data',
                detail: 'No equipment data to export'
            });
            return;
        }

        const labName = this.laboratories.find((l) => l.laboratoryId === this.selectedLaboratory)?.laboratoryName || 'Lab';
        await this.masterPlanService.exportEquipmentListToExcel(this.equipmentList, labName, this.selectedYear);

        this.showExportDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: 'Excel file downloaded successfully'
        });
    }

    async exportWithSheets(): Promise<void> {
        // Create master plan data from current data
        let masterPlanData: MasterPlanData;

        if (this.equipmentList.length > 0) {
            // Create master plan data from current equipment list
            const labName = this.laboratories.find((l) => l.laboratoryId === this.selectedLaboratory)?.laboratoryName || 'Lab';

            masterPlanData = {
                year: this.selectedYear,
                laboratoryId: this.selectedLaboratory,
                laboratoryName: labName,
                sheets: [
                    {
                        sheetName: labName,
                        equipmentData: this.equipmentList.map((item) => {
                            const equipment = item.equipment || {};
                            return {
                                equipmentName: equipment.equipmentName || equipment.assetName || 'N/A',
                                particulars: {
                                    name: equipment.equipmentName || equipment.assetName || 'N/A',
                                    quantity: item.quantity || 1,
                                    dateAcquired: equipment.dateAcquired ? new Date(equipment.dateAcquired).toLocaleDateString() : '',
                                    serialNumber: equipment.serialNumber || equipment.assetId || '',
                                    location: equipment.location || '',
                                    price: equipment.price || 0,
                                    workingUnits: item.isFunctional !== false ? item.quantity || 1 : 0,
                                    underRepair: item.isUnderRepair ? item.quantity || 1 : 0
                                },
                                inventory: this.getMaintenanceScheduleByType(item, 'inventory'),
                                preventive: this.getMaintenanceScheduleByType(item, 'preventive'),
                                corrective: this.getMaintenanceScheduleByType(item, 'corrective'),
                                calibration: this.getMaintenanceScheduleByType(item, 'calibration')
                            };
                        })
                    }
                ]
            };
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Data',
                detail: 'No master plan data available to export'
            });
            return;
        }

        const fileName = `MasterPlan_${masterPlanData.year}_${masterPlanData.laboratoryName || 'All'}.xlsx`;
        await this.masterPlanService.exportToExcel(masterPlanData, fileName);

        this.showExportDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: 'Excel file with multiple sheets downloaded successfully'
        });
    }

    exportToPdf(): void {
        if (!this.equipmentList.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Data',
                detail: 'No data available to export to PDF'
            });
            return;
        }

        // Export current equipment list
        const labName = this.laboratories.find((l) => l.laboratoryId === this.selectedLaboratory)?.laboratoryName || 'Lab';
        this.masterPlanPdfService.exportEquipmentListToPdf(this.equipmentList, labName, this.selectedYear, this.showSchedule);

        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: 'PDF file downloaded successfully'
        });
    }

    exportToCsv(): void {
        if (!this.equipmentList.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Data',
                detail: 'No data available to export to CSV'
            });
            return;
        }

        const headers = this.showSchedule
            ? ['ID Number', 'Asset Name', 'Serial Number', 'Quantity', 'Date Acquired', 'Location', 'Price', 'Functional', 'Under Repair', 'Inventory', 'Preventive', 'Corrective', 'Calibration']
            : ['ID Number', 'Asset Name', 'Serial Number', 'Quantity', 'Date Acquired', 'Location', 'Price', 'Functional', 'Under Repair'];

        const rows = this.equipmentList.map((item) => {
            const eq = item.equipment || {};
            const base = [
                eq.assetId || 'N/A',
                eq.equipmentName || 'N/A',
                eq.serialNumber || 'N/A',
                item.quantity || 1,
                this.formatDate(eq.dateAcquired),
                eq.location || 'N/A',
                this.formatPrice(eq.price),
                item.isFunctional !== false ? 'Yes' : 'No',
                item.isUnderRepair ? 'Yes' : 'No'
            ];

            if (this.showSchedule) {
                base.push(
                    this.getScheduleText(item, 'inventory'),
                    this.getScheduleText(item, 'preventive'),
                    this.getScheduleText(item, 'corrective'),
                    this.getScheduleText(item, 'calibration')
                );
            }

            return base;
        });

        let csv = headers.join(',') + '\n';
        rows.forEach((row) => {
            csv += row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const labName = this.laboratories.find((l) => l.laboratoryId === this.selectedLaboratory)?.laboratoryName || 'Lab';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `MasterPlan_${labName}_${this.selectedYear}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: 'CSV file downloaded successfully'
        });
    }

    // Helper method to get schedule for a specific month
    private getMaintenanceScheduleByType(item: any, maintenanceType: string): any {
        const schedule: any = {
            january: '',
            february: '',
            march: '',
            april: '',
            may: '',
            june: '',
            july: '',
            august: '',
            september: '',
            october: '',
            november: '',
            december: ''
        };

        if (!item?.monthlyData) return schedule;

        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

        // Iterate through each month (0-11)
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const monthData = item.monthlyData.find((m: any) => m.month === monthIndex + 1);

            if (monthData?.maintenance) {
                const value = monthData.maintenance[maintenanceType] || monthData.maintenance[`${maintenanceType}Created`] || monthData.maintenance[`${maintenanceType}Updated`];

                if (value && value !== '') {
                    // If it's a date, format it; otherwise just use the value (could be 'x')
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        // Valid date - format as MM/DD/YYYY
                        schedule[monthNames[monthIndex]] = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                    } else {
                        // Not a date, use as-is (e.g., 'x')
                        schedule[monthNames[monthIndex]] = value;
                    }
                }
            }
        }

        return schedule;
    }

    private getMonthSchedule(item: any, monthIndex: number): string {
        if (!item?.monthlyData) return '';

        const monthData = item.monthlyData.find((m: any) => m.month === monthIndex + 1);
        if (!monthData?.maintenance) return '';

        const schedules: string[] = [];

        // Check all maintenance types
        ['inventory', 'preventive', 'corrective', 'calibration'].forEach((type) => {
            const value = monthData.maintenance[type] || monthData.maintenance[`${type}Created`] || monthData.maintenance[`${type}Updated`];

            if (value && value !== '') {
                const date = new Date(value);
                schedules.push(`${type.charAt(0).toUpperCase()}: ${date.getDate()}`);
            }
        });

        return schedules.join(', ');
    }
}
