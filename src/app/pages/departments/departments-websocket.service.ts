import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { WebSocketService, WebSocketEvent } from '../../shared/services/websocket.service';
import { Department } from '../../shared/models/websocket-interfaces';

@Injectable({
    providedIn: 'root'
})
export class DepartmentsWebSocketService implements OnDestroy {
    private readonly namespace = '/departments';
    private isConnected = false;

    constructor(private webSocketService: WebSocketService) {}

    /**
     * Connect to departments namespace
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
     * Disconnect from departments namespace
     */
    disconnect(): void {
        this.webSocketService.disconnect(this.namespace);
        this.isConnected = false;
    }

    /**
     * Listen for new departments
     */
    onDepartmentCreated(): Observable<WebSocketEvent<Department>> {
        return this.webSocketService.on<Department>(this.namespace, 'department-created');
    }

    /**
     * Listen for department updates
     */
    onDepartmentUpdated(): Observable<WebSocketEvent<Department>> {
        return this.webSocketService.on<Department>(this.namespace, 'department-updated');
    }

    /**
     * Listen for department deletions
     */
    onDepartmentDeleted(): Observable<WebSocketEvent<{ departmentId: string }>> {
        return this.webSocketService.on<{ departmentId: string }>(this.namespace, 'department-deleted');
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
