/**
 * Maintenance Approval Workflow - TypeScript Interfaces
 * Defines data structures for the granular multi-status maintenance tracking system
 */

// ==================== ENUMS ====================

export enum MaintenanceStatus {
    PENDING = 'Pending',
    SCHEDULED = 'Scheduled',
    APPROVED = 'Approved',
    IN_PROGRESS = 'In Progress',
    ON_HOLD = 'On Hold',
    COMPLETED = 'Completed',
    DISAPPROVED = 'Disapproved'
}

// ==================== CORE ENTITIES ====================

export interface MaintenanceApproval {
    maintenanceApprovalId: string;
    maintenanceRequest: MaintenanceRequest;
    assignedTechnician?: User;
    performedBy?: User;
    declinedBy?: User;

    // Flags
    isApproved: boolean;
    isCompleted: boolean;

    // Text fields
    reason?: string;
    actionTaken?: string;
    observations?: string;
    expectedReading?: string;
    actualReading?: string;
    onHoldReason?: string;

    // Timestamps
    approvedAt?: Date | string;
    declinedAt?: Date | string;
    scheduledAt?: Date | string;
    scheduledConfirmedAt?: Date | string;
    inProgressAt?: Date | string;
    onHoldAt?: Date | string;
    resumedAt?: Date | string;
    completedAt?: Date | string;
    updatedAt?: Date | string;
}

export interface MaintenanceRequest {
    requestId: string;
    maintenanceName: string;
    maintenanceType?: MaintenanceType;
    serviceMaintenance?: ServiceMaintenance;
    maintenanceStatus: RequestStatus;
    priorityLevel?: PriorityLevel;
    asset: Asset;
    requestedBy: User;
    reason?: string;
    requestDate?: Date | string;
    createdAt?: Date | string;
}

export interface Asset {
    assetId: string;
    assetName: string;
    propertyNumber?: string;
    campus?: Campus;
    laboratories?: Laboratory;
    status?: AssetStatus;
    issuedTo?: string;
}

export interface User {
    userId: string;
    firstName: string;
    lastName: string;
    email?: string;
    role?: string;
    campus?: Campus;
}

export interface Campus {
    campusId: string;
    campusName: string;
}

export interface Laboratory {
    laboratoryId: string;
    laboratoryName: string;
}

export interface AssetStatus {
    statusId: string;
    statusName: string;
}

export interface RequestStatus {
    requestStatusId: string;
    requestStatusName: string;
}

export interface MaintenanceType {
    maintenanceTypeId: string;
    maintenanceTypeName: string;
}

export interface ServiceMaintenance {
    serviceMaintenanceId: string;
    serviceName: string;
    serviceDescription?: string;
}

export interface PriorityLevel {
    priorityLevelId: string;
    priorityLevelName: string;
}

// ==================== ACTION PAYLOADS ====================

export interface ConfirmSchedulePayload {
    notes?: string;
}

export interface StartMaintenancePayload {
    notes?: string;
}

export interface HoldMaintenancePayload {
    reason: string; // Required
}

export interface ResumeMaintenancePayload {
    notes?: string;
}

export interface CompleteMaintenancePayload {
    actionTaken: string; // Required
    observations?: string;
    expectedReading?: string;
    actualReading?: string;
}

export interface ApproveMaintenancePayload {
    requestId: string;
    assignedTechnician?: string; // User ID
    scheduledAt?: Date | string;
    reason?: string;
}

export interface DeclineMaintenancePayload {
    reason: string; // Required
}

// ==================== TIMELINE & HISTORY ====================

export interface MaintenanceTimelineEvent {
    status: MaintenanceStatus | string;
    timestamp: Date | string;
    actor?: User;
    reason?: string;
    notes?: string;
    actionTaken?: string;
    observations?: string;
    eventType: TimelineEventType;
}

export enum TimelineEventType {
    APPROVED = 'approved',
    SCHEDULED_CONFIRMED = 'scheduled_confirmed',
    STARTED = 'started',
    HELD = 'held',
    RESUMED = 'resumed',
    COMPLETED = 'completed',
    DECLINED = 'declined'
}

export interface MaintenanceTimeline {
    events: MaintenanceTimelineEvent[];
    currentStatus: MaintenanceStatus | string;
    isCompleted: boolean;
}

// ==================== UI HELPER TYPES ====================

export interface MaintenanceActionButton {
    label: string;
    icon: string;
    severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary';
    action: MaintenanceAction;
    tooltip?: string;
    disabled?: boolean;
    visible: boolean;
}

export enum MaintenanceAction {
    APPROVE = 'approve',
    DECLINE = 'decline',
    CONFIRM_SCHEDULE = 'confirm_schedule',
    START = 'start',
    HOLD = 'hold',
    RESUME = 'resume',
    COMPLETE = 'complete',
    VIEW = 'view',
    DELETE = 'delete',
    ASSIGN_TECHNICIAN = 'assign_technician'
}

export interface StatusTransition {
    from: MaintenanceStatus;
    to: MaintenanceStatus[];
}

export interface RolePermissions {
    role: UserRole;
    allowedActions: MaintenanceAction[];
}

export enum UserRole {
    SUPER_ADMIN = 'SuperAdmin',
    CAMPUS_ADMIN = 'CampusAdmin',
    LAB_TECH = 'LabTech',
    FACULTY = 'Faculty'
}

// ==================== FILTER & SEARCH ====================

export interface MaintenanceFilter {
    searchTerm?: string;
    campusId?: string;
    status?: MaintenanceStatus | string;
    priorityLevel?: string;
    maintenanceType?: string;
    dateFrom?: Date | string;
    dateTo?: Date;
    isOverdue?: boolean;
    assignedTechnicianId?: string;
}

export interface MaintenanceSummary {
    totalCount: number;
    pendingCount: number;
    scheduledCount: number;
    approvedCount: number;
    inProgressCount: number;
    onHoldCount: number;
    completedCount: number;
    overdueCount: number;
}
