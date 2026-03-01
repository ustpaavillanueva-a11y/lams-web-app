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
import { CalendarService } from '../service/calendar.service';

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
    selector: 'app-dashboard-superadmin',
    standalone: true,
    imports: [CommonModule, UIChart, TableModule, FullCalendarModule],
    template: `
        <div class="p-6">
            <!-- Top Row: Campuses, Users, and Calendar -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Left Side: Stats Cards -->
                <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Total Campuses Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Campuses</p>
                                <h3 class="text-4xl font-bold text-primary dark:text-primary mt-2">{{ campusCount }}</h3>
                            </div>
                            <div class="bg-primary bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-building text-2xl text-primary"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Total Users Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Users</p>
                                <h3 class="text-4xl font-bold text-green-600 dark:text-green-500 mt-2">{{ userCount }}</h3>
                            </div>
                            <div class="bg-green-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-users text-2xl text-green-600 dark:text-green-500"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Total Assets Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Assets</p>
                                <h3 class="text-4xl font-bold text-blue-600 dark:text-blue-500 mt-2">{{ assetCount }}</h3>
                            </div>
                            <div class="bg-blue-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-box text-2xl text-blue-600 dark:text-blue-500"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Total Laboratories Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Laboratories</p>
                                <h3 class="text-4xl font-bold text-orange-600 dark:text-orange-500 mt-2">{{ laboratoryCount }}</h3>
                            </div>
                            <div class="bg-orange-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-desktop text-2xl text-orange-600 dark:text-orange-500"></i>
                            </div>
                        </div>
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

            <div class="flex gap-6 mt-6">
                <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 flex-1">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Assets by Campus</h3>
                    <p-chart type="bar" [data]="assetsByCampusChartData" [options]="chartOptions"></p-chart>
                </div>

                <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 flex-1">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Maintenance Requests by Campus</h3>
                    <p-chart type="bar" [data]="maintenanceRequestsChartData" [options]="getHorizontalChartOptions()"></p-chart>
                </div>
            </div>

            <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 mt-6">
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
        `
    ]
})
export class DashboardSuperAdmin implements OnInit {
    calendarVisible = signal(true);
    currentEvents = signal<EventApi[]>([]);
    calendarOptions = signal<CalendarOptions>({
        plugins: [interactionPlugin, dayGridPlugin, timeGridPlugin, listPlugin],
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        initialView: 'dayGridMonth',
        initialEvents: INITIAL_EVENTS, // alternatively, use the `events` setting to fetch from a feed
        weekends: true,
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        select: this.handleDateSelect.bind(this),
        eventClick: this.handleEventClick.bind(this),
        eventsSet: this.handleEvents.bind(this)
        /* you can update a remote database when these fire:
    eventAdd:
    eventChange:
    eventRemove:
    */
    });

    //////////////// Dashboard Data Properties ///////////
    campusCount: number = 0;
    userCount: number = 0;
    assetCount: number = 0;
    laboratoryCount: number = 0;
    assetsByCampusChartData: any;
    maintenanceRequestsChartData: any;
    chartOptions: any;
    activities: any[] = [];
    // handleDateSelect: any;
    // handleEventClick: any;

    constructor(
        private http: HttpClient,
        private changeDetector: ChangeDetectorRef,
        private calendarService: CalendarService
    ) {}

    ngOnInit() {
        this.loadCampusCount();
        this.loadUserCount();
        this.loadAssetCount();
        this.loadLaboratoryCount();
        this.loadAssetsByCampus();
        this.loadMaintenanceRequestsByCampus();
        this.loadActivities();
        this.loadCalendarEvents();
        this.initChartOptions();
    }

    loadCampusCount() {
        const apiUrl = `${environment.apiUrl}/campuses/count/all`;
        this.http.get<number>(apiUrl).subscribe({
            next: (data) => {
                this.campusCount = data;
            },
            error: (error) => {
                console.error('Error loading campus count:', error);
            }
        });
    }

    loadUserCount() {
        const apiUrl = `${environment.apiUrl}/users/count/all`;
        this.http.get<number>(apiUrl).subscribe({
            next: (data) => {
                this.userCount = data;
            },
            error: (error) => {
                console.error('Error loading user count:', error);
            }
        });
    }

    loadAssetCount() {
        const apiUrl = `${environment.apiUrl}/assets/count/all`;
        this.http.get<number>(apiUrl).subscribe({
            next: (data) => {
                this.assetCount = data;
            },
            error: (error) => {
                console.error('Error loading asset count:', error);
            }
        });
    }

    loadLaboratoryCount() {
        const apiUrl = `${environment.apiUrl}/laboratories/count/all`;
        this.http.get<number>(apiUrl).subscribe({
            next: (data) => {
                this.laboratoryCount = data;
            },
            error: (error) => {
                console.error('Error loading laboratory count:', error);
            }
        });
    }

    loadAssetsByCampus() {
        const apiUrl = `${environment.apiUrl}/campuses/count/assets/by-campus`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.campusName || item.campus);
                const counts = data.map((item) => item.assetCount || item.count);
                const colors = this.generateColors(data.length);

                this.assetsByCampusChartData = {
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
                console.error('Error loading assets by campus:', error);
            }
        });
    }

    loadMaintenanceRequestsByCampus() {
        const apiUrl = `${environment.apiUrl}/assets/maintenance-requests-by-campus`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.campusName);
                const counts = data.map((item) => item.pendingRequests);
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
                console.error('Error loading maintenance requests by campus:', error);
            }
        });
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

    //// Load Calendar Events
    loadCalendarEvents() {
        this.calendarService.getCalendarEvents().subscribe({
            next: (events) => {
                this.calendarOptions.update((options) => ({
                    ...options,
                    events: events.map((event) => ({
                        id: event.id,
                        title: event.title,
                        start: event.start,
                        end: event.end,
                        extendedProps: event.extendedProps,
                        backgroundColor: event.extendedProps.color,
                        borderColor: event.extendedProps.color
                    }))
                }));
                this.changeDetector.detectChanges();
            },
            error: (error) => {
                console.error('Error loading calendar events:', error);
            }
        });
    }

    //// calendar functions

    handleCalendarToggle() {
        this.calendarVisible.update((bool) => !bool);
    }

    handleWeekendsToggle() {
        this.calendarOptions.update((options) => ({
            ...options,
            weekends: !options.weekends
        }));
    }

    handleDateSelect(selectInfo: DateSelectArg) {
        const title = prompt('Please enter a new title for your event');
        const calendarApi = selectInfo.view.calendar;

        calendarApi.unselect(); // clear date selection

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
        this.changeDetector.detectChanges(); // workaround for pressionChangedAfterItHasBeenCheckedError
    }
}
