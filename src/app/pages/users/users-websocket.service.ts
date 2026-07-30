import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { WebSocketService, WebSocketEvent } from '../../shared/services/websocket.service';
import { User } from '../../shared/models/websocket-interfaces';

@Injectable({
    providedIn: 'root'
})
export class UsersWebSocketService implements OnDestroy {
    private readonly namespace = '/users';
    private isConnected = false;

    constructor(private webSocketService: WebSocketService) {}

    /**
     * Connect to users namespace
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
     * Disconnect from users namespace
     */
    disconnect(): void {
        this.webSocketService.disconnect(this.namespace);
        this.isConnected = false;
    }

    /**
     * Listen for new users
     */
    onUserCreated(): Observable<WebSocketEvent<User>> {
        return this.webSocketService.on<User>(this.namespace, 'user-created');
    }

    /**
     * Listen for user updates
     */
    onUserUpdated(): Observable<WebSocketEvent<User>> {
        return this.webSocketService.on<User>(this.namespace, 'user-updated');
    }

    /**
     * Listen for user activations
     */
    onUserActivated(): Observable<WebSocketEvent<User>> {
        return this.webSocketService.on<User>(this.namespace, 'user-activated');
    }

    /**
     * Listen for user deactivations
     */
    onUserDeactivated(): Observable<WebSocketEvent<User>> {
        return this.webSocketService.on<User>(this.namespace, 'user-deactivated');
    }

    /**
     * Listen for user deletions
     */
    onUserDeleted(): Observable<WebSocketEvent<{ userId: string }>> {
        return this.webSocketService.on<{ userId: string }>(this.namespace, 'user-deleted');
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
