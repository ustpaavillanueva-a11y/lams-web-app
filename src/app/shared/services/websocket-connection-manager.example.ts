import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './pages/service/auth.service';
import { WebSocketService } from './shared/services/websocket.service';

/**
 * Example service to manage WebSocket connections globally
 * This can be used in app.component.ts or as a separate service
 */
export class WebSocketConnectionManager implements OnInit, OnDestroy {
    private connectedNamespaces: Set<string> = new Set();

    constructor(
        private authService: AuthService,
        private webSocketService: WebSocketService,
        private router: Router
    ) {}

    ngOnInit() {
        // Connect to WebSockets after user logs in
        // This is typically done in app.component.ts after checking authentication
        this.initializeWebSocketConnections();

        // Listen for route changes to connect/disconnect namespaces as needed
        this.router.events.subscribe(() => {
            this.manageConnectionsBasedOnRoute();
        });
    }

    /**
     * Initialize WebSocket connections based on user role
     */
    private initializeWebSocketConnections(): void {
        const user = this.authService.getCurrentUser();

        if (!user) {
            return;
        }

        // Connect to namespaces based on user role
        switch (user.role) {
            case 'SuperAdmin':
                // SuperAdmin gets access to all namespaces
                this.connectToAllNamespaces();
                break;

            case 'CampusAdmin':
                // CampusAdmin gets access to their campus events
                this.connectToCampusAdminNamespaces();
                break;

            case 'Faculty':
            case 'LabTech':
                // Faculty/LabTech get limited access
                this.connectToUserNamespaces();
                break;

            default:
                console.warn('Unknown user role:', user.role);
        }
    }

    /**
     * Connect to all WebSocket namespaces (SuperAdmin)
     */
    private connectToAllNamespaces(): void {
        const namespaces = ['/maintenance', '/activities', '/assets', '/calendar', '/users', '/laboratories', '/departments'];

        namespaces.forEach((namespace) => {
            try {
                this.webSocketService.connect(namespace);
                this.connectedNamespaces.add(namespace);
            } catch (error) {}
        });
    }

    /**
     * Connect to campus-relevant namespaces (CampusAdmin)
     */
    private connectToCampusAdminNamespaces(): void {
        const namespaces = ['/maintenance', '/activities', '/assets', '/calendar', '/laboratories'];

        namespaces.forEach((namespace) => {
            try {
                this.webSocketService.connect(namespace);
                this.connectedNamespaces.add(namespace);
            } catch (error) {}
        });
    }

    /**
     * Connect to user-relevant namespaces (Faculty/LabTech)
     */
    private connectToUserNamespaces(): void {
        const namespaces = ['/maintenance', '/activities', '/calendar'];

        namespaces.forEach((namespace) => {
            try {
                this.webSocketService.connect(namespace);
                this.connectedNamespaces.add(namespace);
            } catch (error) {}
        });
    }

    /**
     * Manage connections based on current route
     * This is optional - only if you want to connect/disconnect based on navigation
     */
    private manageConnectionsBasedOnRoute(): void {
        const currentUrl = this.router.url;

        // Example: Only connect to assets WebSocket when on assets page
        if (currentUrl.includes('/assets') && !this.connectedNamespaces.has('/assets')) {
            try {
                this.webSocketService.connect('/assets');
                this.connectedNamespaces.add('/assets');
            } catch (error) {}
        }

        // Add similar logic for other routes as needed
    }

    /**
     * Disconnect from a specific namespace
     */
    disconnectFromNamespace(namespace: string): void {
        this.webSocketService.disconnect(namespace);
        this.connectedNamespaces.delete(namespace);
    }

    /**
     * Disconnect from all namespaces
     * Call this on logout
     */
    disconnectAll(): void {
        this.webSocketService.disconnectAll();
        this.connectedNamespaces.clear();
    }

    /**
     * Check if connected to a namespace
     */
    isConnectedTo(namespace: string): boolean {
        return this.connectedNamespaces.has(namespace) && this.webSocketService.isConnected(namespace);
    }

    /**
     * Get list of connected namespaces
     */
    getConnectedNamespaces(): string[] {
        return Array.from(this.connectedNamespaces);
    }

    ngOnDestroy(): void {
        this.disconnectAll();
    }
}

/**
 * USAGE IN APP.COMPONENT.TS:
 *
 * import { Component, OnInit, OnDestroy } from '@angular/core';
 * import { Router } from '@angular/router';
 * import { AuthService } from './pages/service/auth.service';
 * import { WebSocketService } from './shared/services/websocket.service';
 *
 * @Component({
 *     selector: 'app-root',
 *     templateUrl: './app.component.html'
 * })
 * export class AppComponent implements OnInit, OnDestroy {
 *     private wsManager: WebSocketConnectionManager;
 *
 *     constructor(
 *         private authService: AuthService,
 *         private webSocketService: WebSocketService,
 *         private router: Router
 *     ) {
 *         this.wsManager = new WebSocketConnectionManager(
 *             authService,
 *             webSocketService,
 *             router
 *         );
 *     }
 *
 *     ngOnInit() {
 *         // Initialize WebSocket connections if user is already logged in
 *         if (this.authService.isLoggedIn()) {
 *             this.wsManager.ngOnInit();
 *         }
 *
 *         // Listen for login events to connect WebSockets
 *         // This depends on how your login flow works
 *     }
 *
 *     ngOnDestroy() {
 *         this.wsManager.ngOnDestroy();
 *     }
 *
 *     onLogout() {
 *         this.wsManager.disconnectAll();
 *         this.authService.logout();
 *         this.router.navigate(['/login']);
 *     }
 * }
 */
