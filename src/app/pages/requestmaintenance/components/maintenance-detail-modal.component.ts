/**
 * Maintenance Detail Modal Component
 * Displays maintenance details with visual timeline
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MaintenanceApproval, MaintenanceTimeline, MaintenanceTimelineEvent } from '../../models/maintenance.models';
import { MaintenanceUtils } from '../utils/maintenance.utils';
import { MaintenanceConstants } from '../constants/maintenance.constants';

@Component({
    selector: 'app-maintenance-detail-modal',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule, TagModule, DividerModule],
    template: `
        <p-dialog [(visible)]="visible" [modal]="true" [closable]="true" [maximizable]="true" [style]="{ width: '800px', maxHeight: '90vh' }" header="Maintenance Details & Timeline" (onHide)="onClose()">
            <div *ngIf="approval" class="maintenance-detail">
                <!-- Header Section -->
                <div class="detail-header mb-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="text-xl font-bold">{{ approval.maintenanceRequest?.maintenanceName }}</h3>
                            <p class="text-gray-600">{{ approval.maintenanceApprovalId }}</p>
                        </div>
                        <p-tag [value]="getCurrentStatus()" [severity]="getStatusSeverity(getCurrentStatus())" [style]="{ fontSize: '1rem', padding: '0.5rem 1rem' }" />
                    </div>
                </div>

                <p-divider />

                <!-- Asset & Request Information -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Asset Information</h4>
                        <div class="space-y-2 text-sm">
                            <div><span class="font-medium">Asset:</span> {{ approval.maintenanceRequest?.asset?.assetName }}</div>
                            <div><span class="font-medium">Property No:</span> {{ approval.maintenanceRequest?.asset?.propertyNumber || 'N/A' }}</div>
                            <div><span class="font-medium">Campus:</span> {{ approval.maintenanceRequest?.asset?.campus?.campusName }}</div>
                            <div><span class="font-medium">Laboratory:</span> {{ approval.maintenanceRequest?.asset?.laboratories?.laboratoryName || 'N/A' }}</div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Request Information</h4>
                        <div class="space-y-2 text-sm">
                            <div><span class="font-medium">Requested By:</span> {{ formatUserName(approval.maintenanceRequest?.requestedBy) }}</div>
                            <div><span class="font-medium">Assigned To:</span> {{ formatUserName(approval.assignedTechnician) }}</div>
                            <div>
                                <span class="font-medium">Priority:</span>
                                <p-tag
                                    *ngIf="approval.maintenanceRequest?.priorityLevel"
                                    [value]="approval.maintenanceRequest.priorityLevel.priorityLevelName"
                                    [severity]="getPrioritySeverity(approval.maintenanceRequest.priorityLevel.priorityLevelName)"
                                    class="ml-2"
                                />
                            </div>
                            <div><span class="font-medium">Scheduled:</span> {{ formatDate(approval.scheduledAt) }}</div>
                        </div>
                    </div>
                </div>

                <p-divider />

                <!-- Timeline Section -->
                <div class="timeline-section mb-4">
                    <h4 class="font-semibold text-gray-700 mb-3">Status Timeline</h4>

                    <div class="timeline" *ngIf="timeline">
                        <div *ngFor="let event of timeline.events; let i = index; let last = last" class="timeline-item" [class.last]="last">
                            <div class="timeline-marker" [class.completed]="true" [style.background-color]="getEventColor(event)">
                                <i [class]="getEventIcon(event)"></i>
                            </div>

                            <div class="timeline-content">
                                <div class="flex justify-between items-start mb-1">
                                    <div>
                                        <span class="font-semibold">{{ event.status }}</span>
                                        <span *ngIf="event.actor" class="text-sm text-gray-600 ml-2">by {{ formatUserName(event.actor) }}</span>
                                    </div>
                                    <span class="text-sm text-gray-500">{{ formatDate(event.timestamp) }}</span>
                                </div>

                                <div *ngIf="event.reason" class="text-sm text-gray-700 mb-1"><span class="font-medium">Reason:</span> {{ event.reason }}</div>

                                <div *ngIf="event.notes" class="text-sm text-gray-700 mb-1"><span class="font-medium">Notes:</span> {{ event.notes }}</div>

                                <div *ngIf="event.actionTaken" class="text-sm text-gray-700 mb-1"><span class="font-medium">Action Taken:</span> {{ event.actionTaken }}</div>

                                <div *ngIf="event.observations" class="text-sm text-gray-700"><span class="font-medium">Observations:</span> {{ event.observations }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <p-divider *ngIf="approval.isCompleted" />

                <!-- Completion Details (if completed) -->
                <div *ngIf="approval.isCompleted" class="completion-details">
                    <h4 class="font-semibold text-gray-700 mb-3">Completion Details</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="font-medium">Expected Reading:</span>
                            <p class="text-gray-700">{{ approval.expectedReading || 'N/A' }}</p>
                        </div>
                        <div>
                            <span class="font-medium">Actual Reading:</span>
                            <p class="text-gray-700">{{ approval.actualReading || 'N/A' }}</p>
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="font-medium">Performed By:</span>
                        <span class="text-gray-700 ml-2">{{ formatUserName(approval.performedBy) }}</span>
                    </div>
                </div>
            </div>

            <ng-template #footer>
                <p-button label="Close" icon="pi pi-times" severity="secondary" (onClick)="onClose()" />
            </ng-template>
        </p-dialog>
    `,
    styles: [
        `
            .timeline {
                position: relative;
                padding-left: 40px;
            }

            .timeline-item {
                position: relative;
                padding-bottom: 30px;
            }

            .timeline-item:not(.last)::before {
                content: '';
                position: absolute;
                left: -25px;
                top: 35px;
                width: 2px;
                height: calc(100% - 20px);
                background-color: #e5e7eb;
            }

            .timeline-marker {
                position: absolute;
                left: -35px;
                top: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .timeline-marker.completed {
                background-color: #10b981;
            }

            .timeline-content {
                background-color: #f9fafb;
                padding: 12px;
                border-radius: 6px;
                border-left: 3px solid #e5e7eb;
            }

            .detail-header {
                background-color: #f9fafb;
                padding: 16px;
                border-radius: 8px;
            }
        `
    ]
})
export class MaintenanceDetailModalComponent implements OnChanges {
    @Input() visible: boolean = false;
    @Input() approval: MaintenanceApproval | null = null;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() close = new EventEmitter<void>();

    timeline: MaintenanceTimeline | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['approval'] && this.approval) {
            this.timeline = MaintenanceUtils.buildTimeline(this.approval);
        }
    }

    onClose(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.close.emit();
    }

    getCurrentStatus(): string {
        return this.approval?.maintenanceRequest?.maintenanceStatus?.requestStatusName || 'Unknown';
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        return MaintenanceConstants.getStatusSeverity(status);
    }

    getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        return MaintenanceConstants.getPrioritySeverity(priority);
    }

    formatUserName(user: any): string {
        return MaintenanceUtils.formatUserName(user);
    }

    formatDate(date: Date | string | undefined): string {
        return MaintenanceUtils.formatDate(date);
    }

    getEventColor(event: MaintenanceTimelineEvent): string {
        const severity = MaintenanceConstants.getStatusSeverity(event.status);
        const colorMap = {
            success: '#10b981',
            info: '#3b82f6',
            warn: '#f59e0b',
            danger: '#ef4444',
            secondary: '#6b7280'
        };
        return colorMap[severity] || '#6b7280';
    }

    getEventIcon(event: MaintenanceTimelineEvent): string {
        const iconMap: Record<string, string> = {
            approved: 'pi pi-check',
            scheduled_confirmed: 'pi pi-calendar-check',
            started: 'pi pi-play',
            held: 'pi pi-pause',
            resumed: 'pi pi-play',
            completed: 'pi pi-check-circle',
            declined: 'pi pi-times'
        };
        return iconMap[event.eventType] || 'pi pi-circle';
    }
}
