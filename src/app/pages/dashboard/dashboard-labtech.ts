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

                    <!-- Donut Chart for Requests by Service Type -->
                    <div class="md:col-span-2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <h4 class="text-lg font-semibold dark:text-white text-center mb-4">Requests by Service Type</h4>
                        <div class="flex justify-center">
                            <div class="w-64">
                                <p-chart type="doughnut" [data]="serviceTypeChartData" [options]="donutChartOptions"></p-chart>
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

            <!-- Lab schedule mock charts row -->
            <div class="flex flex-col md:flex-row gap-6 mt-6">
                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 h-96">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Schedules by Day (Mock)</h3>
                    <p-chart type="bar" [data]="scheduleByDayChartData" [options]="barChartOptions"></p-chart>
                </div>

                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6 h-96">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Schedules by Laboratory (Mock)</h3>
                    <p-chart type="bar" [data]="scheduleByLabChartData" [options]="horizontalChartOptions"></p-chart>
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
        `
    ]
})
export class DashboardLabTech implements OnInit {
    overdueApprovalsCount: number = 0;
    requestsForApprovalCount: number = 0;
    serviceTypeChartData: any;
    donutChartOptions: any;
    assetsBySupplierChartData: any;
    assetsByBrandChartData: any;
    barChartOptions: any;
    horizontalChartOptions: any;
    scheduleByDayChartData: any;
    scheduleByLabChartData: any;

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

    constructor(
        private http: HttpClient,
        private changeDetector: ChangeDetectorRef,
        private calendarService: CalendarService
    ) {}

    ngOnInit() {
        this.loadOverdueApprovalsCount();
        this.loadRequestsForApprovalCount();
        this.loadServiceTypeData();
        this.loadCalendarEvents();
        this.initDonutOptions();
        this.loadAssetsBySupplier();
        this.loadAssetsByBrand();
        this.initBarOptions();
        this.initHorizontalBarOptions();
        this.initMockScheduleCharts();
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

    loadServiceTypeData() {
        const apiUrl = `${environment.apiUrl}/maintenance-requests/by-service-type`;
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.serviceName || item.serviceType || 'Unknown');
                const counts = data.map((item) => item.count || 0);
                const colors = this.generateColors(labels.length);

                this.serviceTypeChartData = {
                    labels: labels,
                    datasets: [
                        {
                            data: counts,
                            backgroundColor: colors.map((c) => c.bg),
                            borderColor: colors.map((c) => c.border),
                            borderWidth: 1
                        }
                    ]
                };
            },
            error: (error) => {
                console.error('Error loading service type data:', error);
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
                calendarApi.addEvent({
                    id: createEventId(),
                    title: result.value.title,
                    start: selectInfo.startStr,
                    end: selectInfo.endStr,
                    allDay: selectInfo.allDay,
                    extendedProps: {
                        type: 'custom',
                        description: result.value.description,
                        color: '#9333ea'
                    },
                    backgroundColor: '#9333ea',
                    borderColor: '#9333ea'
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Event Added!',
                    text: 'Your custom event has been added to the calendar.',
                    timer: 2000,
                    showConfirmButton: false
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
