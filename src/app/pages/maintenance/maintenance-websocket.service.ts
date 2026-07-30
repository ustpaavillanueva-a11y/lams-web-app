import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { WebSocketService, WebSocketEvent } from '../../shared/services/websocket.service';
import { MaintenanceRequest } from '../../shared/models/websocket-interfaces';

@Injectable({
    providedIn: 'root'
})
export class MaintenanceWebSocketService implements OnDestroy {
    private readonly namespace = '/maintenance';
    private isConnected = false;

    constructor(private webSocketService: WebSocketService) {}

    /**
     * Connect to maintenance namespace and subscribe to updates
     */
    connect(): void {
        if (this.isConnected) {
            return;
        }

        try {
            this.webSocketService.connect(this.namespace);
            // Subscribe to maintenance updates
            this.webSocketService.emit(this.namespace, 'subscribe-maintenance-updates');
            this.isConnected = true;
        } catch (error) {}
    }

    /**
     * Disconnect from maintenance namespace
     */
    disconnect(): void {
        this.webSocketService.disconnect(this.namespace);
        this.isConnected = false;
    }

    /**
     * Listen for new maintenance requests
     */
    onMaintenanceRequestCreated(): Observable<WebSocketEvent<MaintenanceRequest>> {
        return this.webSocketService.on<MaintenanceRequest>(this.namespace, 'maintenance-request-created');
    }

    /**
     * Listen for maintenance request updates
     */
    onMaintenanceRequestUpdated(): Observable<WebSocketEvent<MaintenanceRequest>> {
        return this.webSocketService.on<MaintenanceRequest>(this.namespace, 'maintenance-request-updated');
    }

    /**
     * Listen for approved maintenance requests
     */
    onMaintenanceApproved(): Observable<WebSocketEvent<MaintenanceRequest>> {
        return this.webSocketService.on<MaintenanceRequest>(this.namespace, 'maintenance-approved');
    }

    /**
     * Listen for disapproved maintenance requests
     */
    onMaintenanceDisapproved(): Observable<WebSocketEvent<MaintenanceRequest>> {
        return this.webSocketService.on<MaintenanceRequest>(this.namespace, 'maintenance-disapproved');
    }

    /**
     * Listen for scheduled maintenance
     */
    onMaintenanceScheduled(): Observable<WebSocketEvent<MaintenanceRequest>> {
        return this.webSocketService.on<MaintenanceRequest>(this.namespace, 'maintenance-scheduled');
    }

    /**
     * Listen for completed maintenance
     */
    onMaintenanceCompleted(): Observable<WebSocketEvent<MaintenanceRequest>> {
        return this.webSocketService.on<MaintenanceRequest>(this.namespace, 'maintenance-completed');
    }

    /**
     * Listen for maintenance on hold
     */
    onMaintenanceOnHold(): Observable<WebSocketEvent<MaintenanceRequest>> {
        return this.webSocketService.on<MaintenanceRequest>(this.namespace, 'maintenance-on-hold');
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
