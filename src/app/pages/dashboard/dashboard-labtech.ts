import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UIChart } from 'primeng/chart';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { CalendarService } from '../service/calendar.service';
import Swal from 'sweetalert2';
let eventGuid = 0;
const TODAY_STR = new Date().toISOString().replace(/T.*$/, '');

export const INITIAL_EVENTS = [
    { id: String(eventGuid++), title: 'All-day event', start: TODAY_STR },
    { id: String(eventGuid++), title: 'Timed event', start: TODAY_STR + 'T12:00:00' }
];

export function createEventId() {
    return String(eventGuid++);
}

@Component({
    selector: 'app-dashboard-labtech',
    standalone: true,
    imports: [CommonModule, UIChart, FullCalendarModule],
    template: `
        <div class="p-6">
            <!-- Top Section: Cards and Calendar -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Left Side: Stats Cards -->
                <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Overdue Approvals Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Overdue Approvals</p>
                                <h3 class="text-4xl font-bold text-red-600 dark:text-red-400 mt-2">{{ overdueApprovalsCount }}</h3>
                            </div>
                            <div class="bg-red-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-clock text-2xl text-red-600 dark:text-red-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Requests For Approval Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Requests For Approval</p>
                                <h3 class="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{{ requestsForApprovalCount }}</h3>
                            </div>
                            <div class="bg-blue-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-check-square text-2xl text-blue-600 dark:text-blue-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- In Progress Maintenance Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">In Progress</p>
                                <h3 class="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">{{ inProgressCount }}</h3>
                            </div>
                            <div class="bg-green-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-play text-2xl text-green-600 dark:text-green-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- On Hold Maintenance Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">On Hold</p>
                                <h3 class="text-4xl font-bold text-orange-600 dark:text-orange-400 mt-2">{{ onHoldCount }}</h3>
                            </div>
                            <div class="bg-orange-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-pause text-2xl text-orange-600 dark:text-orange-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Line Chart for Requests by Service Type -->
                    <div class="md:col-span-2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <h4 class="text-lg font-semibold dark:text-white text-center mb-4">Requests by Service Type (Monthly)</h4>
                        <div style="height: 300px;">
                            <p-chart type="line" [data]="serviceTypeChartData" [options]="lineChartOptions"></p-chart>
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

            <!-- Bottom charts row -->
            <!-- <div class="flex flex-col md:flex-row gap-6 mt-6">
                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 h-96">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Assets by Supplier</h3>
                    <p-chart type="bar" [data]="assetsBySupplierChartData" [options]="barChartOptions"></p-chart>
                </div>

                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 h-96">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Assets by Brand</h3>
                    <p-chart type="bar" [data]="assetsByBrandChartData" [options]="horizontalChartOptions"></p-chart>
                </div>
            </div> -->

            <!-- Lab schedule charts row -->
            <div class="flex flex-col md:flex-row gap-6 mt-6">
                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 h-96">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Schedules by Day</h3>
                    <p-chart type="bar" [data]="scheduleByDayChartData" [options]="barChartOptions"></p-chart>
                </div>

                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 h-96">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Schedules by Laboratory</h3>
                    <p-chart type="bar" [data]="scheduleByLabChartData" [options]="horizontalChartOptions"></p-chart>
                </div>
            </div>

            <!-- Assets and Maintenance by Laboratory charts row -->
            <div class="flex flex-col md:flex-row gap-6 mt-6">
                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 h-96">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Assets by Laboratory</h3>
                    <p-chart type="bar" [data]="assetsByLabChartData" [options]="horizontalChartOptions"></p-chart>
                </div>

                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 h-96">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Maintenance Requests by Laboratory</h3>
                    <p-chart type="bar" [data]="maintenanceByLabChartData" [options]="horizontalChartOptions"></p-chart>
                </div>
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

            /* Event title truncation with ellipsis */
            :host ::ng-deep .fc-event-title,
            :host ::ng-deep .fc .fc-event-title {
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                max-width: 100% !important;
                display: block !important;
            }

            :host ::ng-deep .fc-event,
            :host ::ng-deep .fc .fc-event {
                cursor: pointer;
                border-radius: 4px;
                padding: 2px 4px;
            }

            :host ::ng-deep .fc-daygrid-event,
            :host ::ng-deep .fc .fc-daygrid-event {
                white-space: nowrap !important;
                overflow: hidden !important;
            }

            :host ::ng-deep .fc-daygrid-event-harness,
            :host ::ng-deep .fc .fc-daygrid-event-harness {
                overflow: hidden !important;
            }

            :host ::ng-deep .fc-event-main,
            :host ::ng-deep .fc .fc-event-main {
                overflow: hidden !important;
            }
        `
    ]
})
export class DashboardLabTech implements OnInit {
    overdueApprovalsCount: number = 0;
    requestsForApprovalCount: number = 0;
    inProgressCount: number = 0;
    onHoldCount: number = 0;
    serviceTypeChartData: any;
    donutChartOptions: any;
    lineChartOptions: any;
    assetsBySupplierChartData: any;
    assetsByBrandChartData: any;
    barChartOptions: any;
    horizontalChartOptions: any;
    scheduleByDayChartData: any;
    scheduleByLabChartData: any;
    assetsByLabChartData: any;
    maintenanceByLabChartData: any;

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
        views: {
            dayGridMonth: {
                displayEventTime: false
            }
        },
        select: this.handleDateSelect.bind(this),
        eventClick: this.handleEventClick.bind(this),
        eventsSet: this.handleEvents.bind(this),
        eventContent: (arg) => {
            const view = arg.view.type;
            const props = arg.event.extendedProps;
            const ellipsisStyle = 'width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;';

            // For Month view, show simplified text with ellipsis
            if (view === 'dayGridMonth') {
                if (props['type'] === 'schedule') {
                    // Show only subject
                    return { html: `<div style="${ellipsisStyle}">${props['subject'] || 'N/A'}</div>` };
                } else if (props['type'] === 'maintenance') {
                    // Show only maintenanceType
                    return { html: `<div style="${ellipsisStyle}">${props['maintenanceType'] || 'Maintenance'}</div>` };
                } else if (props['type'] === 'masterplan') {
                    // Show maintenance type and equipment for master plan
                    return { html: `<div style="${ellipsisStyle}">${props['maintenanceType']} - ${props['equipment'] || 'Equipment'}</div>` };
                } else if (props['type'] === 'custom') {
                    // Show title for custom events
                    return { html: `<div style="${ellipsisStyle}">${arg.event.title}</div>` };
                }
            }
            // For other views (Week, Day, List), use default title with ellipsis
            return { html: `<div style="${ellipsisStyle}">${arg.event.title}</div>` };
        }
    });
    currentEvents = signal<EventApi[]>([]);

    constructor(
        private http: HttpClient,
        private changeDetector: ChangeDetectorRef,
        private calendarService: CalendarService
    ) {}

    ngOnInit() {
        this.loadOverdueApprovalsCount();
        this.loadRequestsForApprovalCount();
        this.loadInProgressCount();
        this.loadOnHoldCount();
        this.loadServiceTypeData();
        this.loadCalendarEvents();
        this.initDonutOptions();
        this.loadAssetsBySupplier();
        this.loadAssetsByBrand();
        this.initBarOptions();
        this.initHorizontalBarOptions();
        this.loadScheduleCharts(); // Changed from initMockScheduleCharts
        this.loadAssetsByLaboratory();
        this.loadMaintenanceByLaboratory();
    }

    loadOverdueApprovalsCount() {
        const apiUrl = `${environment.apiUrl}/maintenance-approvals/count-overdue`;
        this.http.get<number>(apiUrl).subscribe({
            next: (count) => {
                this.overdueApprovalsCount = count;
            },
            error: (error) => {
                console.error('Error loading overdue approvals count:', error);
            }
        });
    }

    loadRequestsForApprovalCount() {
        const apiUrl = `${environment.apiUrl}/maintenance-requests/count-for-approval`;
        this.http.get<number>(apiUrl).subscribe({
            next: (count) => {
                this.requestsForApprovalCount = count;
            },
            error: (error) => {
                console.error('Error loading requests for approval count:', error);
            }
        });
    }

    loadInProgressCount() {
        const apiUrl = `${environment.apiUrl}/maintenance-approvals`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (approvals) => {
                this.inProgressCount = approvals.filter((a) => a.maintenanceRequest?.maintenanceStatus?.requestStatusName === 'In Progress').length;
            },
            error: (error) => {
                console.error('Error loading in progress count:', error);
            }
        });
    }

    loadOnHoldCount() {
        const apiUrl = `${environment.apiUrl}/maintenance-approvals`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (approvals) => {
                this.onHoldCount = approvals.filter((a) => a.maintenanceRequest?.maintenanceStatus?.requestStatusName === 'On Hold').length;
            },
            error: (error) => {
                console.error('Error loading on hold count:', error);
            }
        });
    }

    loadServiceTypeData() {
        // Get maintenance approvals which include the maintenance type
        const apiUrl = `${environment.apiUrl}/maintenance-approvals`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (approvals) => {
                console.log('=== MAINTENANCE APPROVALS DATA ===');
                console.log('Total approvals:', approvals.length);
                console.log('Sample approval:', approvals[0]);

                const currentYear = new Date().getFullYear();
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                // Group by service type and month
                const serviceTypeMap = new Map<string, number[]>();

                approvals.forEach((approval, index) => {
                    // Extract service type from maintenanceRequest.maintenanceType.maintenanceTypeName
                    const serviceType = approval.maintenanceRequest?.maintenanceType?.maintenanceTypeName || 'Unknown';

                    // Log first 3 approvals to debug
                    if (index < 3) {
                        console.log(`Approval ${index}:`, {
                            maintenanceType: approval.maintenanceRequest?.maintenanceType,
                            resolvedType: serviceType
                        });
                    }

                    // Use requestDate from maintenanceRequest
                    const createdDate = new Date(approval.maintenanceRequest?.requestDate || approval.approvedAt);

                    if (createdDate.getFullYear() === currentYear) {
                        const monthIndex = createdDate.getMonth();

                        if (!serviceTypeMap.has(serviceType)) {
                            serviceTypeMap.set(serviceType, new Array(12).fill(0));
                        }

                        const monthlyCounts = serviceTypeMap.get(serviceType)!;
                        monthlyCounts[monthIndex]++;
                    }
                });

                console.log('Service type map:', Array.from(serviceTypeMap.entries()));

                // Generate colors for each service type
                const colorPalette = [
                    { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(59, 130, 246)' }, // Blue
                    { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgb(16, 185, 129)' }, // Green
                    { bg: 'rgba(251, 146, 60, 0.8)', border: 'rgb(251, 146, 60)' }, // Orange
                    { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(168, 85, 247)' }, // Purple
                    { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(236, 72, 153)' }, // Pink
                    { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgb(245, 158, 11)' } // Amber
                ];

                // Create datasets for each service type
                const datasets = Array.from(serviceTypeMap.entries()).map(([serviceType, data], index) => ({
                    label: serviceType,
                    data: data,
                    borderColor: colorPalette[index % colorPalette.length].border,
                    backgroundColor: colorPalette[index % colorPalette.length].bg,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }));

                this.serviceTypeChartData = {
                    labels: months,
                    datasets: datasets
                };
            },
            error: (error) => {
                console.error('Error loading service type monthly data:', error);
                // Initialize with empty data
                this.serviceTypeChartData = {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: []
                };
            }
        });
    }

    loadAssetsBySupplier() {
        const apiUrl = `${environment.apiUrl}/assets/by-supplier`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.supplierName || item.supplier || 'Unknown');
                const counts = data.map((item) => item.count || item.assetCount || 0);
                const colors = this.generateColors(labels.length);

                this.assetsBySupplierChartData = {
                    labels,
                    datasets: [
                        {
                            label: 'Assets',
                            data: counts,
                            backgroundColor: colors.map((c) => c.bg),
                            borderColor: colors.map((c) => c.border),
                            borderWidth: 1
                        }
                    ]
                };
            },
            error: (error) => {
                console.error('Error loading assets by supplier:', error);
            }
        });
    }

    loadAssetsByBrand() {
        const apiUrl = `${environment.apiUrl}/assets/by-brand`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.brandName || item.brand || 'Unknown');
                const counts = data.map((item) => item.count || item.assetCount || 0);
                const colors = this.generateColors(labels.length);

                this.assetsByBrandChartData = {
                    labels,
                    datasets: [
                        {
                            label: 'Assets',
                            data: counts,
                            backgroundColor: colors.map((c) => c.bg),
                            borderColor: colors.map((c) => c.border),
                            borderWidth: 1
                        }
                    ]
                };
            },
            error: (error) => {
                console.error('Error loading assets by brand:', error);
            }
        });
    }

    initDonutOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');

        this.donutChartOptions = {
            maintainAspectRatio: false,
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
                            return `${context.label}: ${context.parsed}`;
                        }
                    }
                }
            }
        };

        this.lineChartOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context: any) {
                            return `${context.dataset.label}: ${context.parsed.y} requests`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColor,
                        font: { weight: 500 }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: textColor,
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    beginAtZero: true
                }
            }
        };
    }

    initBarOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        this.barChartOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                        font: { weight: 500 }
                    },
                    grid: { display: false, drawBorder: false }
                },
                y: {
                    ticks: { color: textColorSecondary },
                    grid: { color: surfaceBorder, drawBorder: false }
                }
            }
        };
    }

    initHorizontalBarOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        this.horizontalChartOptions = {
            indexAxis: 'y',
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                        font: { weight: 500 }
                    },
                    grid: { color: surfaceBorder, drawBorder: false }
                },
                y: {
                    ticks: { color: textColorSecondary },
                    grid: { display: false, drawBorder: false }
                }
            }
        };
    }

    loadScheduleCharts() {
        console.log('=== LOADING SCHEDULE CHARTS DATA ===');

        // First, fetch all laboratories
        const laboratoriesUrl = `${environment.apiUrl}/laboratories`;

        this.http.get<any[]>(laboratoriesUrl).subscribe({
            next: (labs) => {
                console.log('Laboratories fetched:', labs?.length || 0);

                if (!labs || labs.length === 0) {
                    console.log('No laboratories found');
                    this.initEmptyScheduleCharts();
                    return;
                }

                // Fetch schedules for all laboratories
                const scheduleRequests = labs.map((lab) => this.http.get<any[]>(`${environment.apiUrl}/laboratories/${lab.laboratoryId}/schedules`));

                // Wait for all schedule requests to complete
                const allSchedules: any[] = [];
                let completedRequests = 0;

                scheduleRequests.forEach((request, index) => {
                    request.subscribe({
                        next: (schedules) => {
                            if (schedules && schedules.length > 0) {
                                allSchedules.push(...schedules);
                            }
                            completedRequests++;

                            // When all requests are done, process the data
                            if (completedRequests === scheduleRequests.length) {
                                console.log('Total schedules fetched:', allSchedules.length);
                                console.log('Sample schedule:', allSchedules[0]);

                                if (allSchedules.length > 0) {
                                    const dayCount = this.countSchedulesByDay(allSchedules);
                                    this.populateScheduleByDayChart(dayCount);

                                    const labCount = this.countSchedulesByLaboratory(allSchedules);
                                    this.populateScheduleByLabChart(labCount);
                                } else {
                                    this.initEmptyScheduleCharts();
                                }

                                console.log('===================================');
                            }
                        },
                        error: (error) => {
                            console.error(`Error loading schedules for lab ${index}:`, error);
                            completedRequests++;

                            if (completedRequests === scheduleRequests.length) {
                                console.log('Total schedules fetched:', allSchedules.length);
                                if (allSchedules.length > 0) {
                                    const dayCount = this.countSchedulesByDay(allSchedules);
                                    this.populateScheduleByDayChart(dayCount);

                                    const labCount = this.countSchedulesByLaboratory(allSchedules);
                                    this.populateScheduleByLabChart(labCount);
                                } else {
                                    this.initEmptyScheduleCharts();
                                }
                                console.log('===================================');
                            }
                        }
                    });
                });
            },
            error: (error) => {
                console.error('Error loading laboratories for schedule charts:', error);
                this.initEmptyScheduleCharts();
            }
        });
    }

    countSchedulesByDay(schedules: any[]): Map<string, number> {
        const dayCount = new Map<string, number>();
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Initialize all days with 0
        daysOrder.forEach((day) => dayCount.set(day, 0));

        // Count schedules by day
        schedules.forEach((schedule) => {
            const day = schedule.dayOfWeek || schedule.day;
            if (day) {
                const currentCount = dayCount.get(day) || 0;
                dayCount.set(day, currentCount + 1);
            }
        });

        console.log('Schedule count by day:', Object.fromEntries(dayCount));
        return dayCount;
    }

    countSchedulesByLaboratory(schedules: any[]): Map<string, number> {
        const labCount = new Map<string, number>();

        schedules.forEach((schedule) => {
            // Handle different laboratory property formats
            const labName = schedule.laboratory?.laboratoryName || schedule.laboratory?.labName || schedule.laboratoryName || 'Unknown Lab';

            const currentCount = labCount.get(labName) || 0;
            labCount.set(labName, currentCount + 1);
        });

        console.log('Schedule count by laboratory:', Object.fromEntries(labCount));
        return labCount;
    }

    populateScheduleByDayChart(dayCount: Map<string, number>) {
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayCounts = fullDays.map((day) => dayCount.get(day) || 0);
        const dayColors = this.generateColors(dayLabels.length);

        this.scheduleByDayChartData = {
            labels: dayLabels,
            datasets: [
                {
                    label: 'Schedules',
                    data: dayCounts,
                    backgroundColor: dayColors.map((c) => c.bg),
                    borderColor: dayColors.map((c) => c.border),
                    borderWidth: 1
                }
            ]
        };
    }

    populateScheduleByLabChart(labCount: Map<string, number>) {
        // Convert map to arrays and sort by count (descending)
        const labEntries = Array.from(labCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10 laboratories

        const labLabels = labEntries.map((entry) => entry[0]);
        const labCounts = labEntries.map((entry) => entry[1]);
        const labColors = this.generateColors(labLabels.length);

        this.scheduleByLabChartData = {
            labels: labLabels,
            datasets: [
                {
                    label: 'Schedules',
                    data: labCounts,
                    backgroundColor: labColors.map((c) => c.bg),
                    borderColor: labColors.map((c) => c.border),
                    borderWidth: 1
                }
            ]
        };
    }

    initEmptyScheduleCharts() {
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayColors = this.generateColors(dayLabels.length);

        this.scheduleByDayChartData = {
            labels: dayLabels,
            datasets: [
                {
                    label: 'Schedules',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: dayColors.map((c) => c.bg),
                    borderColor: dayColors.map((c) => c.border),
                    borderWidth: 1
                }
            ]
        };

        this.scheduleByLabChartData = {
            labels: ['No Data'],
            datasets: [
                {
                    label: 'Schedules',
                    data: [0],
                    backgroundColor: ['rgba(209, 213, 219, 0.7)'],
                    borderColor: ['rgb(209, 213, 219)'],
                    borderWidth: 1
                }
            ]
        };
    }

    initMockScheduleCharts() {
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts = [6, 8, 7, 5, 9, 3];
        const dayColors = this.generateColors(dayLabels.length);

        this.scheduleByDayChartData = {
            labels: dayLabels,
            datasets: [
                {
                    label: 'Schedules',
                    data: dayCounts,
                    backgroundColor: dayColors.map((c) => c.bg),
                    borderColor: dayColors.map((c) => c.border),
                    borderWidth: 1
                }
            ]
        };

        const labLabels = ['Chem Lab', 'Physics Lab', 'CS Lab', 'Bio Lab'];
        const labCounts = [10, 7, 12, 5];
        const labColors = this.generateColors(labLabels.length);

        this.scheduleByLabChartData = {
            labels: labLabels,
            datasets: [
                {
                    label: 'Schedules',
                    data: labCounts,
                    backgroundColor: labColors.map((c) => c.bg),
                    borderColor: labColors.map((c) => c.border),
                    borderWidth: 1
                }
            ]
        };
    }

    loadAssetsByLaboratory() {
        console.log('=== LOADING ASSETS BY LABORATORY DATA ===');
        const apiUrl = `${environment.apiUrl}/assets`;

        this.http.get<any[]>(apiUrl).subscribe({
            next: (assets) => {
                console.log('Assets fetched:', assets?.length || 0);

                if (!assets || assets.length === 0) {
                    console.log('No assets found');
                    this.initEmptyAssetsByLabChart();
                    return;
                }

                // Count assets by laboratory
                const labCount = new Map<string, number>();
                assets.forEach((asset) => {
                    const labName = asset.laboratories?.laboratoryName || asset.laboratory?.laboratoryName || asset.laboratory?.labName || 'Unknown Lab';
                    const currentCount = labCount.get(labName) || 0;
                    labCount.set(labName, currentCount + 1);
                });

                console.log('Asset count by laboratory:', Object.fromEntries(labCount));

                // Convert to arrays and sort by count (descending)
                const labEntries = Array.from(labCount.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10); // Top 10 laboratories

                const labLabels = labEntries.map((entry) => entry[0]);
                const labCounts = labEntries.map((entry) => entry[1]);
                const labColors = this.generateColors(labLabels.length);

                this.assetsByLabChartData = {
                    labels: labLabels,
                    datasets: [
                        {
                            label: 'Assets',
                            data: labCounts,
                            backgroundColor: labColors.map((c) => c.bg),
                            borderColor: labColors.map((c) => c.border),
                            borderWidth: 1
                        }
                    ]
                };

                console.log('=========================================');
            },
            error: (error) => {
                console.error('Error loading assets by laboratory:', error);
                this.initEmptyAssetsByLabChart();
            }
        });
    }

    loadMaintenanceByLaboratory() {
        console.log('=== LOADING MAINTENANCE REQUESTS BY LABORATORY DATA ===');
        const apiUrl = `${environment.apiUrl}/maintenance-requests`;

        this.http.get<any[]>(apiUrl).subscribe({
            next: (requests) => {
                console.log('Maintenance requests fetched:', requests?.length || 0);

                if (!requests || requests.length === 0) {
                    console.log('No maintenance requests found');
                    this.initEmptyMaintenanceByLabChart();
                    return;
                }

                // Count maintenance requests by laboratory
                const labCount = new Map<string, number>();
                requests.forEach((request) => {
                    const labName =
                        request.asset?.laboratories?.laboratoryName || request.asset?.laboratory?.laboratoryName || request.asset?.laboratory?.labName || request.laboratories?.laboratoryName || request.laboratory?.laboratoryName || 'Unknown Lab';
                    const currentCount = labCount.get(labName) || 0;
                    labCount.set(labName, currentCount + 1);
                });

                console.log('Maintenance request count by laboratory:', Object.fromEntries(labCount));

                // Convert to arrays and sort by count (descending)
                const labEntries = Array.from(labCount.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10); // Top 10 laboratories

                const labLabels = labEntries.map((entry) => entry[0]);
                const labCounts = labEntries.map((entry) => entry[1]);
                const labColors = this.generateColors(labLabels.length);

                this.maintenanceByLabChartData = {
                    labels: labLabels,
                    datasets: [
                        {
                            label: 'Maintenance Requests',
                            data: labCounts,
                            backgroundColor: labColors.map((c) => c.bg),
                            borderColor: labColors.map((c) => c.border),
                            borderWidth: 1
                        }
                    ]
                };

                console.log('========================================================');
            },
            error: (error) => {
                console.error('Error loading maintenance requests by laboratory:', error);
                this.initEmptyMaintenanceByLabChart();
            }
        });
    }

    initEmptyAssetsByLabChart() {
        this.assetsByLabChartData = {
            labels: ['No Data'],
            datasets: [
                {
                    label: 'Assets',
                    data: [0],
                    backgroundColor: ['rgba(209, 213, 219, 0.7)'],
                    borderColor: ['rgb(209, 213, 219)'],
                    borderWidth: 1
                }
            ]
        };
    }

    initEmptyMaintenanceByLabChart() {
        this.maintenanceByLabChartData = {
            labels: ['No Data'],
            datasets: [
                {
                    label: 'Maintenance Requests',
                    data: [0],
                    backgroundColor: ['rgba(209, 213, 219, 0.7)'],
                    borderColor: ['rgb(209, 213, 219)'],
                    borderWidth: 1
                }
            ]
        };
    }

    generateColors(count: number): Array<{ bg: string; border: string }> {
        const palette = [
            { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' }, // Blue
            { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' }, // Green
            { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' }, // Red
            { bg: 'rgba(250, 204, 21, 0.7)', border: 'rgb(250, 204, 21)' }, // Amber
            { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgb(168, 85, 247)' }, // Purple
            { bg: 'rgba(14, 165, 233, 0.7)', border: 'rgb(14, 165, 233)' }, // Sky
            { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' }, // Pink
            { bg: 'rgba(6, 182, 212, 0.7)', border: 'rgb(6, 182, 212)' }, // Cyan
            { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgb(139, 92, 246)' }, // Violet
            { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' } // Gold
        ];

        const colors: Array<{ bg: string; border: string }> = [];
        for (let i = 0; i < count; i++) {
            colors.push(palette[i % palette.length]);
        }
        return colors;
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

    // Calendar event handlers
    handleDateSelect(selectInfo: DateSelectArg) {
        const calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();

        // Log the selected date
        console.log('Selected Date:', selectInfo.start);
        console.log('Selected Date (ISO):', selectInfo.start.toISOString());
        console.log('Selected Date (Locale):', selectInfo.start.toLocaleString());

        Swal.fire({
            title: 'Add New Event',
            html: `
                <input id="event-title" class="swal2-input" placeholder="Event Title" style="width: 85%;">
                <textarea id="event-description" class="swal2-textarea" placeholder="Description (optional)" style="width: 85%; height: 80px;"></textarea>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Add Event',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const title = (document.getElementById('event-title') as HTMLInputElement).value;
                const description = (document.getElementById('event-description') as HTMLTextAreaElement).value;

                if (!title) {
                    Swal.showValidationMessage('Please enter an event title');
                    return false;
                }
                return { title, description };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                // Show loading
                Swal.fire({
                    title: 'Saving...',
                    text: 'Please wait while we save your event.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Call API to save event
                const apiUrl = `${environment.apiUrl}/calendar/events`;
                this.http
                    .post<any>(apiUrl, {
                        title: result.value.title,
                        description: result.value.description || '',
                        eventDate: selectInfo.start.toISOString()
                    })
                    .subscribe({
                        next: (response: any) => {
                            // Reload calendar events from backend
                            this.loadCalendarEvents();

                            Swal.fire({
                                icon: 'success',
                                title: 'Event Added!',
                                text: 'Your event has been saved to the calendar.',
                                timer: 2000,
                                showConfirmButton: false
                            });
                        },
                        error: (error) => {
                            console.error('Error saving event:', error);
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'Failed to save event. Please try again.',
                                confirmButtonText: 'OK'
                            });
                        }
                    });
            }
        });
    }

    handleEventClick(clickInfo: EventClickArg) {
        const event = clickInfo.event;
        const props = event.extendedProps;

        if (props['type'] === 'custom') {
            // Custom manually added event
            Swal.fire({
                title: '<strong>Custom Event</strong>',
                icon: 'info',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p><strong>Title:</strong> ${event.title}</p>
                        <p><strong>Description:</strong> ${props['description'] || 'No description'}</p>
                        <p><strong>Created By:</strong> ${props['createdBy'] || 'Unknown'}</p>
                        <p><strong>Date:</strong> ${new Date(event.start!).toLocaleString()}</p>
                        ${event.end ? `<p><strong>End:</strong> ${new Date(event.end).toLocaleString()}</p>` : ''}
                    </div>
                `,
                showDenyButton: true,
                confirmButtonText: 'Close',
                denyButtonText: 'Delete Event',
                customClass: {
                    popup: 'swal-wide'
                }
            }).then((result) => {
                if (result.isDenied) {
                    Swal.fire({
                        title: 'Delete Event?',
                        text: 'Are you sure you want to delete this event?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, delete it',
                        cancelButtonText: 'Cancel'
                    }).then((deleteConfirm) => {
                        if (deleteConfirm.isConfirmed) {
                            clickInfo.event.remove();
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: 'Event has been deleted.',
                                timer: 2000,
                                showConfirmButton: false
                            });
                        }
                    });
                }
            });
        } else if (props['type'] === 'maintenance') {
            const priorityColor = props['priority'] === 'High' ? 'red' : props['priority'] === 'Medium' ? 'orange' : 'green';
            Swal.fire({
                title: '<strong>Maintenance Assignment</strong>',
                icon: 'warning',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p><strong>Equipment:</strong> ${props['equipment'] || 'N/A'}</p>
                        <p><strong>Type:</strong> ${props['maintenanceType'] || 'N/A'}</p>
                        <p><strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${props['priority'] || 'N/A'}</span></p>
                        <p><strong>Status:</strong> ${props['status'] || 'N/A'}</p>
                        <p><strong>Building:</strong> ${props['location'] || 'N/A'}</p>
                        <p><strong>Requested By:</strong> ${props['requestedBy'] || 'N/A'}</p>
                        <p><strong>Assigned To:</strong> ${props['assignedTo'] || 'Not Assigned'}</p>
                        <p><strong>Description:</strong> ${props['description'] || 'No description'}</p>
                        <p><strong>Scheduled Date:</strong> ${new Date(event.start!).toLocaleString()}</p>
                    </div>
                `,
                confirmButtonText: 'Close',
                customClass: {
                    popup: 'swal-wide'
                }
            });
        }
    }

    handleEvents(events: EventApi[]) {
        this.currentEvents.set(events);
    }
}
