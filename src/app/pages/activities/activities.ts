import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ActivitiesService, Activity, ActivitiesResponse } from '../service/activities.service';
import { ActivitiesWebSocketService } from './activities-websocket.service';

@Component({
    selector: 'app-activities',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, CardModule, ProgressSpinnerModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast />
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h2 class="text-2xl font-bold mb-1">Activity Logs</h2>
                    <p class="text-muted-color">View your activity history and system logs.</p>
                </div>
            </div>

            <!-- View Toggle Buttons -->
            <div class="flex gap-2 mb-4">
                <p-button label="My Logs" icon="pi pi-user" [outlined]="activeView !== 'my-logs'" (onClick)="activeView = 'my-logs'" />
                <p-button *ngIf="isSuperAdmin" label="System Logs" icon="pi pi-globe" [outlined]="activeView !== 'system-logs'" (onClick)="activeView = 'system-logs'" />
            </div>

            <!-- My Logs View -->
            <ng-container *ngIf="activeView === 'my-logs'">
                <!-- Loading Spinner -->
                <div *ngIf="isLoadingMyLogs" class="flex justify-center items-center py-8">
                    <p-progressSpinner />
                </div>

                <!-- Table -->
                <p-table [value]="myLogs" [rows]="10" [paginator]="true" [rowsPerPageOptions]="[10, 20, 50]" [tableStyle]="{ 'min-width': '75rem' }" [loading]="isLoadingMyLogs" *ngIf="!isLoadingMyLogs && myLogs.length > 0">
                    <ng-template pTemplate="header">
                        <tr>
                            <th style="width: 20%">Trans #</th>
                            <th style="width: 25%">Date/Time</th>
                            <th style="width: 55%">Activities</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-row>
                        <tr>
                            <td>
                                <span class="font-semibold text-blue-600">{{ row.activityId }}</span>
                            </td>
                            <td>
                                {{ formatDateTime(row.timestamp) }}
                            </td>
                            <td>
                                <div class="flex flex-col gap-1">
                                    <div>
                                        <span class="font-semibold">{{ getActivityTitle(row) }}</span>
                                    </div>
                                    <div class="text-sm text-muted-color">
                                        {{ row.description }}
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">
                                        <span [ngClass]="getStatusClass(row.status)" class="px-2 py-1 rounded">{{ row.status }}</span>
                                        <span class="ml-2">{{ row.userRole }}</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="3" class="text-center py-4">No activity logs found.</td>
                        </tr>
                    </ng-template>
                </p-table>

                <!-- Empty State -->
                <div *ngIf="!isLoadingMyLogs && myLogs.length === 0" class="text-center py-8 text-muted-color">
                    <i class="pi pi-inbox text-4xl mb-3"></i>
                    <p>No activity logs found.</p>
                </div>
            </ng-container>

            <!-- System Logs View (SuperAdmin Only) -->
            <ng-container *ngIf="activeView === 'system-logs' && isSuperAdmin">
                <!-- Loading Spinner -->
                <div *ngIf="isLoadingSystemLogs" class="flex justify-center items-center py-8">
                    <p-progressSpinner />
                </div>

                <!-- Table -->
                <p-table [value]="systemLogs" [rows]="10" [paginator]="true" [rowsPerPageOptions]="[10, 20, 50]" [tableStyle]="{ 'min-width': '75rem' }" [loading]="isLoadingSystemLogs" *ngIf="!isLoadingSystemLogs && systemLogs.length > 0">
                    <ng-template pTemplate="header">
                        <tr>
                            <th style="width: 20%">Trans #</th>
                            <th style="width: 25%">Date/Time</th>
                            <th style="width: 55%">Activities</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-row>
                        <tr>
                            <td>
                                <span class="font-semibold text-blue-600">{{ row.activityId }}</span>
                            </td>
                            <td>
                                {{ formatDateTime(row.timestamp) }}
                            </td>
                            <td>
                                <div class="flex flex-col gap-1">
                                    <div>
                                        <span class="font-semibold">{{ getActivityTitle(row) }}</span>
                                    </div>
                                    <div class="text-sm text-muted-color">
                                        {{ row.description }}
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">
                                        <span [ngClass]="getStatusClass(row.status)" class="px-2 py-1 rounded">{{ row.status }}</span>
                                        <span class="ml-2">{{ row.userRole }}</span>
                                        <span class="ml-2">by {{ row.actor?.firstName }} {{ row.actor?.lastName }}</span>
                                        <span class="ml-2" *ngIf="row.ipAddress">IP: {{ row.ipAddress }}</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="3" class="text-center py-4">No system logs found.</td>
                        </tr>
                    </ng-template>
                </p-table>

                <!-- Empty State -->
                <div *ngIf="!isLoadingSystemLogs && systemLogs.length === 0" class="text-center py-8 text-muted-color">
                    <i class="pi pi-inbox text-4xl mb-3"></i>
                    <p>No system logs found.</p>
                </div>
            </ng-container>
        </div>
    `
})
export class ActivitiesComponent implements OnInit, OnDestroy {
    myLogs: Activity[] = [];
    systemLogs: Activity[] = [];
    isLoadingMyLogs = false;
    isLoadingSystemLogs = false;
    isSuperAdmin = false;
    activeView: 'my-logs' | 'system-logs' = 'my-logs';

    constructor(
        private activitiesService: ActivitiesService,
        private activitiesWebSocketService: ActivitiesWebSocketService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.checkUserRole();
        this.loadMyLogs();
        if (this.isSuperAdmin) {
            this.loadSystemLogs();
        }
        this.connectToWebSocket();
    }

    /**
     * Connect to WebSocket and subscribe to real-time activity updates
     */
    connectToWebSocket(): void {
        // Check if user is authenticated before connecting
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠️ Skipping WebSocket connection - user not authenticated');
            return;
        }

        try {
            this.activitiesWebSocketService.connect();

            // Listen for new activity logs
            this.activitiesWebSocketService.onActivityLogged().subscribe({
                next: (event) => {
                    if (event.success) {
                        // Add the new activity to the appropriate list
                        const currentUser = localStorage.getItem('currentUser');
                        if (currentUser) {
                            const user = JSON.parse(currentUser);
                            if (event.data.user === user.userId || (event.data as any).actor?.userId === user.userId) {
                                this.myLogs.unshift(event.data);
                            }
                        }

                        // If SuperAdmin, also add to system logs
                        if (this.isSuperAdmin) {
                            this.systemLogs.unshift(event.data);
                        }

                        // Show notification
                        this.messageService.add({
                            severity: 'info',
                            summary: 'New Activity',
                            detail: 'New activity has been logged',
                            life: 3000
                        });
                    }
                },
                error: (error) => {}
            });
        } catch (error) {}
    }

    /**
     * Disconnect from WebSocket when component is destroyed
     */
    ngOnDestroy(): void {
        this.activitiesWebSocketService.disconnect();
    }

    checkUserRole(): void {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                this.isSuperAdmin = user.role === 'SuperAdmin';
            } catch (error) {
                this.isSuperAdmin = false;
            }
        }
    }

    loadMyLogs(): void {
        this.isLoadingMyLogs = true;
        this.activitiesService.getMyLogs().subscribe({
            next: (response) => {
                this.myLogs = response.activities;
                this.isLoadingMyLogs = false;
            },
            error: (error) => {
                this.isLoadingMyLogs = false;
            }
        });
    }

    loadSystemLogs(): void {
        this.isLoadingSystemLogs = true;
        this.activitiesService.getSystemLogs().subscribe({
            next: (response) => {
                this.systemLogs = response.activities;
                this.isLoadingSystemLogs = false;
            },
            error: (error) => {
                this.isLoadingSystemLogs = false;
            }
        });
    }

    getActivityTitle(activity: Activity): string {
        const actionType = activity.actionType || '';
        const entityType = activity.entityType || '';

        // Format action type to readable text
        const formatted = actionType
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        return `${formatted} - ${activity.targetName || entityType}`;
    }

    formatDateTime(timestamp: string): string {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    getStatusClass(status: string): string {
        if (status === 'Success') {
            return 'bg-green-100 text-green-800';
        } else if (status === 'Failed') {
            return 'bg-red-100 text-red-800';
        } else {
            return 'bg-yellow-100 text-yellow-800';
        }
    }
}
