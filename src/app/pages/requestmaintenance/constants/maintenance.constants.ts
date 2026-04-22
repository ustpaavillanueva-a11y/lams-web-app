/**
 * Maintenance Constants
 * Status mappings, transitions, role permissions, and action configurations
 */

import { MaintenanceStatus, MaintenanceAction, UserRole, StatusTransition, RolePermissions } from '../../models/maintenance.models';

export class MaintenanceConstants {
    // ==================== STATUS SEVERITY MAPPINGS ====================

    /**
     * Maps maintenance request status to PrimeNG severity for consistent badge styling
     */
    static getStatusSeverity(status: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (!status) return 'secondary';

        const statusLower = status.toLowerCase();

        // Completed states
        if (statusLower.includes('completed')) return 'success';
        if (statusLower.includes('serviceable')) return 'success';

        // Active/Scheduled states
        if (statusLower.includes('scheduled')) return 'success';
        if (statusLower.includes('approved')) return 'success';

        // In-progress/Warning states
        if (statusLower.includes('in progress')) return 'warn';
        if (statusLower.includes('progress')) return 'warn';
        if (statusLower.includes('pending')) return 'info';

        // Critical/Hold states
        if (statusLower.includes('on hold')) return 'danger';
        if (statusLower.includes('hold')) return 'danger';
        if (statusLower.includes('overdue')) return 'danger';

        // Declined/Rejected/Cancelled states
        if (statusLower.includes('cancelled')) return 'danger';
        if (statusLower.includes('disapproved')) return 'secondary';
        if (statusLower.includes('declined')) return 'secondary';
        if (statusLower.includes('rejected')) return 'secondary';

        return 'secondary';
    }

    // ==================== VALID STATUS TRANSITIONS ====================

