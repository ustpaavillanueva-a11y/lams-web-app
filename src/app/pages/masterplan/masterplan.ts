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

@Component({
    selector: 'app-masterplan',
    standalone: true,
    imports: [CommonModule, ToolbarModule, ButtonModule, RippleModule, TableModule, InputTextModule, FormsModule],
    template: `
        <p-toolbar styleClass="mb-4">
            <ng-template #start>
                <div class="flex items-center gap-2">
                    <i class="pi pi-calendar text-2xl" style="color:#667eea"></i>
                    <span class="text-xl font-bold">Master Plan</span>
                </div>
            </ng-template>

            <ng-template #end>
                <div class="flex items-center gap-4">
                    <!-- YEAR -->
                    <div class="flex items-center gap-2">
                        <label class="font-semibold">Year:</label>
                        <select [(ngModel)]="selectedYear" (ngModelChange)="onFilterChange()" class="p-inputtext">
                            <option value="">All Years</option>
                            <option *ngFor="let year of years" [value]="year">
                                {{ year }}
                            </option>
                        </select>
                    </div>

                    <!-- LAB -->
                    <div class="flex items-center gap-2">
                        <label class="font-semibold">Laboratory:</label>
                        <select [(ngModel)]="selectedLaboratory" (ngModelChange)="onFilterChange()" class="p-inputtext">
                            <option value="">Select Laboratory</option>
                            <option *ngFor="let lab of laboratories" [value]="lab.laboratoryId">
                                {{ lab.laboratoryName }}
                            </option>
                        </select>
                    </div>

                    <!-- CATEGORY -->
                    <div class="flex items-center gap-2">
                        <label class="font-semibold">Category:</label>
                        <select [(ngModel)]="selectedCategory" (ngModelChange)="onFilterChange()" class="p-inputtext">
                            <option value="">All Categories</option>
                            <option *ngFor="let category of categories" [value]="category">
                                {{ category }}
                            </option>
                        </select>
                    </div>

                    <!-- TOGGLE BUTTON -->
                    <p-button [label]="showSchedule ? 'Hide Schedule' : 'Show Schedule'" icon="pi pi-calendar" severity="info" [outlined]="true" (onClick)="toggleSchedule()"> </p-button>

                    <p-button label="Print" icon="pi pi-print" severity="secondary" [outlined]="true" />

                    <p-button label="Export" icon="pi pi-upload" severity="success" [outlined]="true" />
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
                                    {{ item.equipment?.equipmentName || 'N/A' }}
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
}
