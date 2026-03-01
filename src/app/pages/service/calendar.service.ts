import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end?: string;
    extendedProps: {
        type: 'schedule' | 'maintenance'; // schedule or maintenance
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
        color?: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private baseApiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    /**
     * Get calendar events based on user role
     */
    getCalendarEvents(): Observable<CalendarEvent[]> {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            return of([]);
        }

        try {
            const user = JSON.parse(currentUser);
            const userRole = user.role;

            switch (userRole) {
                case 'SuperAdmin':
                    return this.getSuperAdminEvents();
                case 'CampusAdmin':
                    return this.getCampusAdminEvents(user);
                case 'Faculty':
                    return this.getFacultyEvents(user);
                case 'LabTech':
                    return this.getLabTechEvents(user);
                default:
                    return of([]);
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            return of([]);
        }
    }

    /**
     * SuperAdmin - Get all schedules and all maintenance requests from all campuses
     */
    private getSuperAdminEvents(): Observable<CalendarEvent[]> {
        return forkJoin({
            schedules: this.getAllSchedules().pipe(catchError(() => of([]))),
            maintenance: this.getAllMaintenanceApprovals().pipe(catchError(() => of([])))
        }).pipe(
            map(({ schedules, maintenance }) => {
                const events: CalendarEvent[] = [];

                // Add schedule events
                schedules.forEach((schedule: any) => {
                    events.push(this.createScheduleEvent(schedule));
                });

                // Add maintenance events
                maintenance.forEach((request: any) => {
                    events.push(this.createMaintenanceEvent(request));
                });

                return events;
            })
        );
    }

    /**
     * CampusAdmin - Get schedules and maintenance for their campus only
     */
    private getCampusAdminEvents(user: any): Observable<CalendarEvent[]> {
        const campusId = user.campusId;

        return forkJoin({
            schedules: this.getCampusSchedules(campusId).pipe(catchError(() => of([]))),
            maintenance: this.getCampusMaintenanceApprovals(campusId).pipe(catchError(() => of([])))
        }).pipe(
            map(({ schedules, maintenance }) => {
                const events: CalendarEvent[] = [];

                // Add schedule events
                schedules.forEach((schedule: any) => {
                    events.push(this.createScheduleEvent(schedule));
                });

                // Add maintenance events
                maintenance.forEach((request: any) => {
                    events.push(this.createMaintenanceEvent(request));
                });

                return events;
            })
        );
    }

    /**
     * Faculty - Get their own lab schedules
     */
    private getFacultyEvents(user: any): Observable<CalendarEvent[]> {
        const facultyId = user.userId;

        return this.getFacultySchedules(facultyId).pipe(
            map((schedules: any[]) => {
                const events: CalendarEvent[] = [];

                schedules.forEach((schedule: any) => {
                    events.push(this.createScheduleEvent(schedule));
                });

                return events;
            }),
            catchError(() => of([]))
        );
    }

    /**
     * LabTech - Get maintenance requests assigned to them
     */
    private getLabTechEvents(user: any): Observable<CalendarEvent[]> {
        const labTechId = user.userId;

        return this.getLabTechMaintenanceApprovals(labTechId).pipe(
            map((maintenance: any[]) => {
                const events: CalendarEvent[] = [];

                maintenance.forEach((request: any) => {
                    events.push(this.createMaintenanceEvent(request));
                });

                return events;
            }),
            catchError(() => of([]))
        );
    }

    /**
     * Get all schedules (for SuperAdmin)
     */
    private getAllSchedules(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseApiUrl}/schedules`);
    }

    /**
     * Get schedules for a specific campus
     */
    private getCampusSchedules(campusId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseApiUrl}/schedules/filter/by-campus/${campusId}`);
    }

    /**
     * Get schedules for a specific faculty member
     */
    private getFacultySchedules(facultyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseApiUrl}/schedules/filter/by-faculty/${facultyId}`);
    }

    /**
     * Get all maintenance approvals (for SuperAdmin)
     */
    private getAllMaintenanceApprovals(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseApiUrl}/maintenance-approvals`);
    }

    /**
     * Get maintenance approvals for a campus
     */
    private getCampusMaintenanceApprovals(campusId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseApiUrl}/maintenance-approvals/filter/by-campus/${campusId}`);
    }

    /**
     * Get maintenance approvals assigned to a specific LabTech
     */
    private getLabTechMaintenanceApprovals(labTechId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseApiUrl}/maintenance-approvals/filter/by-technician/${labTechId}`);
    }

    /**
     * Create a calendar event from a schedule object
     */
    private createScheduleEvent(schedule: any): CalendarEvent {
        // Parse time strings to create date/time
        const [year, month, day] = schedule.scheduleDate?.split('-') || [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
        const [startHour, startMinute] = schedule.startTime?.split(':') || ['09', '00'];
        const [endHour, endMinute] = schedule.endTime?.split(':') || ['10', '00'];

        const startDateTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(startHour), parseInt(startMinute));
        const endDateTime = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(endHour), parseInt(endMinute));

        return {
            id: `schedule-${schedule.scheduleId}`,
            title: `${schedule.subject?.subjectCode || 'Lab'} - ${schedule.section || 'N/A'}`,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            extendedProps: {
                type: 'schedule',
                campus: schedule.laboratory?.campus?.campusName || 'N/A',
                lab: schedule.laboratory?.laboratoryName || 'N/A',
                location: schedule.laboratory?.building || 'N/A',
                subject: schedule.subject?.subjectName || 'N/A',
                instructor: `${schedule.faculty?.firstName || ''} ${schedule.faculty?.lastName || ''}`.trim(),
                section: schedule.section || 'N/A',
                totalStudents: schedule.totalStudents || 0,
                status: schedule.status || 'Scheduled',
                color: '#3b82f6' // Blue for schedules
            }
        };
    }

    /**
     * Create a calendar event from a maintenance approval object
     */
    private createMaintenanceEvent(maintenance: any): CalendarEvent {
        // Parse scheduled date
        const scheduledDate = maintenance.scheduledAt ? new Date(maintenance.scheduledAt) : new Date();

        return {
            id: `maintenance-${maintenance.maintenanceApprovalId}`,
            title: `${maintenance.maintenanceRequest?.maintenanceType?.maintenanceTypeName || 'Maintenance'} - ${maintenance.maintenanceRequest?.asset?.assetName || 'N/A'}`,
            start: scheduledDate.toISOString(),
            extendedProps: {
                type: 'maintenance',
                campus: maintenance.maintenanceRequest?.requestedBy?.campusId || 'N/A',
                equipment: maintenance.maintenanceRequest?.asset?.assetName || 'N/A',
                maintenanceType: maintenance.maintenanceRequest?.maintenanceType?.maintenanceTypeName || 'N/A',
                requestedBy: `${maintenance.maintenanceRequest?.requestedBy?.firstName || ''} ${maintenance.maintenanceRequest?.requestedBy?.lastName || ''}`.trim(),
                assignedTo: `${maintenance.assignedTechnician?.firstName || ''} ${maintenance.assignedTechnician?.lastName || ''}`.trim(),
                priority: maintenance.maintenanceRequest?.priorityLevel?.priorityLevelName || 'N/A',
                status: maintenance.status || 'Pending',
                description: maintenance.maintenanceRequest?.reason || 'N/A',
                color: this.getMaintenanceColor(maintenance.maintenanceRequest?.priorityLevel?.priorityLevelName)
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
}
