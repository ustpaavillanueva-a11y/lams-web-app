/**
 * Maintenance Utilities
 * Helper functions for filtering, timeline building, and validation
 */

import { MaintenanceApproval, MaintenanceTimelineEvent, TimelineEventType, MaintenanceTimeline, MaintenanceStatus, MaintenanceFilter } from '../../models/maintenance.models';
import { MaintenanceConstants } from '../constants/maintenance.constants';

export class MaintenanceUtils {
    // ==================== TIMELINE BUILDING ====================

    /**
     * Transform MaintenanceApproval timestamps into a chronological timeline
     */
    static buildTimeline(approval: MaintenanceApproval): MaintenanceTimeline {
        const events: MaintenanceTimelineEvent[] = [];

        // Approved event
        if (approval.approvedAt) {
            events.push({
                status: MaintenanceStatus.APPROVED,
                timestamp: approval.approvedAt,
                actor: approval.assignedTechnician,
                reason: approval.reason,
                eventType: TimelineEventType.APPROVED
            });
        }

        // Schedule confirmed event
        if (approval.scheduledConfirmedAt) {
            events.push({
                status: MaintenanceStatus.SCHEDULED,
                timestamp: approval.scheduledConfirmedAt,
                eventType: TimelineEventType.SCHEDULED_CONFIRMED,
                notes: 'Schedule availability confirmed'
            });
        }

        // In Progress event
        if (approval.inProgressAt) {
            events.push({
                status: MaintenanceStatus.IN_PROGRESS,
                timestamp: approval.inProgressAt,
                actor: approval.performedBy,
                eventType: TimelineEventType.STARTED,
                notes: 'Maintenance work started'
            });
        }

        // On Hold event
        if (approval.onHoldAt) {
            events.push({
                status: MaintenanceStatus.ON_HOLD,
                timestamp: approval.onHoldAt,
                reason: approval.onHoldReason,
                eventType: TimelineEventType.HELD,
                notes: 'Work put on hold'
            });
        }

        // Resumed event
        if (approval.resumedAt) {
            events.push({
                status: MaintenanceStatus.IN_PROGRESS,
                timestamp: approval.resumedAt,
                eventType: TimelineEventType.RESUMED,
                notes: 'Work resumed from hold'
            });
        }

        // Completed event
        if (approval.completedAt) {
            events.push({
                status: MaintenanceStatus.COMPLETED,
                timestamp: approval.completedAt,
                actor: approval.performedBy,
                actionTaken: approval.actionTaken,
                observations: approval.observations,
                eventType: TimelineEventType.COMPLETED
            });
        }

        // Declined event
        if (approval.declinedAt) {
            events.push({
                status: MaintenanceStatus.DISAPPROVED,
                timestamp: approval.declinedAt,
                actor: approval.declinedBy,
                reason: approval.reason,
                eventType: TimelineEventType.DECLINED
            });
        }

        // Sort events chronologically (oldest first)
        events.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateA - dateB;
        });

        return {
            events,
            currentStatus: approval.maintenanceRequest?.maintenanceStatus?.requestStatusName || MaintenanceStatus.PENDING,
            isCompleted: approval.isCompleted
        };
    }

    /**
     * Get the most recent timeline event
     */
    static getLatestEvent(approval: MaintenanceApproval): MaintenanceTimelineEvent | null {
        const timeline = this.buildTimeline(approval);
        return timeline.events.length > 0 ? timeline.events[timeline.events.length - 1] : null;
    }

    // ==================== FILTERING ====================

    /**
     * Filter maintenance approvals based on multiple criteria
     */
    static filterMaintenanceApprovals(approvals: MaintenanceApproval[], filter: MaintenanceFilter): MaintenanceApproval[] {
        return approvals.filter((approval) => {
            // Search term (asset name, property number, requester name)
            if (filter.searchTerm) {
                const searchLower = filter.searchTerm.toLowerCase();
                const assetName = approval.maintenanceRequest?.asset?.assetName?.toLowerCase() || '';
                const propertyNumber = approval.maintenanceRequest?.asset?.propertyNumber?.toLowerCase() || '';
                const requesterName = `${approval.maintenanceRequest?.requestedBy?.firstName} ${approval.maintenanceRequest?.requestedBy?.lastName}`.toLowerCase();

                const matchesSearch = assetName.includes(searchLower) || propertyNumber.includes(searchLower) || requesterName.includes(searchLower);

                if (!matchesSearch) return false;
            }

            // Campus filter
            if (filter.campusId) {
                const matchesCampus = approval.maintenanceRequest?.asset?.campus?.campusId === filter.campusId;
                if (!matchesCampus) return false;
            }

            // Status filter
            if (filter.status) {
                const matchesStatus = approval.maintenanceRequest?.maintenanceStatus?.requestStatusName === filter.status;
                if (!matchesStatus) return false;
            }

            // Priority filter
            if (filter.priorityLevel) {
                const matchesPriority = approval.maintenanceRequest?.priorityLevel?.priorityLevelId === filter.priorityLevel;
                if (!matchesPriority) return false;
            }

            // Maintenance type filter
            if (filter.maintenanceType) {
                const matchesType = approval.maintenanceRequest?.maintenanceType?.maintenanceTypeId === filter.maintenanceType;
                if (!matchesType) return false;
            }

            // Date range filter
            if (filter.dateFrom) {
                const requestDate = new Date(approval.maintenanceRequest?.requestDate || approval.maintenanceRequest?.createdAt || '');
                const fromDate = new Date(filter.dateFrom);
                if (requestDate < fromDate) return false;
            }

            if (filter.dateTo) {
                const requestDate = new Date(approval.maintenanceRequest?.requestDate || approval.maintenanceRequest?.createdAt || '');
                const toDate = new Date(filter.dateTo);
                if (requestDate > toDate) return false;
            }

            // Overdue filter
            if (filter.isOverdue !== undefined) {
                const isOverdue = MaintenanceConstants.isOverdue(approval.scheduledAt);
                if (filter.isOverdue !== isOverdue) return false;
            }

            // Assigned technician filter
            if (filter.assignedTechnicianId) {
                const matchesTechnician = approval.assignedTechnician?.userId === filter.assignedTechnicianId;
                if (!matchesTechnician) return false;
            }

            return true;
        });
    }

    /**
     * Filter approvals by status
     */
    static filterByStatus(approvals: MaintenanceApproval[], status: string): MaintenanceApproval[] {
        return approvals.filter((approval) => approval.maintenanceRequest?.maintenanceStatus?.requestStatusName === status);
    }

    /**
     * Get overdue approvals only
     */
    static getOverdueApprovals(approvals: MaintenanceApproval[]): MaintenanceApproval[] {
        return approvals.filter((approval) => approval.scheduledAt && !approval.isCompleted && approval.maintenanceRequest?.maintenanceStatus?.requestStatusName !== MaintenanceStatus.COMPLETED && MaintenanceConstants.isOverdue(approval.scheduledAt));
    }

    // ==================== VALIDATION ====================

    /**
     * Validate if a status transition is allowed
     */
    static validateTransition(currentStatus: string, nextStatus: string): { valid: boolean; error?: string } {
        const isValid = MaintenanceConstants.isValidTransition(currentStatus, nextStatus);

        if (!isValid) {
            const allowedStatuses = MaintenanceConstants.getAllowedNextStatuses(currentStatus);
            return {
                valid: false,
                error: `Invalid status transition from "${currentStatus}" to "${nextStatus}". Allowed transitions: ${allowedStatuses.join(', ')}`
            };
        }

        return { valid: true };
    }

    /**
     * Check if user can perform action based on role and campus
     */
    static canPerformActionOnApproval(approval: MaintenanceApproval, userRole: string, userCampusId: string | undefined, userId: string | undefined): { allowed: boolean; reason?: string } {
        // Super Admin can do everything
        if (userRole === 'SuperAdmin') {
            return { allowed: true };
        }

        // Campus check for Campus Admin and Lab Tech
        if (userRole === 'CampusAdmin' || userRole === 'LabTech') {
            const approvalCampusId = approval.maintenanceRequest?.asset?.campus?.campusId;

            if (approvalCampusId !== userCampusId) {
                return {
                    allowed: false,
                    reason: 'You can only manage maintenance from your own campus'
                };
            }
        }

        // Lab Tech additional check - must be assigned or self-assignable
        if (userRole === 'LabTech') {
            const isAssigned = approval.assignedTechnician?.userId === userId;

            // Allow if already assigned or if no technician assigned yet
            if (!isAssigned && approval.assignedTechnician) {
                return {
                    allowed: false,
                    reason: 'This maintenance is assigned to another technician'
                };
            }
        }

        // Faculty can only view their own requests
        if (userRole === 'Faculty') {
            const isOwnRequest = approval.maintenanceRequest?.requestedBy?.userId === userId;

            if (!isOwnRequest) {
                return {
                    allowed: false,
                    reason: 'You can only view your own maintenance requests'
                };
            }
        }

        return { allowed: true };
    }

    // ==================== SUMMARY & STATISTICS ====================

    /**
     * Calculate summary statistics from approvals array
     */
    static calculateSummary(approvals: MaintenanceApproval[]) {
        return {
            totalCount: approvals.length,
            pendingCount: this.filterByStatus(approvals, MaintenanceStatus.PENDING).length,
            scheduledCount: this.filterByStatus(approvals, MaintenanceStatus.SCHEDULED).length,
            approvedCount: this.filterByStatus(approvals, MaintenanceStatus.APPROVED).length,
            inProgressCount: this.filterByStatus(approvals, MaintenanceStatus.IN_PROGRESS).length,
            onHoldCount: this.filterByStatus(approvals, MaintenanceStatus.ON_HOLD).length,
            completedCount: this.filterByStatus(approvals, MaintenanceStatus.COMPLETED).length,
            overdueCount: this.getOverdueApprovals(approvals).length
        };
    }

    // ==================== FORMATTING ====================

    /**
     * Format user full name
     */
    static formatUserName(user: { firstName?: string; lastName?: string } | undefined): string {
        if (!user) return 'N/A';
        return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
    }

    /**
     * Format date for display
     */
    static formatDate(date: Date | string | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString();
    }

    /**
     * Get relative time (e.g., "2 hours ago", "3 days ago")
     */
    static getRelativeTime(date: Date | string): string {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

        return this.formatDate(date);
    }

    /**
     * Get status badge tooltip text
     */
    static getStatusTooltip(approval: MaintenanceApproval): string {
        const latestEvent = this.getLatestEvent(approval);
        if (!latestEvent) return 'No status updates yet';

        const timeAgo = this.getRelativeTime(latestEvent.timestamp);
        return `Last updated: ${timeAgo}`;
    }
}
