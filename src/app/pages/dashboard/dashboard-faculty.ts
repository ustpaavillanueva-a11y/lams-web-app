import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UIChart } from 'primeng/chart';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

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
    selector: 'app-dashboard-faculty',
    standalone: true,
    imports: [CommonModule, UIChart, FullCalendarModule],
    template: `
        <div class="p-6">
            <!-- Top Section: Cards and Calendar -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Left Side: Stats Cards -->
                <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Total Submitted Requests Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Submitted Requests</p>
                                <h3 class="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{{ totalSubmitted }}</h3>
                            </div>
                            <div class="bg-blue-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-send text-2xl text-blue-600 dark:text-blue-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Pending Requests Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Pending Requests</p>
                                <h3 class="text-4xl font-bold text-amber-600 dark:text-amber-400 mt-2">{{ pendingCount }}</h3>
                            </div>
                            <div class="bg-amber-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                <i class="pi pi-clock text-2xl text-amber-600 dark:text-amber-400"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Donut Chart for Requests by Status -->
                    <div class="md:col-span-2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <h3 class="text-xl font-semibold dark:text-white text-center mb-4">Requests by Status</h3>
                        <div class="flex justify-center">
                            <div class="w-64">
                                <p-chart type="doughnut" [data]="statusChartData" [options]="donutOptions"></p-chart>
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

            <!-- Lab Schedule Section -->
            <div class="flex flex-col md:flex-row gap-6 mt-6">
                <!-- Today's Schedule -->
                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Today's Schedule</h3>
                    <div class="space-y-3">
                        <div *ngFor="let schedule of todaySchedules" class="border-l-4 border-blue-500 pl-4 py-2 dark:border-blue-400">
                            <div class="font-semibold dark:text-white">{{ schedule.subject }}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">{{ schedule.time }}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">{{ schedule.laboratory }} • {{ schedule.students }} students</div>
                        </div>
                    </div>
                </div>

                <!-- Upcoming Schedules -->
                <div class="w-full md:w-1/2 bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-semibold mb-4 dark:text-white">Upcoming Schedules</h3>
                    <div class="space-y-3 max-h-80 overflow-y-auto">
                        <div *ngFor="let schedule of upcomingSchedules" class="border-l-4 border-green-500 pl-4 py-2 dark:border-green-400">
                            <div class="font-semibold dark:text-white">{{ schedule.subject }}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">{{ schedule.date }} @ {{ schedule.time }}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">{{ schedule.laboratory }}</div>
                        </div>
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
        `
    ]
})
export class DashboardFaculty implements OnInit {
    totalSubmitted: number = 0;
    pendingCount: number = 0;
    statusChartData: any;
    donutOptions: any;
    todaySchedules: any[] = [];
    upcomingSchedules: any[] = [];

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
        this.loadTotalSubmitted();
        this.loadPending();
        this.loadByStatus();
        this.initDonutOptions();
        this.initMockScheduleData();
    }

    loadTotalSubmitted() {
        const apiUrl = 'http://localhost:3000/api/maintenance-requests/count-total-submitted';
        this.http.get<number>(apiUrl).subscribe({
            next: (count) => (this.totalSubmitted = count || 0),
            error: (error) => console.error('Error loading total submitted:', error)
        });
    }

    loadPending() {
        const apiUrl = 'http://localhost:3000/api/maintenance-requests/count-pending';
        this.http.get<number>(apiUrl).subscribe({
            next: (count) => (this.pendingCount = count || 0),
            error: (error) => console.error('Error loading pending count:', error)
        });
    }

    loadByStatus() {
        const apiUrl = 'http://localhost:3000/api/maintenance-requests/count-by-status';
        this.http.get<any[]>(apiUrl).subscribe({
            next: (data) => {
                const labels = data.map((item) => item.status || 'Unknown');
                const counts = data.map((item) => item.count || 0);
                const colors = this.generateColors(labels.length);

                this.statusChartData = {
                    labels,
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
            error: (error) => console.error('Error loading status counts:', error)
        });
    }

    initDonutOptions() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');

        this.donutOptions = {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 16,
                        font: { size: 12 }
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

    generateColors(count: number): Array<{ bg: string; border: string }> {
        const palette = [
            { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },
            { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },
            { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },
            { bg: 'rgba(250, 204, 21, 0.7)', border: 'rgb(250, 204, 21)' },
            { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgb(168, 85, 247)' },
            { bg: 'rgba(14, 165, 233, 0.7)', border: 'rgb(14, 165, 233)' },
            { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' },
            { bg: 'rgba(6, 182, 212, 0.7)', border: 'rgb(6, 182, 212)' },
            { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgb(139, 92, 246)' },
            { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' }
        ];

        const colors: Array<{ bg: string; border: string }> = [];
        for (let i = 0; i < count; i++) {
            colors.push(palette[i % palette.length]);
        }
        return colors;
    }

    initMockScheduleData() {
        // Mock Today's Schedule
        this.todaySchedules = [
            {
                time: '08:00 AM - 10:00 AM',
                subject: 'Chemistry Lab',
                laboratory: 'Chem Lab 1',
                students: 25
            },
            {
                time: '10:30 AM - 12:30 PM',
                subject: 'Advanced Physics',
                laboratory: 'Physics Lab 2',
                students: 18
            },
            {
                time: '1:00 PM - 3:00 PM',
                subject: 'Organic Chemistry',
                laboratory: 'Chem Lab 2',
                students: 22
            }
        ];

        // Mock Upcoming Schedules (next 5 sessions)
        this.upcomingSchedules = [
            {
                date: 'Jan 6, 2026',
                time: '09:00 AM',
                subject: 'Biology Lab',
                laboratory: 'Bio Lab 1'
            },
            {
                date: 'Jan 7, 2026',
                time: '10:00 AM',
                subject: 'Physics Lab',
                laboratory: 'Physics Lab 1'
            },
            {
                date: 'Jan 8, 2026',
                time: '2:00 PM',
                subject: 'Chemistry Lab',
                laboratory: 'Chem Lab 1'
            },
            {
                date: 'Jan 9, 2026',
                time: '11:00 AM',
                subject: 'Advanced Physics',
                laboratory: 'Physics Lab 2'
            },
            {
                date: 'Jan 10, 2026',
                time: '3:00 PM',
                subject: 'Organic Chemistry',
                laboratory: 'Chem Lab 2'
            }
        ];
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
