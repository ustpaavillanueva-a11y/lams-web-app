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
@Component({
    selector: 'app-masterplan',
    standalone: true,
    imports: [CommonModule, ToolbarModule, ButtonModule, RippleModule, TableModule, InputTextModule, FormsModule],
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
                                <td *ngIf="showSchedule">
                                    {{ getScheduleText(item, 'inventory') }}
                                </td>

                                <td *ngIf="showSchedule">
                                    {{ getScheduleText(item, 'preventive') }}
                                </td>

                                <td *ngIf="showSchedule">
                                    {{ getScheduleText(item, 'corrective') }}
                                </td>

                                <td *ngIf="showSchedule">
                                    {{ getScheduleText(item, 'calibration') }}
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

    private currentYear = new Date().getFullYear();

    constructor(private http: HttpClient) {}

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

        return (
            item.monthlyData
                .filter((m: any) => m.maintenance?.[type] === 'X')
                .map((m: any) => months[m.month - 1])
                .join(', ') || '-'
        );
    }

    saveExcelFile(buffer: any): void {

    const data: Blob = new Blob(
        [buffer],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }
    );

    const fileName =
        `MasterPlan_${this.selectedLaboratory}_${this.selectedYear}.xlsx`;

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
}
