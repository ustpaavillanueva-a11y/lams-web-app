import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { UIChart } from 'primeng/chart';
import { BaseComponent } from '../../../core/base/base.component';
import { MaintenanceService } from '../../service/maintenance.service';
import { computeMaintenanceStats, MaintenanceStats, STATUS_GROUPS, StatusGroup } from '../maintenance-stats.utils';

const STATUS_COLORS: Record<StatusGroup, string> = {
    Pending: '#f59e0b',
    Scheduled: '#3b82f6',
    'In Progress': '#22c55e',
    'On Hold': '#f97316',
    Completed: '#14b8a6',
    'Declined/Cancelled': '#9ca3af',
    Other: '#a855f7'
};

/**
 * Campus-wide maintenance statistics for the LabTech dashboard
 * (the backend scopes requests and approvals to the LabTech's campus).
 */
@Component({
    selector: 'app-maintenance-stats-widget',
    standalone: true,
    imports: [CommonModule, UIChart],
    template: `
        <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
            <h3 class="text-xl font-semibold mb-4 dark:text-white">Campus Maintenance Statistics</h3>

            <div *ngIf="loading" class="text-gray-500 text-sm">Loading...</div>

            <ng-container *ngIf="!loading && stats">
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div *ngFor="let tile of tiles" class="rounded-lg border border-gray-200 dark:border-surface-700 p-4">
                        <p class="text-gray-600 dark:text-gray-400 text-sm font-medium m-0">{{ tile.label }}</p>
                        <p class="text-3xl font-bold mt-2 mb-0" [ngClass]="tile.color">{{ tile.value }}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-lg font-semibold dark:text-white text-center mb-4">Requests by Status</h4>
                        <div class="relative overflow-hidden w-full h-[260px]">
                            <p-chart type="doughnut" [data]="statusChartData" [options]="doughnutOptions"></p-chart>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold dark:text-white text-center mb-4">Requests by Maintenance Type</h4>
                        <div class="relative overflow-hidden w-full h-[260px]">
                            <p-chart type="bar" [data]="typeChartData" [options]="barOptions"></p-chart>
                        </div>
                    </div>
                </div>
            </ng-container>
        </div>
    `
})
export class MaintenanceStatsWidget extends BaseComponent implements OnInit {
    loading = true;
    stats: MaintenanceStats | null = null;
    tiles: { label: string; value: string; color: string }[] = [];
    statusChartData: any;
    typeChartData: any;
    doughnutOptions: any;
    barOptions: any;

    constructor(private maintenanceService: MaintenanceService) {
        super();
    }

    ngOnInit(): void {
        this.initChartOptions();
        forkJoin({
            requests: this.maintenanceService.getMaintenanceRequests().pipe(catchError(() => of([]))),
            approvals: this.maintenanceService.getMaintenanceApprovals().pipe(catchError(() => of([])))
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe(({ requests, approvals }) => {
                const stats = computeMaintenanceStats(requests, approvals);
                this.stats = stats;
                this.tiles = [
                    { label: 'Total Requests', value: String(stats.totalRequests), color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Completed This Month', value: String(stats.completedThisMonth), color: 'text-teal-600 dark:text-teal-400' },
                    { label: 'Completion Rate', value: stats.completionRate === null ? 'N/A' : `${stats.completionRate}%`, color: 'text-green-600 dark:text-green-400' },
                    { label: 'On-Time Completion', value: stats.onTimeRate === null ? 'N/A' : `${stats.onTimeRate}%`, color: 'text-orange-600 dark:text-orange-400' },
                    { label: 'Avg. Days to Complete', value: stats.avgDaysToComplete === null ? 'N/A' : String(stats.avgDaysToComplete), color: 'text-purple-600 dark:text-purple-400' }
                ];

                const groups = ([...STATUS_GROUPS, 'Other'] as StatusGroup[]).filter((g) => stats.byStatus[g] > 0);
                this.statusChartData = {
                    labels: groups,
                    datasets: [{ data: groups.map((g) => stats.byStatus[g]), backgroundColor: groups.map((g) => STATUS_COLORS[g]) }]
                };
                this.typeChartData = {
                    labels: stats.byType.map((t) => t.type),
                    datasets: [
                        { label: 'Open', data: stats.byType.map((t) => t.open), backgroundColor: '#3b82f6' },
                        { label: 'Completed', data: stats.byType.map((t) => t.completed), backgroundColor: '#14b8a6' }
                    ]
                };
                this.loading = false;
            });
    }

    private initChartOptions(): void {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        this.doughnutOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: textColor, usePointStyle: true, padding: 16, font: { size: 12 } } }
            }
        };

        this.barOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: textColor, usePointStyle: true, font: { size: 12 } } }
            },
            scales: {
                x: { stacked: true, ticks: { color: textColorSecondary, font: { weight: 500 } }, grid: { display: false, drawBorder: false } },
                y: { stacked: true, ticks: { color: textColorSecondary, precision: 0 }, grace: '10%', grid: { color: surfaceBorder, drawBorder: false } }
            }
        };
    }
}
