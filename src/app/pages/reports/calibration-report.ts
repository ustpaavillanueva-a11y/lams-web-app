import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { HttpClient } from '@angular/common/http';
import { ReportService } from '../service/report.service';
import { environment } from 'src/environments/environment';

interface Laboratory {
    laboratoryId: string;
    laboratoryName: string;
}

interface CalibrationReportRecord {
    date?: Date;
    machineEquipmentInstrument?: string;
    actualReading?: string;
    expectedReading?: string;
    observation?: string;
    actionTaken?: string;
}

@Component({
    selector: 'app-calibration-report',
    standalone: true,
    imports: [CommonModule, FormsModule, ToolbarModule, ButtonModule, DatePickerModule, TableModule, TagModule, SelectModule, ProgressSpinnerModule, MessageModule],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h2 class="text-2xl font-bold mb-1">Calibration Report</h2>
                    <p class="text-muted-color">Generate daily, monthly, or yearly calibration reports by laboratory.</p>
                </div>
            </div>

            <!-- Filters Section -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-surface-50 dark:bg-surface-800 rounded">
                <div class="flex flex-col gap-2">
                    <label for="reportType" class="font-semibold">Report Type</label>
                    <p-select [(ngModel)]="reportType" [options]="reportTypes" optionLabel="label" optionValue="value" placeholder="Select report type" (onChange)="onReportTypeChange()" />
                </div>

                <div class="flex flex-col gap-2" *ngIf="reportType === 'daily'">
                    <label for="selectedDate" class="font-semibold">Date</label>
                    <p-datepicker [(ngModel)]="selectedDate" inputId="selectedDate" placeholder="Select date" dateFormat="yy-mm-dd" />
                </div>

                <div class="flex flex-col gap-2" *ngIf="reportType === 'monthly'">
                    <label for="selectedMonth" class="font-semibold">Month</label>
                    <p-select [(ngModel)]="selectedMonth" [options]="months" optionLabel="label" optionValue="value" placeholder="Select month" />
                </div>

                <div class="flex flex-col gap-2" *ngIf="reportType === 'monthly' || reportType === 'yearly'">
                    <label for="selectedYear" class="font-semibold">Year</label>
                    <p-select [(ngModel)]="selectedYear" [options]="years" placeholder="Select year" />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="selectedLaboratoryId" class="font-semibold">Laboratory</label>
                    <p-select [(ngModel)]="selectedLaboratoryId" [options]="laboratories" optionLabel="laboratoryName" optionValue="laboratoryId" placeholder="Select laboratory" [filter]="true" />
                </div>

                <div class="flex items-end">
                    <p-button label="Generate Report" icon="pi pi-chart-bar" (onClick)="generateReport()" [disabled]="!isFormValid() || isLoading" [loading]="isLoading" />
                </div>
            </div>

            <!-- Error Message -->
            <p-message *ngIf="errorMessage" severity="error" [text]="errorMessage" styleClass="mb-4 w-full" />

            <!-- Loading Spinner -->
            <div *ngIf="isLoading" class="flex justify-center items-center py-8">
                <p-progressSpinner />
            </div>

            <!-- Report Results -->
            <div *ngIf="reportData && !isLoading" class="mt-4">
                <div class="mb-4 p-4 bg-surface-100 dark:bg-surface-700 rounded">
                    <h3 class="text-xl font-bold mb-2">{{ reportData.laboratoryName || 'Calibration Report' }}</h3>
                    <p *ngIf="reportType === 'daily'"><strong>Date:</strong> {{ reportData.date ? (reportData.date | date: 'longDate') : (selectedDate | date: 'longDate') }}</p>
                    <p *ngIf="reportType === 'monthly'"><strong>Period:</strong> {{ getMonthName(selectedMonth) }} {{ selectedYear }}</p>
                    <p *ngIf="reportType === 'yearly'"><strong>Year:</strong> {{ selectedYear }}</p>
                    <p><strong>Performed By:</strong> {{ reportData.performedBy || 'N/A' }}</p>
                    <p><strong>Assisted By:</strong> {{ reportData.assistedBy || 'N/A' }}</p>
                    <p><strong>Noted By:</strong> {{ reportData.notedBy || 'N/A' }}</p>
                    <p class="mt-2"><strong>Recommendations:</strong></p>
                    <p class="text-muted-color">{{ reportData.recommendation || reportData.recommendations || 'No recommendations provided' }}</p>
                </div>

                <p-toolbar styleClass="mb-2">
                    <ng-template #start>
                        <span class="font-semibold">Calibration Report Details</span>
                    </ng-template>
                    <ng-template #end>
                        <p-button label="Export CSV" icon="pi pi-upload" (onClick)="exportCSV()" size="small" />
                    </ng-template>
                </p-toolbar>

                <p-table [value]="reportData.records" [rows]="10" [paginator]="true" [rowsPerPageOptions]="[10, 20, 30]" [tableStyle]="{ 'min-width': '75rem' }">
                    <ng-template pTemplate="header">
                        <tr>
                            <th>Equipment / Instrument</th>
                            <th>Actual Reading</th>
                            <th>Expected Reading</th>
                            <th>Observation</th>
                            <th>Action Taken</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-row>
                        <tr>
                            <td>{{ row.machineEquipmentInstrument || 'N/A' }}</td>
                            <td>{{ row.actualReading || 'N/A' }}</td>
                            <td>{{ row.expectedReading || 'N/A' }}</td>
                            <td>{{ row.observation || 'N/A' }}</td>
                            <td>{{ row.actionTaken || 'N/A' }}</td>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="5" class="text-center py-4">No records found.</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            <!-- No Data Message -->
            <div *ngIf="!reportData && !isLoading && !errorMessage" class="text-center py-8 text-muted-color">
                <i class="pi pi-info-circle text-4xl mb-3"></i>
                <p>Select filters and click "Generate Report" to view data.</p>
            </div>
        </div>
    `
})
export class CalibrationReportComponent implements OnInit {
    reportType: 'daily' | 'monthly' | 'yearly' = 'daily';
    selectedDate: Date = new Date();
    selectedMonth: number = new Date().getMonth() + 1;
    selectedYear: number = new Date().getFullYear();

    laboratories: Laboratory[] = [];
    selectedLaboratoryId: string | null = null;

    reportData: any = null;
    isLoading = false;
    errorMessage = '';

    reportTypes = [
        { label: 'Daily Report', value: 'daily' },
        { label: 'Monthly Report', value: 'monthly' },
        { label: 'Yearly Report', value: 'yearly' }
    ];

    months = [
        { label: 'January', value: 1 },
        { label: 'February', value: 2 },
        { label: 'March', value: 3 },
        { label: 'April', value: 4 },
        { label: 'May', value: 5 },
        { label: 'June', value: 6 },
        { label: 'July', value: 7 },
        { label: 'August', value: 8 },
        { label: 'September', value: 9 },
        { label: 'October', value: 10 },
        { label: 'November', value: 11 },
        { label: 'December', value: 12 }
    ];

    years: number[] = [];
    private apiUrl = `${environment.apiUrl}/laboratories`;

    constructor(
        private reportService: ReportService,
        private http: HttpClient
    ) {
        const currentYear = new Date().getFullYear();
        for (let i = 2020; i <= currentYear + 5; i++) {
            this.years.push(i);
        }
    }

    ngOnInit(): void {
        this.loadLaboratories();
    }

    loadLaboratories(): void {
        this.http.get<Laboratory[]>(this.apiUrl).subscribe({
            next: (data) => (this.laboratories = data),
            error: (err) => console.error('❌ Failed to load laboratories:', err)
        });
    }

    onReportTypeChange(): void {
        this.reportData = null;
        this.errorMessage = '';
    }

    isFormValid(): boolean {
        return !!this.selectedLaboratoryId?.trim();
    }

    generateReport(): void {
        if (!this.selectedLaboratoryId) {
            this.errorMessage = 'Please select a laboratory.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.reportData = null;

        if (this.reportType === 'daily') {
            const dateStr = this.formatDateToString(this.selectedDate);
            this.reportService.getDailyCalibrationReport(dateStr, this.selectedLaboratoryId).subscribe({
                next: (data) => {
                    console.log('✅ Daily report data:', data);
                    this.reportData = data;
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('❌ Daily report error:', err);
                    this.errorMessage = err.error?.message || 'Failed to generate daily calibration report';
                    this.isLoading = false;
                }
            });
        } else if (this.reportType === 'monthly') {
            this.reportService.getMonthlyCalibrationReport(this.selectedMonth, this.selectedYear, this.selectedLaboratoryId).subscribe({
                next: (data) => {
                    console.log('✅ Monthly report data:', data);
                    this.reportData = data;
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('❌ Monthly report error:', err);
                    this.errorMessage = err.error?.message || 'Failed to generate monthly calibration report';
                    this.isLoading = false;
                }
            });
        } else if (this.reportType === 'yearly') {
            // Yearly endpoint
            this.reportService.getYearlyCalibrationReport(this.selectedYear, this.selectedLaboratoryId).subscribe({
                next: (data) => {
                    console.log('✅ Yearly report data:', data);
                    this.reportData = data;
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('❌ Yearly report error:', err);
                    this.errorMessage = err.error?.message || 'Failed to generate yearly calibration report';
                    this.isLoading = false;
                }
            });
        }
    }

    formatDateToString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getMonthName(month: number): string {
        const monthObj = this.months.find((m) => m.value === month);
        return monthObj ? monthObj.label : 'Unknown';
    }

    exportCSV(): void {
        if (!this.reportData || !this.reportData.records) {
            console.warn('No data to export');
            return;
        }

        const csvHeader = 'Date,Equipment/Instrument,Actual Reading,Expected Reading,Observation,Action Taken\n';
        const csvRows = this.reportData.records
            .map((record: CalibrationReportRecord) => {
                const date = record.date ? new Date(record.date).toISOString().split('T')[0] : '';
                return `"${date}","${record.machineEquipmentInstrument || 'N/A'}","${record.actualReading || 'N/A'}","${record.expectedReading || 'N/A'}","${record.observation || 'N/A'}","${record.actionTaken || 'N/A'}"`;
            })
            .join('\n');

        const csv = csvHeader + csvRows;
        const filename =
            this.reportType === 'daily'
                ? `calibration-daily-${this.formatDateToString(this.selectedDate)}.csv`
                : this.reportType === 'monthly'
                  ? `calibration-monthly-${this.selectedYear}-${this.selectedMonth}.csv`
                  : `calibration-yearly-${this.selectedYear}.csv`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.click();
        URL.revokeObjectURL(url);
    }
}
