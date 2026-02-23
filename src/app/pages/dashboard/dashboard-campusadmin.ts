import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UIChart } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';

const INITIAL_EVENTS = [
    {
        id: 'demo-event-1',
        title: 'Event 1',
        start: new Date().toISOString().split('T')[0],
        allDay: true
    }
];

function createEventId() {
    return String(Math.random());
}

@Component({
    selector: 'app-dashboard-campusadmin',
    standalone: true,
    imports: [CommonModule, UIChart, TableModule, FullCalendarModule],
    template: `
        <div class="p-6">
            <!-- Top Section: Cards and Calendar -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Left Side: Stats Cards -->
                <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Total Departments Card -->
                    <div class="stat-card stat-card-purple group">
                        <div class="stat-card-bg"></div>
                        <div class="stat-card-content">
                            <div class="stat-icon-wrapper stat-icon-purple">
                                <i class="pi pi-sitemap text-2xl"></i>
                            </div>
                            <div class="stat-info">
                                <p class="stat-label">Total Departments</p>
                                <h3 class="stat-value">{{ departmentCount }}</h3>
                            </div>
                        </div>
                        <div class="stat-decoration"></div>
                    </div>

                    <!-- Total Users Card -->
                    <div class="stat-card stat-card-green group">
                        <div class="stat-card-bg"></div>
                        <div class="stat-card-content">
                            <div class="stat-icon-wrapper stat-icon-green">
                                <i class="pi pi-users text-2xl"></i>
                            </div>
                            <div class="stat-info">
                                <p class="stat-label">Total Users</p>
                                <h3 class="stat-value">{{ userCount }}</h3>
                            </div>
                        </div>
                        <div class="stat-decoration"></div>
                    </div>

                    <!-- Total Laboratories Card -->
                    <div class="stat-card stat-card-blue group">
                        <div class="stat-card-bg"></div>
                        <div class="stat-card-content">
                            <div class="stat-icon-wrapper stat-icon-blue">
                                <i class="pi pi-desktop text-2xl"></i>
                            </div>
                            <div class="stat-info">
                                <p class="stat-label">Total Laboratories</p>
                                <h3 class="stat-value">{{ laboratoryCount }}</h3>
                            </div>
                        </div>
                        <div class="stat-decoration"></div>
                    </div>

                    <!-- Total Assets Card -->
                    <div class="stat-card stat-card-orange group">
                        <div class="stat-card-bg"></div>
                        <div class="stat-card-content">
                            <div class="stat-icon-wrapper stat-icon-orange">
                                <i class="pi pi-box text-2xl"></i>
                            </div>
                            <div class="stat-info">
                                <p class="stat-label">Total Assets</p>
                                <h3 class="stat-value">{{ assetCount }}</h3>
                            </div>
                        </div>
                        <div class="stat-decoration"></div>
                    </div>
                </div>

                <!-- Right Side: Calendar -->
                <div class="lg:col-span-2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Calendar</h3>
                    <full-calendar [options]="calendarOptions()">
                        <ng-template #eventContent let-arg>
                            <b>{{ arg.timeText }}</b>
                            <i>{{ arg.event.title }}</i>
                        </ng-template>
                    </full-calendar>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="flex gap-6 mt-6">
                <!-- Assets by Laboratory Chart -->
                <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 flex-1">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Assets by Laboratory</h3>
                    <p-chart type="bar" [data]="assetsByLaboratoryChartData" [options]="chartOptions"></p-chart>
                </div>

                <!-- Maintenance Requests by Laboratory Chart -->
                <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 flex-1">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Maintenance Requests by Laboratory</h3>
                    <p-chart type="bar" [data]="maintenanceRequestsChartData" [options]="getHorizontalChartOptions()"></p-chart>
                </div>
            </div>

            <!-- Donut Chart Row -->
            <div class="flex gap-6 mt-6">
                <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 flex-1">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white text-center">Maintenance Requests Status</h3>
                    <div class="flex justify-center">
                        <div class="w-80">
                            <p-chart type="doughnut" [data]="maintenanceStatusChartData" [options]="donutChartOptions"></p-chart>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Activity Table -->
            <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 mt-6 w-full">
                <h3 class="text-xl font-semibold mb-4 dark:text-white">Recent Activity</h3>
                <p-table
                    [value]="activities"
                    [rows]="5"
                    [paginator]="true"
                    [rowsPerPageOptions]="[5, 10, 20, 30]"
                    [rowHover]="true"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} activities"
                    [showCurrentPageReport]="true"
                    [tableStyle]="{ 'min-width': '100%' }"
                >
                    <ng-template pTemplate="header">
                        <tr>
                            <th style="min-width:15rem">Action Type</th>
                            <th style="min-width:20rem">Target Name</th>
                            <th style="min-width:18rem">Actor</th>
                            <th style="min-width:18rem">Timestamp</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-activity>
                        <tr>
                            <td>
                                <span class="px-3 py-1 rounded-full text-xs font-semibold" [ngClass]="getActionTypeClass(activity.actionType)">
                                    {{ activity.actionType }}
                                </span>
                            </td>
                            <td class="dark:text-white">{{ activity.targetName }}</td>
                            <td class="dark:text-white">{{ activity.actor?.firstName }} {{ activity.actor?.lastName }}</td>
                            <td class="dark:text-gray-400">{{ activity.timestamp | date: 'short' }}</td>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="4" class="text-center py-5 dark:text-gray-400">No activities found</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                display: block;
            }

            :host ::ng-deep .fc {
                max-width: 100%;
            }

            :host ::ng-deep .fc .fc-toolbar-title {
                font-size: 1em;
                font-weight: 300;
            }

            :host ::ng-deep .fc .fc-button {
                padding: 0.4rem 0.75rem;
                font-size: 0.8rem;
                background-color: var(--primary-color) !important;
                border-color: var(--primary-color) !important;
                color: var(--primary-contrast-color) !important;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            :host ::ng-deep .fc .fc-button:hover {
                background-color: var(--primary-600) !important;
                border-color: var(--primary-600) !important;
                transform: translateY(-1px);
                filter: brightness(0.75);
                color: #000000 !important;
            }

            :host ::ng-deep .fc .fc-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            :host ::ng-deep .fc .fc-button-active {
                background-color: var(--primary-800) !important;
                border-color: var(--primary-800) !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                color: #000000 !important;
            }

            :host ::ng-deep .fc .fc-button-group {
                gap: 2px;
            }

            :host ::ng-deep .fc .fc-toolbar {
                gap: 0.5rem;
            }

            /* Stat Card Styles */
            .stat-card {
                position: relative;
                overflow: hidden;
                border-radius: 1rem;
                padding: 1.5rem;
                min-height: 140px;
                transition: all 0.3s ease;
                cursor: pointer;
            }

            .stat-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            }

            .stat-card-bg {
                position: absolute;
                inset: 0;
                opacity: 1;
            }

            .stat-card-purple .stat-card-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }

            .stat-card-green .stat-card-bg {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            }

            .stat-card-blue .stat-card-bg {
                background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
            }

            .stat-card-orange .stat-card-bg {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }

            .stat-card-content {
                position: relative;
                z-index: 10;
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .stat-icon-wrapper {
                width: 60px;
                height: 60px;
                border-radius: 1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                color: white;
                transition: all 0.3s ease;
            }

            .stat-card:hover .stat-icon-wrapper {
                transform: scale(1.1) rotate(5deg);
            }

            .stat-info {
                flex: 1;
            }

            .stat-label {
                font-size: 0.875rem;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.85);
                margin-bottom: 0.25rem;
            }

            .stat-value {
                font-size: 2.5rem;
                font-weight: 700;
                color: white;
                line-height: 1;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }

            .stat-decoration {
                position: absolute;
                right: -30px;
                bottom: -30px;
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }

            .stat-card:hover .stat-decoration {
                transform: scale(1.2);
            }

            .stat-card::before {
                content: '';
                position: absolute;
                top: -50%;
                right: -50%;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.05);
            }
        `
    ]
})
export class DashboardCampusAdmin implements OnInit {
    departmentCount: number = 0;
    userCount: number = 0;
    laboratoryCount: number = 0;
    assetCount: number = 0;
    assetsByLaboratoryChartData: any;
    maintenanceRequestsChartData: any;
    maintenanceStatusChartData: any;
    chartOptions: any;
    donutChartOptions: any;
    activities: any[] = [];

