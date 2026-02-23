import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    selector: 'app-dashboard-student',
    standalone: true,
    imports: [CommonModule, FullCalendarModule],
    template: `
        <div class="p-6">
            <!-- Top Section: Welcome and Calendar -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <!-- Left Side: Welcome Card and Info -->
                <div class="lg:col-span-2 grid grid-cols-1 gap-6">
                    <!-- Welcome Card -->
                    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                        <h1 class="text-3xl font-bold dark:text-white">Welcome, Student!</h1>
                        <p class="text-gray-600 dark:text-gray-400 mt-2">Here's your dashboard overview.</p>
                    </div>

                    <!-- Quick Stats Placeholder -->
                    <div class="grid grid-cols-2 gap-6">
                        <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Lab Sessions Today</p>
                                    <h3 class="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">0</h3>
                                </div>
                                <div class="bg-blue-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                    <i class="pi pi-calendar text-2xl text-blue-600 dark:text-blue-400"></i>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Upcoming Labs</p>
                                    <h3 class="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">0</h3>
                                </div>
                                <div class="bg-green-500 bg-opacity-10 dark:bg-opacity-20 p-4 rounded-full">
                                    <i class="pi pi-clock text-2xl text-green-600 dark:text-green-400"></i>
                                </div>
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
export class DashboardStudent {
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
