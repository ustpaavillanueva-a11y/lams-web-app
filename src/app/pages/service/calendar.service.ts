import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end?: string;
    extendedProps: {
        type: 'schedule' | 'maintenance' | 'custom' | 'masterplan'; // schedule, maintenance, custom, or masterplan
        campus?: string;
        lab?: string;
        location?: string;
        subject?: string;
        instructor?: string;
        section?: string;
        totalStudents?: number;
        status?: string;
        priority?: string;
        maintenanceType?: string;
        requestedBy?: string;
        assignedTo?: string;
        equipment?: string;
        description?: string;
        createdBy?: string;
        campusId?: string;
        color?: string;
        laboratoryName?: string;
        assetId?: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private baseApiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    /**
     * Get calendar events from unified endpoint (role-based on backend)
     */
    getCalendarEvents(): Observable<CalendarEvent[]> {
        // Fetch both calendar events and posted events simultaneously
        return forkJoin({
            calendarEvents: this.http.get<any>(`${this.baseApiUrl}/calendar/events`).pipe(
                catchError((error) => {
                    console.error('Error loading calendar events:', error);
                    return of({ data: { schedules: [], maintenance: [] } });
                })
            ),
            postedEvents: this.http.get<any>(`${this.baseApiUrl}/calendar/events/posts`).pipe(
                catchError((error) => {
                    console.error('Error loading posted events:', error);
                    return of({ data: [] });
                })
            )
        }).pipe(
            map(({ calendarEvents, postedEvents }) => {
                const events: CalendarEvent[] = [];

                // Process schedules
                if (calendarEvents.data?.schedules && Array.isArray(calendarEvents.data.schedules)) {
                    calendarEvents.data.schedules.forEach((schedule: any) => {
                        events.push(this.createScheduleEvent(schedule));
                    });
                }

                // Process maintenance (includes master plan events)
                if (calendarEvents.data?.maintenance && Array.isArray(calendarEvents.data.maintenance)) {
                    calendarEvents.data.maintenance.forEach((maintenance: any) => {
                        events.push(this.createMaintenanceEvent(maintenance));
                    });
                }

                // Process custom posted events
                if (postedEvents.data && Array.isArray(postedEvents.data)) {
                    postedEvents.data.forEach((event: any) => {
                        events.push(this.createCustomEvent(event));
                    });
                }

                console.log('Calendar events loaded:', events.length, 'events');
                return events;
            }),
            catchError((error) => {
                console.error('Error loading all calendar events:', error);
                return of([]);
            })
        );
    }

    /**
     * Create a calendar event from a schedule object
     */
    private createScheduleEvent(schedule: any): CalendarEvent {
        // Get the next occurrence of the specified day of week
        const dayOfWeek = schedule.dayOfWeek; // e.g., "Monday"
        const nextDate = this.getNextDayOfWeek(dayOfWeek);

        // Parse time strings
        const [startHour, startMinute] = schedule.startTime?.split(':') || ['09', '00'];
        const [endHour, endMinute] = schedule.endTime?.split(':') || ['10', '00'];

        const startDateTime = new Date(nextDate);
        startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

        const endDateTime = new Date(nextDate);
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

        return {
            id: `schedule-${schedule.scheduleId}`,
            title: schedule.subject || 'N/A',
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            extendedProps: {
                type: 'schedule',
                campus: schedule.campus || 'N/A',
                lab: schedule.labName || 'N/A',
                location: schedule.building || 'N/A',
                subject: schedule.subject || 'N/A',
                instructor: schedule.instructorName || 'N/A',
                totalStudents: schedule.totalStudents || 0,
                color: '#3b82f6' // Blue for schedules
            }
        };
    }

    /**
     * Create a calendar event from a maintenance object
     */
    private createMaintenanceEvent(maintenance: any): CalendarEvent {
        // Use scheduledAt if available, otherwise use submittedDate
        let eventDate: Date;
        if (maintenance.scheduledAt) {
            eventDate = new Date(maintenance.scheduledAt);
        } else if (maintenance.submittedDate) {
            eventDate = new Date(maintenance.submittedDate);
        } else {
            eventDate = new Date();
        }

        // Generate unique ID based on available IDs
        const eventId = maintenance.maintenanceApprovalId || maintenance.maintenanceRequestId || maintenance.maintenancePlanId || `maintenance-${Date.now()}`;

        // Check if this is a master plan event
        const isMasterPlan = maintenance.status === 'Master Plan';
        const eventType = isMasterPlan ? 'masterplan' : 'maintenance';

        return {
            id: `${eventType}-${eventId}`,
            title: `${maintenance.maintenanceType || 'Maintenance'} - ${maintenance.equipmentName || 'Equipment'}`,
            start: eventDate.toISOString(),
            extendedProps: {
                type: eventType,
                equipment: maintenance.equipmentName || 'N/A',
                maintenanceType: maintenance.maintenanceType || 'N/A',
                requestedBy: maintenance.requestedBy || 'N/A',
                assignedTo: maintenance.assignedTechnician || 'Not Assigned',
                priority: maintenance.priority || 'N/A',
                status: maintenance.status || 'Pending',
                description: maintenance.description || 'No description',
                location: maintenance.building || 'N/A',
                lab: maintenance.laboratoryName,
                campusId: maintenance.campusId,
                color: isMasterPlan ? this.getMasterPlanColor(maintenance.maintenanceType) : this.getMaintenanceColor(maintenance.priority)
            }
        };
    }

    /**
     * Get the next occurrence of a specific day of week
     */
    private getNextDayOfWeek(dayName: string): Date {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = daysOfWeek.indexOf(dayName);

        if (targetDay === -1) {
            return new Date(); // Return today if invalid day name
        }

        const today = new Date();
        const currentDay = today.getDay();

        // Calculate days until next occurrence
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget <= 0) {
            daysUntilTarget += 7;
        }

        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntilTarget);

        return nextDate;
    }

    /**
     * Create a calendar event from a custom event object
     */
    private createCustomEvent(event: any): CalendarEvent {
        const eventDate = event.eventDate ? new Date(event.eventDate) : new Date();

        return {
            id: `custom-${event.calendarEventId || Date.now()}`,
            title: event.title || 'Custom Event',
            start: eventDate.toISOString(),
            extendedProps: {
                type: 'custom',
                description: event.description || '',
                createdBy: event.createdBy || 'Unknown',
                campusId: event.campusId || '',
                color: '#9333ea' // Purple for custom events
            }
        };
    }

    /**
     * Get color based on maintenance priority
     */
    private getMaintenanceColor(priority: string): string {
        switch (priority?.toLowerCase()) {
            case 'high':
                return '#ef4444'; // Red
            case 'medium':
                return '#f59e0b'; // Orange
            case 'low':
                return '#10b981'; // Green
            default:
                return '#8b5cf6'; // Purple
        }
    }

    /**
     * Get color based on master plan maintenance type
     */
    private getMasterPlanColor(maintenanceType: string): string {
        switch (maintenanceType?.toLowerCase()) {
            case 'inventory':
                return '#06b6d4'; // Cyan
            case 'preventive':
                return '#10b981'; // Green
            case 'corrective':
                return '#f59e0b'; // Orange
            case 'calibration':
                return '#8b5cf6'; // Purple
            default:
                return '#6366f1'; // Indigo
        }
    }
}