    // Calendar properties
    calendarOptions = signal<CalendarOptions>({
        plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        initialView: 'dayGridMonth',
        initialEvents: INITIAL_EVENTS,
        weekends: true,
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        select: this.handleDateSelect.bind(this),
        eventClick: this.handleEventClick.bind(this),
        eventsSet: this.handleEvents.bind(this)
    });
    currentEvents = signal<EventApi[]>([]);

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.loadDepartmentCount();
        this.loadUserCount();
        this.loadLaboratoryCount();
        this.loadAssetCount();
        this.loadAssetsByLaboratory();
        this.loadMaintenanceRequestsByLaboratory();
        this.loadMaintenanceStatus();
        this.loadActivities();
        this.initChartOptions();
        this.initDonutChartOptions();
    }

    loadDepartmentCount() {
        const apiUrl = `${environment.apiUrl}/departments/count`;
        this.http.get<number>(apiUrl).subscribe({
            next: (data) => {
                this.departmentCount = data;
            },
            error: (error) => {
                console.error('Error loading department count:', error);
            }
        });
    }

    loadUserCount() {
        const apiUrl = `${environment.apiUrl}/users/count/by-campus`;
        this.http.get<number>(apiUrl).subscribe({
            next: (data) => {
                this.userCount = data;
            },
            error: (error) => {
                console.error('Error loading user count:', error);
            }
        });
    }

    loadLaboratoryCount() {
        const apiUrl = `${environment.apiUrl}/laboratories/count/by-campus`;
        this.http.get<number>(apiUrl).subscribe({
            next: (data) => {
                this.laboratoryCount = data;
            },
            error: (error) => {
                console.error('Error loading laboratory count:', error);
            }
        });
    }

    loadAssetCount() {
        const apiUrl = `${environment.apiUrl}/assets/count/by-campus`;
        this.http.get<number>(apiUrl).subscribe({
            next: (data) => {
                this.assetCount = data;
            },
            error: (error) => {
                console.error('Error loading asset count:', error);
            }
        });
    }

    loadAssetsByLaboratory() {
        const apiUrl = `${environment.apiUrl}/assets/assets-by-laboratory`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.laboratoryName);
                const counts = data.map((item) => item.assetCount);
                const colors = this.generateColors(data.length);

                this.assetsByLaboratoryChartData = {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Assets Count',
                            data: counts,
                            backgroundColor: colors.map((c) => c.bg),
                            borderColor: colors.map((c) => c.border),
                            borderWidth: 1
                        }
                    ]
                };
            },
            error: (error) => {
                console.error('Error loading assets by laboratory:', error);
            }
        });
    }

    generateColors(count: number): Array<{ bg: string; border: string }> {
        const colorPalette = [
            { bg: 'rgba(59, 130, 246, 0.6)', border: 'rgb(59, 130, 246)' }, // Blue
            { bg: 'rgba(34, 197, 94, 0.6)', border: 'rgb(34, 197, 94)' }, // Green
            { bg: 'rgba(239, 68, 68, 0.6)', border: 'rgb(239, 68, 68)' }, // Red
            { bg: 'rgba(168, 85, 247, 0.6)', border: 'rgb(168, 85, 247)' }, // Purple
            { bg: 'rgba(249, 115, 22, 0.6)', border: 'rgb(249, 115, 22)' }, // Orange
            { bg: 'rgba(14, 165, 233, 0.6)', border: 'rgb(14, 165, 233)' }, // Sky
            { bg: 'rgba(236, 72, 153, 0.6)', border: 'rgb(236, 72, 153)' }, // Pink
            { bg: 'rgba(6, 182, 212, 0.6)', border: 'rgb(6, 182, 212)' }, // Cyan
            { bg: 'rgba(139, 92, 246, 0.6)', border: 'rgb(139, 92, 246)' }, // Violet
            { bg: 'rgba(245, 158, 11, 0.6)', border: 'rgb(245, 158, 11)' } // Amber
        ];

        const colors: Array<{ bg: string; border: string }> = [];
        for (let i = 0; i < count; i++) {
            colors.push(colorPalette[i % colorPalette.length]);
        }
        return colors;
    }

    initChartOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        this.chartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                        font: {
                            weight: 500
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                }
            }
        };
    }

    loadMaintenanceRequestsByLaboratory() {
        const apiUrl = `${environment.apiUrl}/assets/maintenance-requests-by-laboratory`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.laboratoryName);
                const counts = data.map((item) => item.requestCount);
                const colors = this.generateColors(data.length);

                this.maintenanceRequestsChartData = {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Maintenance Requests',
                            data: counts,
                            backgroundColor: colors.map((c) => c.bg),
                            borderColor: colors.map((c) => c.border),
                            borderWidth: 1
                        }
                    ]
                };
            },
            error: (error) => {
                console.error('Error loading maintenance requests by laboratory:', error);
            }
        });
    }

    getHorizontalChartOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        return {
            indexAxis: 'y',
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                        font: {
                            weight: 500
                        }
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        };
    }

    loadMaintenanceStatus() {
        const apiUrl = `${environment.apiUrl}/assets/maintenance-requests-by-status`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.status);
                const counts = data.map((item) => item.count);
                const colors = [
                    'rgba(239, 68, 68, 0.8)', // Red for Pending
                    'rgba(34, 197, 94, 0.8)' // Green for Approved
                ];

                this.maintenanceStatusChartData = {
                    labels: labels,
                    datasets: [
                        {
                            data: counts,
                            backgroundColor: colors,
                            borderColor: ['rgb(239, 68, 68)', 'rgb(34, 197, 94)'],
                            borderWidth: 1
                        }
                    ]
                };
            },
            error: (error) => {
                console.error('Error loading maintenance status:', error);
            }
        });
    }

    initDonutChartOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');

        this.donutChartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context: any) {
                            return context.label + ': ' + context.parsed;
                        }
                    }
                }
            }
        };
    }

    loadActivities() {
        const apiUrl = `${environment.apiUrl}/activities`;
        this.http.get<any>(apiUrl).subscribe({
            next: (data) => {
                // Handle both array and object with activities property
                this.activities = Array.isArray(data) ? data : data?.activities || [];

                // Sort by timestamp descending (newest first)
                this.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            },
            error: (error) => {
                console.error('Error loading activities:', error);
            }
        });
    }

    getActionTypeClass(actionType: string): string {
        const classes: { [key: string]: string } = {
            ASSET_CREATED: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
            ASSET_UPDATED: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
            ASSET_DELETED: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
            USER_REGISTERED: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
            USER_UPDATED: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
            USER_DELETED: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
        };
        return classes[actionType] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }

    // Calendar event handlers
    handleDateSelect(selectInfo: DateSelectArg) {
        const title = prompt('Please enter a new title for your event');
        const calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();
        if (title) {
            calendarApi.addEvent({
                id: createEventId(),
                title,
                start: selectInfo.startStr,
                end: selectInfo.endStr,
                allDay: selectInfo.allDay
            });
        }
    }

    handleEventClick(clickInfo: EventClickArg) {
        if (confirm(`Are you sure you want to delete the event '${clickInfo.event.title}'`)) {
            clickInfo.event.remove();
        }
    }

    handleEvents(events: EventApi[]) {
        this.currentEvents.set(events);
    }
}
