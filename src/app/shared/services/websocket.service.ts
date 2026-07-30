import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WebSocketEvent<T = any> {
    success: boolean;
    message: string;
    data: T;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
    private sockets: Map<string, Socket> = new Map();
    private baseUrl: string;

    constructor() {
        // Extract base URL from API URL (remove /api)
        this.baseUrl = environment.apiUrl.replace('/api', '');
    }

    /**
     * Connect to a WebSocket namespace with JWT authentication
     * @param namespace - The namespace to connect to (e.g., '/maintenance', '/activities')
     * @returns Socket instance
     */
    connect(namespace: string): Socket {
        // Check if already connected
        if (this.sockets.has(namespace)) {
            const existingSocket = this.sockets.get(namespace)!;
            if (existingSocket.connected) {
                return existingSocket;
            }
            // Clean up disconnected socket
            existingSocket.removeAllListeners();
            existingSocket.close();
        }

        // Get JWT token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn(`⚠️ No authentication token found for ${namespace} namespace - skipping WebSocket connection`);
            throw new Error('Authentication required for WebSocket connection');
        }

        // Create new socket connection
        const socket = io(`${this.baseUrl}${namespace}`, {
            auth: {
                token: token
            },
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        // Setup connection handlers
        socket.on('connect', () => {});

        socket.on('connect_error', (error: any) => {
            // If auth error, try to refresh token
            if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
                console.warn(`🔐 Authentication failed for ${namespace} - token may be expired`);
            }
        });

        socket.on('disconnect', (reason: any) => {
            if (reason === 'io server disconnect') {
                // Server disconnected, probably due to auth issues
                console.warn(`⚠️ Server disconnected ${namespace} - possibly due to authentication`);
            }
        });

        socket.on('exception', (error: any) => {});

        // Store socket
        this.sockets.set(namespace, socket);
        return socket;
    }

    /**
     * Disconnect from a specific namespace
     * @param namespace - The namespace to disconnect from
     */
    disconnect(namespace: string): void {
        const socket = this.sockets.get(namespace);
        if (socket) {
            socket.removeAllListeners();
            socket.close();
            this.sockets.delete(namespace);
        }
    }

    /**
     * Disconnect from all namespaces
     */
    disconnectAll(): void {
        this.sockets.forEach((socket, namespace) => {
            socket.removeAllListeners();
            socket.close();
        });
        this.sockets.clear();
    }

    /**
     * Listen to an event on a specific namespace
     * @param namespace - The namespace to listen on
     * @param eventName - The event name to listen for
     * @returns Observable of the event data
     */
    on<T = any>(namespace: string, eventName: string): Observable<WebSocketEvent<T>> {
        const subject = new Subject<WebSocketEvent<T>>();

        const socket = this.sockets.get(namespace);
        if (!socket) {
            subject.error(new Error(`Not connected to ${namespace}`));
            return subject.asObservable();
        }

        socket.on(eventName, (data: WebSocketEvent<T>) => {
            subject.next(data);
        });

        return subject.asObservable();
    }

    /**
     * Emit an event to a specific namespace
     * @param namespace - The namespace to emit to
     * @param eventName - The event name
     * @param data - The data to send
     */
    emit(namespace: string, eventName: string, data?: any): void {
        const socket = this.sockets.get(namespace);
        if (!socket) {
            return;
        }

        socket.emit(eventName, data);
    }

    /**
     * Check if connected to a namespace
     * @param namespace - The namespace to check
     * @returns boolean indicating connection status
     */
    isConnected(namespace: string): boolean {
        const socket = this.sockets.get(namespace);
        return socket ? socket.connected : false;
    }

    /**
     * Get socket instance for a namespace
     * @param namespace - The namespace
     * @returns Socket instance or undefined
     */
    getSocket(namespace: string): Socket | undefined {
        return this.sockets.get(namespace);
    }

    ngOnDestroy(): void {
        this.disconnectAll();
    }
}
