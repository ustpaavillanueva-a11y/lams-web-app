import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { WebSocketService, WebSocketEvent } from '../../shared/services/websocket.service';
import { CalendarEvent, Schedule } from '../../shared/models/websocket-interfaces';

@Injectable({
    providedIn: 'root'
})
export class CalendarWebSocketService implements OnDestroy {
    private readonly namespace = '/calendar';
    private isConnected = false;

    constructor(private webSocketService: WebSocketService) {}

    /**
     * Connect to calendar namespace
     */
    connect(): void {
        if (this.isConnected) {
            return;
        }

        try {
            this.webSocketService.connect(this.namespace);
            this.isConnected = true;
        } catch (error) {}
    }

    /**
     * Disconnect from calendar namespace
     */
    disconnect(): void {
        this.webSocketService.disconnect(this.namespace);
        this.isConnected = false;
    }

    /**
     * Listen for new calendar events
     */
    onCalendarEventCreated(): Observable<WebSocketEvent<CalendarEvent>> {
        return this.webSocketService.on<CalendarEvent>(this.namespace, 'calendar-event-created');
    }

    /**
     * Listen for calendar event updates
     */
    onCalendarEventUpdated(): Observable<WebSocketEvent<CalendarEvent>> {
        return this.webSocketService.on<CalendarEvent>(this.namespace, 'calendar-event-updated');
    }

    /**
     * Listen for calendar event deletions
     */
    onCalendarEventDeleted(): Observable<WebSocketEvent<{ eventId: string }>> {
        return this.webSocketService.on<{ eventId: string }>(this.namespace, 'calendar-event-deleted');
    }

    /**
     * Listen for new schedules
     */
    onScheduleCreated(): Observable<WebSocketEvent<Schedule>> {
        return this.webSocketService.on<Schedule>(this.namespace, 'schedule-created');
    }

    /**
     * Listen for schedule updates
     */
    onScheduleUpdated(): Observable<WebSocketEvent<Schedule>> {
        return this.webSocketService.on<Schedule>(this.namespace, 'schedule-updated');
    }

    /**
     * Listen for schedule deletions
     */
    onScheduleDeleted(): Observable<WebSocketEvent<{ scheduleId: string }>> {
        return this.webSocketService.on<{ scheduleId: string }>(this.namespace, 'schedule-deleted');
    }

    /**
     * Listen for schedule changes (generic)
     */
    onScheduleChanged(): Observable<WebSocketEvent<Schedule>> {
        return this.webSocketService.on<Schedule>(this.namespace, 'schedule-changed');
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