    /**
     * Defines allowed status transitions for validation
     *
     * NEW WORKFLOW (aligned with API documentation):
     * Pending → Scheduled (when admin assigns technician and sets schedule)
     * Scheduled → In Progress (when lab tech starts work on scheduled day)
     * In Progress → On Hold (when work needs to pause)
     * On Hold → In Progress (when work resumes)
     * In Progress → Completed (when work is finished)
     * Scheduled/In Progress/On Hold → Cancelled (when maintenance is cancelled)
     *
     * Note: APPROVED status is kept for backward compatibility (legacy records).
     * In the new workflow, "Approved" has been renamed to "Scheduled".
     */
    static readonly STATUS_TRANSITIONS: StatusTransition[] = [
        {
            from: MaintenanceStatus.PENDING,
            to: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.APPROVED, MaintenanceStatus.DISAPPROVED]
        },
        {
            from: MaintenanceStatus.SCHEDULED,
            to: [MaintenanceStatus.APPROVED, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.DISAPPROVED, MaintenanceStatus.CANCELLED]
        },
        {
            // Legacy status - treat same as SCHEDULED
            from: MaintenanceStatus.APPROVED,
            to: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.DISAPPROVED, MaintenanceStatus.CANCELLED]
        },
        {
            from: MaintenanceStatus.IN_PROGRESS,
            to: [MaintenanceStatus.ON_HOLD, MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED]
        },
        {
            from: MaintenanceStatus.ON_HOLD,
            to: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED]
        },
        {
            from: MaintenanceStatus.COMPLETED,
            to: [] // Terminal state
        },
        {
            from: MaintenanceStatus.DISAPPROVED,
            to: [] // Terminal state
        },
        {
            from: MaintenanceStatus.CANCELLED,
            to: [] // Terminal state
        }
    ];

    /**
     * Check if a status transition is valid
     */
    static isValidTransition(currentStatus: string, nextStatus: string): boolean {
        const transition = this.STATUS_TRANSITIONS.find((t) => t.from === currentStatus);
        return transition ? transition.to.includes(nextStatus as MaintenanceStatus) : false;
    }

    /**
     * Get allowed next statuses for a given current status
     */
    static getAllowedNextStatuses(currentStatus: string): MaintenanceStatus[] {
        const transition = this.STATUS_TRANSITIONS.find((t) => t.from === currentStatus);
        return transition ? transition.to : [];
    }

    // ==================== ROLE PERMISSIONS ====================

    /**
     * Defines which actions each role can perform
     */
    static readonly ROLE_PERMISSIONS: RolePermissions[] = [
        {
            role: UserRole.SUPER_ADMIN,
            allowedActions: [
                MaintenanceAction.APPROVE,
                MaintenanceAction.DECLINE,
                MaintenanceAction.CONFIRM_SCHEDULE,
                MaintenanceAction.START,
                MaintenanceAction.HOLD,
                MaintenanceAction.RESUME,
                MaintenanceAction.COMPLETE,
                MaintenanceAction.CANCEL,
                MaintenanceAction.VIEW,
                MaintenanceAction.DELETE,
                MaintenanceAction.ASSIGN_TECHNICIAN
            ]
        },
        {
            role: UserRole.CAMPUS_ADMIN,
            allowedActions: [
                MaintenanceAction.APPROVE,
                MaintenanceAction.DECLINE,
                MaintenanceAction.CONFIRM_SCHEDULE,
                MaintenanceAction.START,
                MaintenanceAction.HOLD,
                MaintenanceAction.RESUME,
                MaintenanceAction.COMPLETE,
                MaintenanceAction.CANCEL,
                MaintenanceAction.VIEW,
                MaintenanceAction.DELETE,
                MaintenanceAction.ASSIGN_TECHNICIAN
            ]
        },
        {
            role: UserRole.LAB_TECH,
            allowedActions: [
                MaintenanceAction.APPROVE,
                MaintenanceAction.DECLINE,
                MaintenanceAction.CONFIRM_SCHEDULE,
                MaintenanceAction.START,
                MaintenanceAction.HOLD,
                MaintenanceAction.RESUME,
                MaintenanceAction.COMPLETE,
                MaintenanceAction.CANCEL,
                MaintenanceAction.VIEW
            ]
        },
        {
            role: UserRole.FACULTY,
            allowedActions: [MaintenanceAction.VIEW]
        }
    ];

    /**
     * Check if a role can perform an action
     */
    static canPerformAction(role: string, action: MaintenanceAction): boolean {
        const permissions = this.ROLE_PERMISSIONS.find((p) => p.role === role);
        return permissions ? permissions.allowedActions.includes(action) : false;
    }

    // ==================== ACTION BUTTON CONFIGURATIONS ====================

    /**
     * Get available action buttons based on current status and user role
     */
    static getAvailableActions(status: string, role: string, isAssigned: boolean = false): MaintenanceAction[] {
        const actions: MaintenanceAction[] = [];

        // Always allow view
        if (this.canPerformAction(role, MaintenanceAction.VIEW)) {
            actions.push(MaintenanceAction.VIEW);
        }

        // Status-based actions
        switch (status) {
            case MaintenanceStatus.PENDING:
                if (this.canPerformAction(role, MaintenanceAction.APPROVE) && role !== UserRole.LAB_TECH) {
                    actions.push(MaintenanceAction.APPROVE);
                }
                if (this.canPerformAction(role, MaintenanceAction.DECLINE) && role !== UserRole.LAB_TECH) {
                    actions.push(MaintenanceAction.DECLINE);
                }
                if (this.canPerformAction(role, MaintenanceAction.CONFIRM_SCHEDULE)) {
                    actions.push(MaintenanceAction.CONFIRM_SCHEDULE);
                }
                break;

            case MaintenanceStatus.SCHEDULED:
                if (this.canPerformAction(role, MaintenanceAction.START) && (isAssigned || role !== UserRole.LAB_TECH)) {
                    actions.push(MaintenanceAction.START);
                }
                if (this.canPerformAction(role, MaintenanceAction.DECLINE) && role !== UserRole.LAB_TECH) {
                    actions.push(MaintenanceAction.DECLINE);
                }
                if (this.canPerformAction(role, MaintenanceAction.CANCEL)) {
                    actions.push(MaintenanceAction.CANCEL);
                }
                break;

            case MaintenanceStatus.APPROVED:
                if (this.canPerformAction(role, MaintenanceAction.START) && (isAssigned || role !== UserRole.LAB_TECH)) {
                    actions.push(MaintenanceAction.START);
                }
                if (this.canPerformAction(role, MaintenanceAction.DECLINE) && role !== UserRole.LAB_TECH) {
                    actions.push(MaintenanceAction.DECLINE);
                }
                break;

            case MaintenanceStatus.IN_PROGRESS:
                if (this.canPerformAction(role, MaintenanceAction.HOLD) && (isAssigned || role !== UserRole.LAB_TECH)) {
                    actions.push(MaintenanceAction.HOLD);
                }
                if (this.canPerformAction(role, MaintenanceAction.COMPLETE) && (isAssigned || role !== UserRole.LAB_TECH)) {
                    actions.push(MaintenanceAction.COMPLETE);
                }
                if (this.canPerformAction(role, MaintenanceAction.CANCEL)) {
                    actions.push(MaintenanceAction.CANCEL);
                }
                break;

            case MaintenanceStatus.ON_HOLD:
                if (this.canPerformAction(role, MaintenanceAction.RESUME) && (isAssigned || role !== UserRole.LAB_TECH)) {
                    actions.push(MaintenanceAction.RESUME);
                }
                if (this.canPerformAction(role, MaintenanceAction.CANCEL)) {
                    actions.push(MaintenanceAction.CANCEL);
                }
                break;

            case MaintenanceStatus.COMPLETED:
                if (this.canPerformAction(role, MaintenanceAction.DELETE) && role !== UserRole.LAB_TECH) {
                    actions.push(MaintenanceAction.DELETE);
                }
                break;

            case MaintenanceStatus.CANCELLED:
                if (this.canPerformAction(role, MaintenanceAction.DELETE) && role !== UserRole.LAB_TECH) {
                    actions.push(MaintenanceAction.DELETE);
                }
                break;

            case MaintenanceStatus.DISAPPROVED:
                if (this.canPerformAction(role, MaintenanceAction.DELETE) && role !== UserRole.LAB_TECH) {
                    actions.push(MaintenanceAction.DELETE);
                }
                break;
        }

        return actions;
    }

    /**
     * Get button configuration for an action
     */
    static getButtonConfig(action: MaintenanceAction): {
        label: string;
        icon: string;
        severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
        tooltip: string;
    } {
        const configs = {
            [MaintenanceAction.APPROVE]: {
                label: 'Approve',
                icon: 'pi pi-check',
                severity: 'success' as const,
                tooltip: 'Approve maintenance request'
            },
            [MaintenanceAction.DECLINE]: {
                label: 'Decline',
                icon: 'pi pi-times',
                severity: 'danger' as const,
                tooltip: 'Decline maintenance request'
            },
            [MaintenanceAction.CONFIRM_SCHEDULE]: {
                label: 'Confirm',
                icon: 'pi pi-calendar-check',
                severity: 'success' as const,
                tooltip: 'Confirm schedule availability'
            },
            [MaintenanceAction.START]: {
                label: 'Start',
                icon: 'pi pi-play',
                severity: 'info' as const,
                tooltip: 'Start maintenance work'
            },
            [MaintenanceAction.HOLD]: {
                label: 'Hold',
                icon: 'pi pi-pause',
                severity: 'warn' as const,
                tooltip: 'Put maintenance on hold'
            },
            [MaintenanceAction.RESUME]: {
                label: 'Resume',
                icon: 'pi pi-play',
                severity: 'success' as const,
                tooltip: 'Resume maintenance work'
            },
            [MaintenanceAction.COMPLETE]: {
                label: 'Complete',
                icon: 'pi pi-check-circle',
                severity: 'success' as const,
                tooltip: 'Complete maintenance work'
            },
            [MaintenanceAction.CANCEL]: {
                label: 'Cancel',
                icon: 'pi pi-ban',
                severity: 'danger' as const,
                tooltip: 'Cancel maintenance'
            },
            [MaintenanceAction.VIEW]: {
                label: 'View',
                icon: 'pi pi-eye',
                severity: 'info' as const,
                tooltip: 'View details and timeline'
            },
            [MaintenanceAction.DELETE]: {
                label: 'Delete',
                icon: 'pi pi-trash',
                severity: 'danger' as const,
                tooltip: 'Delete maintenance approval'
            },
            [MaintenanceAction.ASSIGN_TECHNICIAN]: {
                label: 'Assign',
                icon: 'pi pi-user-plus',
                severity: 'secondary' as const,
                tooltip: 'Assign lab technician'
            }
        };

        return configs[action];
    }

    // ==================== PRIORITY LEVEL SEVERITY ====================

    /**
     * Maps priority level to PrimeNG severity
     */
    static getPrioritySeverity(priority: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (!priority) return 'secondary';

        const priorityLower = priority.toLowerCase();

        if (priorityLower.includes('critical') || priorityLower.includes('urgent') || priorityLower.includes('high')) {
            return 'danger';
        }
        if (priorityLower.includes('medium') || priorityLower.includes('moderate')) {
            return 'warn';
        }
        if (priorityLower.includes('low') || priorityLower.includes('minor')) {
            return 'success';
        }

        return 'info';
    }

    // ==================== OVERDUE CALCULATION ====================

    /**
     * Check if maintenance is overdue (>24 hours past scheduled time)
     */
    static isOverdue(scheduledAt: Date | string | undefined): boolean {
        if (!scheduledAt) return false;

        const scheduled = new Date(scheduledAt);
        const now = new Date();
        const hoursOverdue = (now.getTime() - scheduled.getTime()) / (1000 * 60 * 60);

        return hoursOverdue > 24;
    }

    /**
     * Calculate hours overdue
     */
    static getHoursOverdue(scheduledAt: Date | string): number {
        const scheduled = new Date(scheduledAt);
        const now = new Date();
        return Math.max(0, (now.getTime() - scheduled.getTime()) / (1000 * 60 * 60));
    }
}
