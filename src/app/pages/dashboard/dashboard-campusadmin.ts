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
import Swal from 'sweetalert2';

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
                <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    <!-- Faculty Count Card -->
                    <div class="stat-card stat-card-indigo group">
                        <div class="stat-card-bg"></div>
                        <div class="stat-card-content">
                            <div class="stat-icon-wrapper stat-icon-indigo">
                                <i class="pi pi-user text-2xl"></i>
                            </div>
                            <div class="stat-info">
                                <p class="stat-label">Faculty</p>
                                <h3 class="stat-value">{{ facultyCount }}</h3>
                            </div>
                        </div>
                        <div class="stat-decoration"></div>
                    </div>

                    <!-- LabTech Count Card -->
                    <div class="stat-card stat-card-teal group">
                        <div class="stat-card-bg"></div>
                        <div class="stat-card-content">
                            <div class="stat-icon-wrapper stat-icon-teal">
                                <i class="pi pi-user-edit text-2xl"></i>
                            </div>
                            <div class="stat-info">
                                <p class="stat-label">Lab Technicians</p>
                                <h3 class="stat-value">{{ labTechCount }}</h3>
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

            <!-- Charts Row - 3 Charts Side by Side -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <!-- Assets by Laboratory Chart -->
                <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <p class="text-[20px] font-normal mb-3 text-gray-400 dark:text-gray-500">Assets by Laboratory</p>
                    <div class="relative" style="height: 300px;">
                        <p-chart type="bar" [data]="assetsByLaboratoryChartData" [options]="chartOptions"></p-chart>
                    </div>
                </div>

                <!-- Maintenance Requests by Laboratory Chart -->
                <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <p class="text-[20px] font-normal mb-3 text-gray-400 dark:text-gray-500">Maintenance Requests by Lab</p>
                    <div class="relative" style="height: 300px;">
                        <p-chart type="bar" [data]="maintenanceRequestsChartData" [options]="getHorizontalChartOptions()"></p-chart>
                    </div>
                </div>

                <!-- Maintenance Requests Status Chart -->
                <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <p class="text-[20px] font-normal mb-3 text-gray-400 dark:text-gray-500 text-center">Maintenance Status</p>
                    <div class="relative flex items-center justify-center" style="height: 300px;">
                        <p-chart type="doughnut" [data]="maintenanceStatusChartData" [options]="donutChartOptions"></p-chart>
                    </div>
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

            /* Stat Card Styles */
            .stat-card {
                position: relative;
                overflow: hidden;
                border-radius: 1rem;
                padding: 1rem;
                min-height: 100px;
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

            .stat-card-indigo .stat-card-bg {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            }

            .stat-card-teal .stat-card-bg {
                background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
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
    facultyCount: number = 0;
    labTechCount: number = 0;
    assetsByLaboratoryChartData: any;
    maintenanceRequestsChartData: any;
    maintenanceStatusChartData: any;
    chartOptions: any;
    donutChartOptions: any;

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
        this.loadDepartmentCount();
        this.loadUserCount();
        this.loadLaboratoryCount();
        this.loadAssetCount();
        this.loadUserRoleCounts();
        this.loadAssetsByLaboratory();
        this.loadMaintenanceRequestsByLaboratory();
        this.loadMaintenanceStatus();
        this.loadCalendarEvents();
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

    loadUserRoleCounts() {
        const apiUrl = `${environment.apiUrl}/users`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (users) => {
                this.facultyCount = users.filter((u) => u.role === 'Faculty').length;
                this.labTechCount = users.filter((u) => u.role === 'LabTech').length;
            },
            error: (error) => {
                console.error('Error loading user role counts:', error);
            }
        });
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

                const labels = labEntries.map((entry) => entry[0]);
                const counts = labEntries.map((entry) => entry[1]);
                const colors = this.generateColors(labels.length);

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

                console.log('=========================================');
            },
            error: (error) => {
                console.error('Error loading assets by laboratory:', error);
                this.initEmptyAssetsByLabChart();
            }
        });
    }

    initEmptyAssetsByLabChart() {
        this.assetsByLaboratoryChartData = {
            labels: ['No Data'],
            datasets: [
                {
                    label: 'Assets Count',
                    data: [0],
                    backgroundColor: ['rgba(209, 213, 219, 0.6)'],
                    borderColor: ['rgb(209, 213, 219)'],
                    borderWidth: 1
                }
            ]
        };
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
        console.log('=== LOADING MAINTENANCE REQUESTS BY LABORATORY DATA ===');

        // First, fetch all laboratories to get the mapping
        const laboratoriesUrl = `${environment.apiUrl}/laboratories`;

        this.http.get<any[]>(laboratoriesUrl).subscribe({
            next: (laboratories) => {
                console.log('Laboratories fetched:', laboratories?.length || 0);
                console.log('Sample laboratory:', laboratories?.[0]);

                // Create a map of laboratoryId -> laboratoryName
                const labMap = new Map<string, string>();
                laboratories.forEach((lab) => {
                    const labId = lab.laboratoryId;
                    const labName = lab.laboratoryName || lab.labName || 'Unknown Lab';
                    labMap.set(labId, labName);
                    console.log(`Mapping ${labId} -> ${labName}`);
                });

                console.log('Laboratory map:', Object.fromEntries(labMap));

                // Now fetch maintenance requests
                const requestsUrl = `${environment.apiUrl}/maintenance-requests`;

                this.http.get<any[]>(requestsUrl).subscribe({
                    next: (requests) => {
                        console.log('Maintenance requests fetched:', requests?.length || 0);

                        if (!requests || requests.length === 0) {
                            console.log('No maintenance requests found');
                            this.initEmptyMaintenanceByLabChart();
                            return;
                        }

                        // Count maintenance requests by laboratory
                        const labCount = new Map<string, number>();

                        requests.forEach((request, index) => {
                            // Extract laboratory ID from requestId
                            // Format: CAMPUS001-LB001-030826-MR001
                            const requestId = request.requestId || '';
                            const parts = requestId.split('-');
                            let labName = 'Unknown Laboratory';

                            if (parts.length >= 2) {
                                const labCode = parts[1]; // e.g., "LB001"
                                const foundName = labMap.get(labCode);
                                labName = foundName || `Lab ${labCode}`;

                                // Log first few items to debug
                                if (index < 3) {
                                    console.log(`Request ${index}:`, {
                                        requestId: request.requestId,
                                        extractedLabCode: labCode,
                                        foundInMap: !!foundName,
                                        labName: labName,
                                        mapHasKey: labMap.has(labCode)
                                    });
                                }
                            }

                            const currentCount = labCount.get(labName) || 0;
                            labCount.set(labName, currentCount + 1);
                        });

                        console.log('Maintenance request count by laboratory:', Object.fromEntries(labCount));

                        // Convert to arrays and sort by count (descending)
                        const labEntries = Array.from(labCount.entries())
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10); // Top 10 laboratories

                        const labels = labEntries.map((entry) => entry[0]);
                        const counts = labEntries.map((entry) => entry[1]);
                        const colors = this.generateColors(labels.length);

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

                        console.log('========================================================');
                    },
                    error: (error) => {
                        console.error('Error loading maintenance requests:', error);
                        this.initEmptyMaintenanceByLabChart();
                    }
                });
            },
            error: (error) => {
                console.error('Error loading laboratories:', error);
                this.initEmptyMaintenanceByLabChart();
            }
        });
    }

    initEmptyMaintenanceByLabChart() {
        this.maintenanceRequestsChartData = {
            labels: ['No Data'],
            datasets: [
                {
                    label: 'Maintenance Requests',
                    data: [0],
                    backgroundColor: ['rgba(209, 213, 219, 0.6)'],
                    borderColor: ['rgb(209, 213, 219)'],
                    borderWidth: 1
                }
            ]
        };
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
        console.log('=== LOADING MAINTENANCE STATUS DATA ===');
        const apiUrl = `${environment.apiUrl}/maintenance-requests`;

        this.http.get<any[]>(apiUrl).subscribe({
            next: (requests) => {
                console.log('=== MAINTENANCE REQUESTS BY STATUS DEBUG ===');
                console.log('Maintenance requests fetched:', requests?.length || 0);
                console.log('Sample request object (first):', requests?.[0]);
                console.log('Sample request.maintenanceApproval:', requests?.[0]?.maintenanceApproval);
                console.log('Sample request.status:', requests?.[0]?.status);

                if (!requests || requests.length === 0) {
                    console.log('No maintenance requests found');
                    this.initEmptyMaintenanceStatusChart();
                    return;
                }

                // Count maintenance requests by status
                const statusCount = new Map<string, number>();
                requests.forEach((request, index) => {
                    // Use maintenanceStatus.requestStatusName as the status
                    const status = request.maintenanceStatus?.requestStatusName || 'Pending';

                    // Log first few items to debug
                    if (index < 3) {
                        console.log(`Request ${index}:`, {
                            requestId: request.requestId,
                            status: status,
                            maintenanceStatus: request.maintenanceStatus
                        });
                    }

                    const currentCount = statusCount.get(status) || 0;
                    statusCount.set(status, currentCount + 1);
                });

                console.log('Maintenance request count by status:', Object.fromEntries(statusCount));

                const labels = Array.from(statusCount.keys());
                const counts = Array.from(statusCount.values());

                // Generate colors based on status
                const colors = labels.map((label) => {
                    const lowerLabel = label.toLowerCase();
                    if (lowerLabel.includes('pending') || lowerLabel.includes('for approval')) {
                        return 'rgba(239, 68, 68, 0.8)'; // Red
                    } else if (lowerLabel.includes('approved') || lowerLabel.includes('completed')) {
                        return 'rgba(34, 197, 94, 0.8)'; // Green
                    } else if (lowerLabel.includes('in progress') || lowerLabel.includes('ongoing')) {
                        return 'rgba(250, 204, 21, 0.8)'; // Amber
                    } else {
                        return 'rgba(107, 114, 128, 0.8)'; // Gray
                    }
                });

                const borderColors = labels.map((label) => {
                    const lowerLabel = label.toLowerCase();
                    if (lowerLabel.includes('pending') || lowerLabel.includes('for approval')) {
                        return 'rgb(239, 68, 68)';
                    } else if (lowerLabel.includes('approved') || lowerLabel.includes('completed')) {
                        return 'rgb(34, 197, 94)';
                    } else if (lowerLabel.includes('in progress') || lowerLabel.includes('ongoing')) {
                        return 'rgb(250, 204, 21)';
                    } else {
                        return 'rgb(107, 114, 128)';
                    }
                });

                this.maintenanceStatusChartData = {
                    labels: labels,
                    datasets: [
                        {
                            data: counts,
                            backgroundColor: colors,
                            borderColor: borderColors,
                            borderWidth: 1
                        }
                    ]
                };

                console.log('===========================================');
            },
            error: (error) => {
                console.error('Error loading maintenance status:', error);
                this.initEmptyMaintenanceStatusChart();
            }
        });
    }

    initEmptyMaintenanceStatusChart() {
        this.maintenanceStatusChartData = {
            labels: ['No Data'],
            datasets: [
                {
                    data: [0],
                    backgroundColor: ['rgba(209, 213, 219, 0.8)'],
                    borderColor: ['rgb(209, 213, 219)'],
                    borderWidth: 1
                }
            ]
        };
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
        } else if (props['type'] === 'schedule') {
            // Schedule event details
            Swal.fire({
                title: '<strong>Lab Schedule</strong>',
                icon: 'info',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p><strong>Subject:</strong> ${props['subject'] || 'N/A'}</p>
                        <p><strong>Laboratory:</strong> ${props['lab'] || 'N/A'}</p>
                        <p><strong>Building:</strong> ${props['location'] || 'N/A'}</p>
                        <p><strong>Campus:</strong> ${props['campus'] || 'N/A'}</p>
                        <p><strong>Instructor:</strong> ${props['instructor'] || 'N/A'}</p>
                        <p><strong>Students:</strong> ${props['totalStudents'] || 0}</p>
                        <p><strong>Time:</strong> ${new Date(event.start!).toLocaleTimeString()} - ${event.end ? new Date(event.end).toLocaleTimeString() : 'N/A'}</p>
                    </div>
                `,
                confirmButtonText: 'Close',
                customClass: {
                    popup: 'swal-wide'
                }
            });
        } else if (props['type'] === 'maintenance') {
            // Maintenance event details
            const priorityColor = props['priority'] === 'High' ? 'red' : props['priority'] === 'Medium' ? 'orange' : 'green';
            Swal.fire({
                title: '<strong>Maintenance Request</strong>',
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
                        <p><strong>Date:</strong> ${new Date(event.start!).toLocaleString()}</p>
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
