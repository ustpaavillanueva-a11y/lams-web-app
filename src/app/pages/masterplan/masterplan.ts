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
@Component({
    selector: 'app-masterplan',
    standalone: true,
    imports: [CommonModule, ToolbarModule, ButtonModule, RippleModule, TableModule, InputTextModule, FormsModule, DialogModule, ToastModule],
    providers: [MessageService],
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

                        <p-button label="Print" icon="pi pi-print" severity="secondary" [outlined]="true" />

                        <p-button label="Export" icon="pi pi-upload" severity="success" [outlined]="true" (onClick)="exportToExcel()" />
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
                                    {{ item.equipment?.assetName || 'N/A' }}
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

        <!-- EDIT DIALOG -->
        <p-dialog [(visible)]="showEditDialog" [modal]="true" [style]="{ width: '600px' }" [draggable]="false" [resizable]="false">
            <ng-template pTemplate="header">
                <h3 style="margin: 0">Edit {{ getMaintenanceTypeTitle() }} Schedule</h3>
            </ng-template>

            <div style="padding: 20px">
                <p style="margin-bottom: 20px; color: #64748b"><strong>Equipment:</strong> {{ selectedEquipment?.equipment?.assetName }}</p>

                <div style="margin-bottom: 15px">
                    <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #475569"> Select Dates for {{ getMaintenanceTypeTitle() }} </label>
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 10px">Click on dates to add/remove maintenance schedules</p>
                    <input
                        type="date"
                        (change)="onDateSelected($event)"
                        min="{{ selectedYear }}-01-01"
                        max="{{ selectedYear }}-12-31"
                        class="date-input"
                        style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; margin-bottom: 15px;"
                    />
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; max-height: 300px; overflow-y: auto;">
                    <p style="font-weight: 600; color: #475569; margin-bottom: 10px">Selected Dates:</p>
                    <div *ngIf="selectedDates.length === 0" style="color: #94a3b8; font-style: italic">No dates selected</div>
                    <div *ngFor="let date of selectedDates" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e2e8f0">
                        <span style="color: #334155">{{ formatDisplayDate(date) }}</span>
                        <button (click)="removeDate(date)" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px 8px; font-weight: 600">
                            <i class="pi pi-times"></i>
                        </button>
                    </div>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showEditDialog = false"></p-button>
                <p-button label="Save Changes" severity="primary" (onClick)="saveMaintenanceChanges()"></p-button>
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

    private currentYear = new Date().getFullYear();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
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
        const apiUrl = `${environment.apiUrl}/reports/master-plan/annual`;

        this.http
            .get<any>(apiUrl, {
                params: {
                    year: this.selectedYear,
                    laboratoryId: this.selectedLaboratory
                }
            })
            .subscribe((data) => {
                console.log(data);

                let allEquipment = data.equipmentMaintenances || [];

                this.equipmentList = this.selectedCategory ? allEquipment.filter((x: any) => x.equipment?.category === this.selectedCategory) : allEquipment;
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

        // For inventory, check both inventoryCreated and inventoryUpdated
        if (type === 'inventory') {
            const inventoryMonths = item.monthlyData
                .filter((m: any) => {
                    const created = m.maintenance?.inventoryCreated;
                    const updated = m.maintenance?.inventoryUpdated;
                    return (created && created !== '') || (updated && updated !== '');
                })
                .map((m: any) => months[m.month - 1]);
            return inventoryMonths.join(', ') || '-';
        }

        // For preventive, corrective, calibration
        return (
            item.monthlyData
                .filter((m: any) => {
                    const value = m.maintenance?.[type];
                    return value && value !== '';
                })
                .map((m: any) => months[m.month - 1])
                .join(', ') || '-'
        );
    }

    saveExcelFile(buffer: any): void {
        const data: Blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        const fileName = `MasterPlan_${this.selectedLaboratory}_${this.selectedYear}.xlsx`;

        saveAs(data, fileName);
    }

    exportToExcel() {
        if (!this.equipmentList.length) {
            console.warn('No data to export');
            return;
        }

        const data: any[] = [];

        this.equipmentList.forEach((item: any) => {
            const equipment = item.equipment || {};

            data.push({
                'ID Number': equipment.assetId || 'N/A',
                'Asset Name': equipment.equipmentName || equipment.assetName || 'N/A',
                Quantity: item.quantity || 1,
                'Date Acquired': this.formatDate(equipment.dateAcquired),
                Location: equipment.location || 'N/A',
                Price: this.formatPrice(equipment.price),
                Functional: item.isFunctional !== false ? 'Yes' : 'No',
                'Under Repair': item.isUnderRepair ? 'Yes' : 'No',

                // ===== MAINTENANCE SCHEDULE =====
                'Inventory Schedule': this.getScheduleText(item, 'inventory'),
                'Preventive Maintenance': this.getScheduleText(item, 'preventive'),
                'Corrective Maintenance': this.getScheduleText(item, 'corrective'),
                'Calibration Schedule': this.getScheduleText(item, 'calibration')
            });
        });

        // Create worksheet
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

        // Auto column width
        const wscols = [{ wch: 22 }, { wch: 30 }, { wch: 10 }, { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];
        worksheet['!cols'] = wscols;

        // Create workbook
        const workbook: XLSX.WorkBook = {
            Sheets: { 'Master Plan': worksheet },
            SheetNames: ['Master Plan']
        };

        // Generate Excel file
        const excelBuffer: any = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array'
        });

        this.saveExcelFile(excelBuffer);
    }

    openEditDialog(item: any, maintenanceType: string) {
        this.selectedEquipment = item;
        this.editMaintenanceType = maintenanceType;
        this.selectedDates = [];

        // Console log the selected equipment/asset
        console.log('=== EDIT MAINTENANCE SCHEDULE ===');
        console.log('Maintenance Type:', maintenanceType);
        console.log('Equipment:', item.equipment);
        console.log('Full Item Data:', item);
        console.log('Monthly Data:', item.monthlyData);

        // Prepare monthly data and collect existing dates
        this.editMonthlyData = (item.monthlyData || []).map((month: any) => {
            let dateStr = null;

            if (maintenanceType === 'inventory') {
                const created = month.maintenance?.inventoryCreated;
                const updated = month.maintenance?.inventoryUpdated;
                dateStr = created && created !== '' ? created : updated && updated !== '' ? updated : null;
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

        // Create a map of month numbers to selected dates in that month
        const monthDateMap = new Map<number, string>();

        this.selectedDates.forEach((dateStr) => {
            const date = new Date(dateStr);
            const month = date.getMonth() + 1; // 1-12
            // If multiple dates in same month, keep the first one
            if (!monthDateMap.has(month)) {
                monthDateMap.set(month, dateStr);
            }
        });

        // Update all months
        this.editMonthlyData.forEach((month) => {
            if (!month.recordId) {
                console.warn(`No record ID for ${month.monthName}`);
                return;
            }

            const payload: any = {};
            const dateForMonth = monthDateMap.get(month.month);

            if (this.editMaintenanceType === 'inventory') {
                if (dateForMonth) {
                    payload.inventoryCreated = dateForMonth;
                    payload.inventoryUpdated = dateForMonth;
                } else {
                    payload.inventoryCreated = '';
                    payload.inventoryUpdated = '';
                }
            } else {
                payload[this.editMaintenanceType] = dateForMonth || '';
            }

            const apiUrl = `${environment.apiUrl}/reports/master-plan/records/${month.recordId}`;
            updates.push(this.http.patch(apiUrl, payload).toPromise());
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
}
