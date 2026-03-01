import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ReportService } from '../service/report.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface DailyReportRecord {
    machineEquipmentInstrument: string;
    actionTaken: string;
    observation: string;
}

interface MonthlyReportRecord {
    date: Date;
    machineEquipmentInstrument: string;
    serialNumber: string;
    observations: string;
    actionTaken: string;
    remarks: string;
}

interface Laboratory {
    laboratoryId: string;
    laboratoryName: string;
}

@Component({
    selector: 'app-preventive-report',
    standalone: true,
    imports: [CommonModule, FormsModule, ToolbarModule, ButtonModule, DatePickerModule, TableModule, TabsModule, TagModule, SelectModule, InputTextModule, ProgressSpinnerModule, MessageModule, CardModule, DialogModule],
    template: `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h2 class="text-2xl font-bold mb-1">Preventive Maintenance Report</h2>
                    <p class="text-muted-color">Generate daily, monthly, or yearly preventive maintenance reports by laboratory.</p>
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
                    <label for="laboratoryId" class="font-semibold">Laboratory</label>
                    <p-select [(ngModel)]="laboratoryId" [options]="laboratories" optionLabel="laboratoryName" optionValue="laboratoryId" placeholder="Select laboratory" [filter]="true" />
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

            <!-- Report Results - Daily -->
            <div *ngIf="reportData && reportType === 'daily' && !isLoading" class="mt-4">
                <div class="mb-4 p-4 bg-surface-100 dark:bg-surface-700 rounded">
                    <h3 class="text-xl font-bold mb-2">{{ reportData.laboratoryName }}</h3>
                    <p><strong>Date:</strong> {{ formatDate(reportData.date) }}</p>
                    <p><strong>Performed By:</strong> {{ reportData.performedBy || 'N/A' }}</p>
                    <p><strong>Assisted By:</strong> {{ reportData.assistedBy || 'N/A' }}</p>
                    <p class="mt-2"><strong>Recommendations:</strong></p>
                    <p class="text-muted-color">{{ reportData.recommendations || 'No recommendations provided' }}</p>
                </div>

                <p-toolbar styleClass="mb-2">
                    <ng-template #start>
                        <span class="font-semibold">Daily Report Details</span>
                    </ng-template>
                    <ng-template #end>
                        <p-button label="Preview & Export" icon="pi pi-download" (onClick)="openPreview()" size="small" />
                    </ng-template>
                </p-toolbar>

                <p-table [value]="reportData.records" [rows]="10" [paginator]="true" [rowsPerPageOptions]="[10, 20, 30]" [tableStyle]="{ 'min-width': '60rem' }">
                    <ng-template pTemplate="header">
                        <tr>
                            <th style="width: 30%">Machine/Equipment/Instrument</th>
                            <th style="width: 35%">Action Taken</th>
                            <th style="width: 35%">Observation</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-row>
                        <tr>
                            <td>{{ row.machineEquipmentInstrument || 'N/A' }}</td>
                            <td>{{ row.actionTaken || 'N/A' }}</td>
                            <td>{{ row.observation || 'N/A' }}</td>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="3" class="text-center py-4">No records found.</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            <!-- Report Results - Monthly/Yearly -->
            <div *ngIf="reportData && (reportType === 'monthly' || reportType === 'yearly') && !isLoading" class="mt-4">
                <div class="mb-4 p-4 bg-surface-100 dark:bg-surface-700 rounded">
                    <h3 class="text-xl font-bold mb-2">{{ reportData.laboratoryName }}</h3>
                    <p *ngIf="reportType === 'monthly'"><strong>Period:</strong> {{ getMonthName(reportData.month) }} {{ reportData.year }}</p>
                    <p *ngIf="reportType === 'yearly'"><strong>Year:</strong> {{ reportData.year || selectedYear }}</p>
                    <p><strong>Campus:</strong> {{ reportData.campusName || 'N/A' }}</p>
                    <p><strong>Total Records:</strong> {{ reportData.totalRecords || 0 }}</p>
                </div>

                <p-toolbar styleClass="mb-2">
                    <ng-template #start>
                        <span class="font-semibold">{{ reportType === 'monthly' ? 'Monthly' : 'Yearly' }} Report Details</span>
                    </ng-template>
                    <ng-template #end>
                        <p-button label="Preview & Export" icon="pi pi-download" (onClick)="openPreview()" size="small" />
                    </ng-template>
                </p-toolbar>

                <p-table [value]="reportData.records" [rows]="10" [paginator]="true" [rowsPerPageOptions]="[10, 20, 30]" [tableStyle]="{ 'min-width': '80rem' }">
                    <ng-template pTemplate="header">
                        <tr>
                            <th>Date</th>
                            <th>Equipment</th>
                            <th>Serial Number</th>
                            <th>Observations</th>
                            <th>Action Taken</th>
                            <th>Remarks</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-row>
                        <tr>
                            <td>{{ row.date | date: 'mediumDate' }}</td>
                            <td>{{ row.machineEquipmentInstrument || 'N/A' }}</td>
                            <td>{{ row.serialNumber || 'N/A' }}</td>
                            <td>{{ row.observations || 'N/A' }}</td>
                            <td>{{ row.actionTaken || 'N/A' }}</td>
                            <td>{{ row.remarks || 'N/A' }}</td>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="6" class="text-center py-4">No records found.</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            <!-- No Data Message -->
            <div *ngIf="!reportData && !isLoading && !errorMessage" class="text-center py-8 text-muted-color">
                <i class="pi pi-info-circle text-4xl mb-3"></i>
                <p>Select filters and click "Generate Report" to view data.</p>
            </div>

            <!-- Preview Dialog -->
            <p-dialog [(visible)]="showPreview" [header]="'Preview Preventive Maintenance Form'" [modal]="true" [style]="{ width: '90vw', height: '90vh' }" [maximizable]="true">
                <div class="preview-container" style="max-height: 70vh; overflow-y: auto;">
                    <!-- Form Preview -->
                    <div style="background: white; padding: 30px; font-family: Arial, sans-serif; line-height: 1.5;">
                        <!-- Header -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                            <div>
                                <img [src]="headerImageBase64 || 'public/header.png'" style="max-width: 200px; height: auto; max-height: 60px;" />
                            </div>
                        </div>

                        <!-- Title -->
                        <div style="text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0;">PREVENTIVE MAINTENANCE FORM</div>

                        <!-- Lab Name and Date (Editable) -->
                        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
                            <div style="flex: 1;">
                                <strong>Laboratory Name:</strong>
                                <input [(ngModel)]="previewData.laboratoryName" style="width: 100%; border: none; border-bottom: 1px solid #333; padding: 5px 0;" />
                            </div>
                            <div style="flex: 1; text-align: right;">
                                <strong>Date:</strong>
                                <input [(ngModel)]="previewData.reportDate" style="width: 150px; border: none; border-bottom: 1px solid #333; padding: 5px 0; text-align: right;" />
                            </div>
                        </div>

                        <!-- Table -->
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold; width: 35%;">Machine / Equipment / Instrument</th>
                                    <th style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold; width: 30%;">Action Taken</th>
                                    <th style="border: 1px solid black; padding: 10px; text-align: center; font-weight: bold; width: 35%;">Observation</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let row of previewData.tableRows; let i = index">
                                    <td style="border: 1px solid black; padding: 8px; height: 30px;">
                                        <input [(ngModel)]="row.equipment" style="width: 100%; border: none; padding: 2px;" />
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px;">
                                        <input [(ngModel)]="row.action" style="width: 100%; border: none; padding: 2px;" />
                                    </td>
                                    <td style="border: 1px solid black; padding: 8px;">
                                        <input [(ngModel)]="row.observation" style="width: 100%; border: none; padding: 2px;" />
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- Recommendation (Editable) -->
                        <div style="margin-bottom: 20px;">
                            <strong style="color: #8B4513; font-size: 12px;">Recommendation:</strong>
                            <textarea [(ngModel)]="previewData.recommendation" style="width: 100%; min-height: 60px; border: 1px solid #999; padding: 8px; font-size: 10px; font-family: Arial; margin-top: 5px;"></textarea>
                        </div>

                        <!-- Signatures (Editable) -->
                        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 10px;">
                            <div style="text-align: center; flex: 1;">
                                <div style="font-weight: bold; color: #8B4513;">Performed by:</div>
                                <div style="height: 50px; border-bottom: 1px solid black; margin: 10px 0;"></div>
                                <input [(ngModel)]="previewData.performedBy" style="border: none; text-align: center; width: 100%; font-size: 9px;" placeholder="Name" />
                            </div>
                            <div style="text-align: center; flex: 1;">
                                <div style="font-weight: bold; color: #8B4513;">Assisted by:</div>
                                <div style="height: 50px; border-bottom: 1px solid black; margin: 10px 0;"></div>
                                <input [(ngModel)]="previewData.assistedBy" style="border: none; text-align: center; width: 100%; font-size: 9px;" placeholder="Name" />
                            </div>
                            <div style="text-align: center; flex: 1;">
                                <div style="font-weight: bold; color: #8B4513;">Noted by:</div>
                                <div style="height: 50px; border-bottom: 1px solid black; margin: 10px 0;"></div>
                                <div style="font-size: 9px; color: #0066cc; font-weight: bold;">Head, Maintenance Unit</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dialog Footer -->
                <ng-template pTemplate="footer">
                    <p-button label="Cancel" icon="pi pi-times" (onClick)="showPreview = false" class="p-button-secondary" />
                    <p-button label="Download" icon="pi pi-download" (onClick)="downloadFromPreview()" class="p-button-success" />
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class PreventiveReportComponent implements OnInit {
    reportType: 'daily' | 'monthly' | 'yearly' = 'daily';
    selectedDate: Date = new Date();
    selectedMonth: number = new Date().getMonth() + 1;
    selectedYear: number = new Date().getFullYear();
    laboratoryId: string = '';

    reportData: any = null;
    isLoading: boolean = false;
    errorMessage: string = '';

    laboratories: Laboratory[] = [];

    showPreview: boolean = false;
    previewData: any = {
        laboratoryName: '',
        reportDate: '',
        tableRows: [],
        recommendation: '',
        performedBy: '',
        assistedBy: ''
    };

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
    headerImageBase64: string = '';
    private exportRetryCount: number = 0;
    private maxExportRetries: number = 10;

    constructor(
        private reportService: ReportService,
        private http: HttpClient
    ) {
        // Generate years from 2020 to current year + 5
        const currentYear = new Date().getFullYear();
        for (let i = 2020; i <= currentYear + 5; i++) {
            this.years.push(i);
        }
    }

    ngOnInit(): void {
        this.loadHeaderImage();
        this.loadLaboratories();
    }

    loadHeaderImage(): void {
        // Try to load from assets folder
        this.http.get('assets/header.png.png', { responseType: 'blob' }).subscribe({
            next: (blob) => {
                this.convertBlobToBase64(blob);
            },
            error: (error) => {
                console.warn('⚠️ Could not load header image from assets/', error);
                // Silently fail - proceed without image
                this.headerImageBase64 = '';
            }
        });
    }

    private convertBlobToBase64(blob: Blob): void {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                let dataUrl = event.target?.result as string;
                // Ensure it's a proper data URL with MIME type
                if (dataUrl && dataUrl.startsWith('data:')) {
                    this.headerImageBase64 = dataUrl;
                } else if (dataUrl) {
                    // Fallback: add MIME type if not present
                    this.headerImageBase64 = 'data:image/png;base64,' + dataUrl.split(',')[1];
                } else {
                    console.warn('⚠️ Could not convert image');
                    this.headerImageBase64 = '';
                }
            } catch (error) {
                console.warn('⚠️ Error processing image:', error);
                this.headerImageBase64 = '';
            }
        };
        reader.onerror = () => {
            console.warn('⚠️ FileReader error while loading image');
            this.headerImageBase64 = '';
        };
        reader.readAsDataURL(blob);
    }

    loadLaboratories(): void {
        const apiUrl = `${environment.apiUrl}/laboratories`;
        this.http.get<Laboratory[]>(apiUrl).subscribe({
            next: (data) => {
                this.laboratories = data;
            },
            error: (error) => {
                console.error('❌ Error loading laboratories:', error);
            }
        });
    }

    onReportTypeChange(): void {
        this.reportData = null;
        this.errorMessage = '';
    }

    isFormValid(): boolean {
        return this.laboratoryId.trim().length > 0;
    }

    generateReport(): void {
        this.isLoading = true;
        this.errorMessage = '';
        this.reportData = null;

        if (this.reportType === 'daily') {
            const dateStr = this.formatDateToString(this.selectedDate);
            this.reportService.getDailyPreventiveReport(dateStr, this.laboratoryId).subscribe({
                next: (data) => {
                    this.reportData = data;
                    this.isLoading = false;
                },
                error: (error) => {
                    this.errorMessage = error.error?.message || 'Failed to generate daily report';
                    this.isLoading = false;
                    console.error('❌ Error loading daily report:', error);
                }
            });
        } else if (this.reportType === 'monthly') {
            this.reportService.getMonthlyPreventiveReport(this.selectedMonth, this.selectedYear, this.laboratoryId).subscribe({
                next: (data) => {
                    this.reportData = data;
                    this.isLoading = false;
                },
                error: (error) => {
                    this.errorMessage = error.error?.message || 'Failed to generate monthly report';
                    this.isLoading = false;
                    console.error('❌ Error loading monthly report:', error);
                }
            });
        } else {
            this.reportService.getYearlyPreventiveReport(this.selectedYear, this.laboratoryId).subscribe({
                next: (data) => {
                    this.reportData = data;
                    this.isLoading = false;
                },
                error: (error) => {
                    this.errorMessage = error.error?.message || 'Failed to generate yearly report';
                    this.isLoading = false;
                    console.error('❌ Error loading yearly report:', error);
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

    formatDate(date: string | Date): string {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getMonthName(month: number): string {
        const monthObj = this.months.find((m) => m.value === month);
        return monthObj ? monthObj.label : 'Unknown';
    }

    isImageLoaded(): boolean {
        return this.headerImageBase64.length > 0;
    }

    exportWord(): void {
        if (!this.reportData || !this.reportData.records) {
            console.warn('No data to export');
            return;
        }

        // Wait for image if not yet loaded, then proceed
        if (!this.isImageLoaded()) {
            if (this.exportRetryCount < this.maxExportRetries) {
                this.exportRetryCount++;
                setTimeout(() => this.exportWord(), 300); // Retry after 300ms
            } else {
                console.warn('Image failed to load, proceeding with export');
                this.exportRetryCount = 0;
                this.proceedWithWordExport();
            }
            return;
        }
        this.exportRetryCount = 0;
        this.proceedWithWordExport();
    }

    private proceedWithWordExport(): void {
        if (!this.reportData || !this.reportData.records) {
            return;
        }

        const timestamp = this.getTimestamp();
        const reportDate =
            this.reportType === 'daily'
                ? this.formatDate(this.reportData.date || this.selectedDate)
                : this.reportType === 'monthly'
                  ? `${this.getMonthName(this.reportData.month || this.selectedMonth)} ${this.reportData.year || this.selectedYear}`
                  : String(this.reportData.year || this.selectedYear);

        // Generate table rows for the form
        const tableRows = this.reportData.records
            .map((row: DailyReportRecord | MonthlyReportRecord) => {
                const equipment = this.escapeHtml((row as any).machineEquipmentInstrument || 'N/A');
                const action = this.escapeHtml((row as any).actionTaken || 'N/A');
                const observation = this.escapeHtml((row as any).observation || (row as any).observations || 'N/A');
                return `<tr><td style="border: 1px solid black; padding: 12px; height: 30px;">${equipment}</td><td style="border: 1px solid black; padding: 12px;">${action}</td><td style="border: 1px solid black; padding: 12px;">${observation}</td></tr>`;
            })
            .join('');

        // Add empty rows if less than 10 rows
        const emptyRows = Math.max(0, 10 - this.reportData.records.length);
        let additionalRows = '';
        for (let i = 0; i < emptyRows; i++) {
            additionalRows += `<tr><td style="border: 1px solid black; padding: 12px; height: 30px;">&nbsp;</td><td style="border: 1px solid black; padding: 12px;">&nbsp;</td><td style="border: 1px solid black; padding: 12px;">&nbsp;</td></tr>`;
        }

        const recommendations = this.escapeHtml(this.reportData.recommendations || 'No recommendations provided');
        const performedBy = this.escapeHtml(this.reportData.performedBy || '');
        const assistedBy = this.escapeHtml(this.reportData.assistedBy || '');
        const notedBy = this.escapeHtml(this.reportData.notedBy || 'Head, Maintenance Unit');

        const documentContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8" />
                    <title>Preventive Maintenance Form</title>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 2cm;
                        }
                        body {
                            font-family: Arial, sans-serif;
                            margin: 5px;
                            margin-top: 5px;
                            width: 100%;
                        }
                        .title {
                            text-align: center;
                            font-size: 16px;
                            font-weight: bold;
                            margin: 15px 0 20px 0;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 12px;
                        }
                        .info-field {
                            flex: 1;
                        }
                        .form-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 2px;
                            margin-top: 2px;
                        }
                        .form-table th {
                            border: 1px solid black;
                            padding: 1px;
                            text-align: center;
                            font-weight: bold;
                            font-size: 11px;
                            background: #f9f9f9;
                        }
                        .form-table td {
                            border: 1px solid black;
                            padding: 1px;
                            vertical-align: top;
                            font-size: 10px;
                            line-height: 1.2;
                        }
                        .recommendation-section {
                            margin-top: 10px;
                            margin-bottom: 10px;
                        }
                        .recommendation-label {
                            font-weight: bold;
                            color: #8B4513;
                            font-size: 12px;
                            margin-bottom: 8px;
                        }
                        .recommendation-text {
                            font-size: 10px;
                            line-height: 1.6;
                            min-height: 50px;
                            border-bottom: 1px solid #999;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        .signature-section {
                            margin-top: 30px;
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px;
                        }
                        .signature-block {
                            flex: 1;
                            text-align: center;
                        }
                        .signature-line {
                            margin-top: 40px;
                            border-bottom: 1px solid black;
                            height: 20px;
                            margin-bottom: 5px;
                        }
                        .signature-label {
                            font-weight: bold;
                            color: #8B4513;
                            font-size: 10px;
                        }
                    </style>
                </head>
                <body>
                    <!-- Header with Logo -->
                    <div style="text-align: center; margin-bottom: 10px;">
                        <img src="${this.headerImageBase64}" style="width: auto; height: auto;" />
                    </div>

                    <!-- Title -->
                    <div class="title">PREVENTIVE MAINTENANCE FORM</div>

                    <!-- Laboratory Name and Date -->
                    <div class="info-row">
                        <div class="info-field">
                            <strong>Laboratory Name:</strong> <u style="margin-left: 5px;">${this.escapeHtml(this.reportData.laboratoryName || '')}</u>
                        </div>
                        <div class="info-field" style="text-align: right;">
                            <strong>Date:</strong> <u style="margin-left: 5px; display: inline-block; width: 150px;">${reportDate}</u>
                        </div>
                    </div>

                    <!-- Main Table -->
                    <table class="form-table">
                        <thead>
                            <tr>
                                <th style="width: 35%;">Machine / Equipment / Instrument</th>
                                <th style="width: 30%;">Action Taken</th>
                                <th style="width: 35%;">Observation</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                            ${additionalRows}
                        </tbody>
                    </table>

                    <!-- Recommendation Section -->
                    <div class="recommendation-section">
                        <div class="recommendation-label">Recommendation:</div>
                        <div class="recommendation-text">${recommendations}</div>
                    </div>

                    <!-- Signature Section -->
                    <div class="signature-section">
                        <div class="signature-block">
                            <div class="signature-label">Performed by:</div>
                            <div class="signature-line"></div>
                            <div style="font-size: 9px;">${performedBy}</div>
                        </div>
                        <div class="signature-block">
                            <div class="signature-label">Assisted by:</div>
                            <div class="signature-line"></div>
                            <div style="font-size: 9px;">${assistedBy}</div>
                        </div>
                        <div class="signature-block">
                            <div class="signature-label">Noted by:</div>
                            <div class="signature-line"></div>
                            <div style="font-size: 9px; color: #0066cc; font-weight: bold;">Head, Maintenance Unit</div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const filename = `preventive-${this.reportType}-${timestamp}.doc`;
        const blob = new Blob(['\ufeff', documentContent], { type: 'application/msword' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.click();
        URL.revokeObjectURL(url);
    }

    private getTimestamp(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }

    private escapeHtml(value: string): string {
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    openPreview(): void {
        if (!this.reportData || !this.reportData.records) {
            console.warn('No data to preview');
            return;
        }

        // Initialize preview data from report data
        const reportDate =
            this.reportType === 'daily'
                ? this.formatDate(this.reportData.date || this.selectedDate)
                : this.reportType === 'monthly'
                  ? `${this.getMonthName(this.reportData.month || this.selectedMonth)} ${this.reportData.year || this.selectedYear}`
                  : String(this.reportData.year || this.selectedYear);

        this.previewData = {
            laboratoryName: this.reportData.laboratoryName || '',
            reportDate: reportDate,
            tableRows: this.reportData.records.map((row: any) => ({
                equipment: row.machineEquipmentInstrument || '',
                action: row.actionTaken || '',
                observation: row.observation || row.observations || ''
            })),
            recommendation: this.reportData.recommendations || '',
            performedBy: this.reportData.performedBy || '',
            assistedBy: this.reportData.assistedBy || ''
        };

        // Pad table rows to minimum 8
        while (this.previewData.tableRows.length < 8) {
            this.previewData.tableRows.push({ equipment: '', action: '', observation: '' });
        }

        this.showPreview = true;
    }

    downloadFromPreview(): void {
        if (!this.previewData) {
            console.warn('No preview data');
            return;
        }

        // Wait for image if not yet loaded, then proceed
        if (!this.isImageLoaded()) {
            if (this.exportRetryCount < this.maxExportRetries) {
                this.exportRetryCount++;
                setTimeout(() => this.downloadFromPreview(), 300); // Retry after 300ms
            } else {
                console.warn('Image failed to load, proceeding with export');
                this.exportRetryCount = 0;
                this.proceedWithPreviewDownload();
            }
            return;
        }
        this.exportRetryCount = 0;
        this.proceedWithPreviewDownload();
    }

    private proceedWithPreviewDownload(): void {
        if (!this.previewData) {
            return;
        }

        const timestamp = this.getTimestamp();

        // Build table rows HTML from preview data
        const tableRows = this.previewData.tableRows
            .map((row: any) => {
                const equipment = this.escapeHtml(row.equipment);
                const action = this.escapeHtml(row.action);
                const observation = this.escapeHtml(row.observation);
                return `<tr><td style="border: 1px solid black; padding: 12px; height: 30px;">${equipment}</td><td style="border: 1px solid black; padding: 12px;">${action}</td><td style="border: 1px solid black; padding: 12px;">${observation}</td></tr>`;
            })
            .join('');

        const recommendations = this.escapeHtml(this.previewData.recommendation);
        const performedBy = this.escapeHtml(this.previewData.performedBy);
        const assistedBy = this.escapeHtml(this.previewData.assistedBy);

        const documentContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8" />
                    <title>Preventive Maintenance Form</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 20px;
                            margin-top: 10px;
                        }
                        .title {
                            text-align: center;
                            font-size: 16px;
                            font-weight: bold;
                            margin: 15px 0 20px 0;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 15px;
                            font-size: 12px;
                        }
                        .info-field {
                            flex: 1;
                        }
                        .form-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 2px;
                            margin-top: 2px;
                        }
                        .form-table th {
                            border: 1px solid black;
                            padding: 1px;
                            text-align: center;
                            font-weight: bold;
                            font-size: 11px;
                            background: #f9f9f9;
                        }
                        .form-table td {
                            border: 1px solid black;
                            padding: 1px;
                            vertical-align: top;
                            font-size: 10px;
                            line-height: 1.2;
                        }
                        .recommendation-section {
                            margin-top: 20px;
                            margin-bottom: 20px;
                        }
                        .recommendation-label {
                            font-weight: bold;
                            color: #8B4513;
                            font-size: 12px;
                            margin-bottom: 8px;
                        }
                        .recommendation-text {
                            font-size: 10px;
                            line-height: 1.6;
                            min-height: 50px;
                            border-bottom: 1px solid #999;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        .signature-section {
                            margin-top: 30px;
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px;
                        }
                        .signature-block {
                            flex: 1;
                            text-align: center;
                        }
                        .signature-line {
                            margin-top: 40px;
                            border-bottom: 1px solid black;
                            height: 20px;
                            margin-bottom: 5px;
                        }
                        .signature-label {
                            font-weight: bold;
                            color: #8B4513;
                            font-size: 10px;
                        }
                    </style>
                </head>
                <body>
                    <!-- Header with Logo -->
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${this.headerImageBase64}" style="width: 1.5in; height: auto;" />
                    </div>

                    <!-- Title -->
                    <div class="title">PREVENTIVE MAINTENANCE FORM</div>

                    <!-- Laboratory Name and Date -->
                    <div class="info-row">
                        <div class="info-field">
                            <strong>Laboratory Name:</strong> <u style="margin-left: 5px;">${this.escapeHtml(this.previewData.laboratoryName)}</u>
                        </div>
                        <div class="info-field" style="text-align: right;">
                            <strong>Date:</strong> <u style="margin-left: 5px; display: inline-block; width: 150px;">${this.escapeHtml(this.previewData.reportDate)}</u>
                        </div>
                    </div>

                    <!-- Main Table -->
                    <table class="form-table">
                        <thead>
                            <tr>
                                <th style="width: 30%;">Machine / Equipment / Instrument</th>
                                <th style="width: 25%;">Action Taken</th>
                                <th style="width: 30%;">Observation</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>

                    <!-- Recommendation Section -->
                    <div class="recommendation-section">
                        <div class="recommendation-label">Recommendation:</div>
                        <div class="recommendation-text">${recommendations}</div>
                    </div>

                    <!-- Signature Section -->
                    <div class="signature-section">
                        <div class="signature-block">
                            <div class="signature-label">Performed by:</div>
                            <div class="signature-line"></div>
                            <div style="font-size: 9px;">${performedBy}</div>
                        </div>
                        <div class="signature-block">
                            <div class="signature-label">Assisted by:</div>
                            <div class="signature-line"></div>
                            <div style="font-size: 9px;">${assistedBy}</div>
                        </div>
                        <div class="signature-block">
                            <div class="signature-label">Noted by:</div>
                            <div class="signature-line"></div>
                            <div style="font-size: 9px; color: #0066cc; font-weight: bold;">Head, Maintenance Unit</div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const filename = `preventive-${this.reportType}-${timestamp}.doc`;
        const blob = new Blob(['\ufeff', documentContent], { type: 'application/msword' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.click();
        URL.revokeObjectURL(url);

        // Close preview dialog
        this.showPreview = false;
    }
}
