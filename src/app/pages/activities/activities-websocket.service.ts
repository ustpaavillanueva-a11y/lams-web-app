import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { WebSocketService, WebSocketEvent } from '../../shared/services/websocket.service';
import { Activity } from '../../shared/models/websocket-interfaces';

@Injectable({
    providedIn: 'root'
})
export class ActivitiesWebSocketService implements OnDestroy {
    private readonly namespace = '/activities';
    private isConnected = false;

    constructor(private webSocketService: WebSocketService) {}

    /**
     * Connect to activities namespace
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
     * Disconnect from activities namespace
     */
    disconnect(): void {
        this.webSocketService.disconnect(this.namespace);
        this.isConnected = false;
    }

    /**
     * Listen for new activity logs
     */
    onActivityLogged(): Observable<WebSocketEvent<Activity>> {
        return this.webSocketService.on<Activity>(this.namespace, 'activity-logged');
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
