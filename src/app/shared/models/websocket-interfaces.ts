/**
 * Unified WebSocket Interfaces
 * Shared data structures for all WebSocket services
 * Eliminates duplication and ensures consistency across the application
 */

// ==================== CORE ENTITIES ====================

export interface Campus {
    campusId: string;
    campusName: string;
}

export interface Department {
    departmentId: string;
    departmentName: string;
    departmentCode?: string;
    campus?: Campus | string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface User {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    department?: Department | string;
    mobileNo?: string;
    campus?: Campus | string;
    role: string;
    isActive: boolean;
    profileImage?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Laboratory {
    laboratoryId: string;
    laboratoryName: string;
    laboratoryLocation: string;
    campus?: Campus;
    assets?: Asset[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface AssetStatus {
    statusId: string;
    statusName: string;
}

export interface InventoryCustodianSlip {
    icsNo: string;
    quantity: number;
    uoM: string;
    unitCost: number;
    description?: string;
    specifications?: string;
    height?: number;
    width?: number;
    length?: number;
    package?: string;
    material?: string;
    serialNumber?: string;
    modelNumber?: string;
    estimatedUsefullLife?: string;
    brand?: string;
    color?: string;
}

export interface Asset {
    assetId: string;
    assetName: string;
    propertyNumber: string;
    category?: string;
    foundCluster?: string;
    purpose?: string;
    issuedTo?: string;
    qrCode?: string;
    program?: string;
    supplier?: string;
    status?: AssetStatus;
    campus?: Campus;
    laboratories?: Laboratory;
    inventoryCustodianSlip?: InventoryCustodianSlip;
    createdAt?: Date;
    updatedAt?: Date;
}

// ==================== MAINTENANCE ENTITIES ====================

export interface RequestStatus {
    requestStatusId: string;
    requestStatusName: string;
}

export interface MaintenanceType {
    maintenanceTypeId: string;
    maintenanceTypeName: string;
}

export interface MaintenanceApproval {
    maintenanceApprovalId: string;
    assignedTechnician?: User;
    performedBy?: User;
    declinedBy?: User;
    isApproved: boolean;
    isCompleted: boolean;
    reason?: string;
    actionTaken?: string;
    observations?: string;
    expectedReading?: string;
    actualReading?: string;
    onHoldReason?: string;
    cancelReason?: string;
    approvedAt?: Date | string;
    declinedAt?: Date | string;
    scheduledAt?: Date | string;
    scheduledConfirmedAt?: Date | string;
    inProgressAt?: Date | string;
    onHoldAt?: Date | string;
    resumedAt?: Date | string;
    completedAt?: Date | string;
    cancelledAt?: Date | string;
    updatedAt?: Date | string;
}

export interface MaintenanceRequest {
    requestId: string;
    maintenanceName: string;
    maintenanceType?: MaintenanceType;
    maintenanceStatus: RequestStatus;
    maintenanceApproval?: MaintenanceApproval;
    priorityLevel?: string;
    asset: Asset;
    requestedBy: User;
    reason?: string;
    requestDate?: Date | string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

// ==================== CALENDAR & SCHEDULE ENTITIES ====================

export interface CalendarEvent {
    eventId: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    campus?: Campus | string;
    createdBy?: User | string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Schedule {
    scheduleId: string;
    laboratory?: Laboratory | string;
    user?: User | string;
    startTime: Date;
    endTime: Date;
    day: string;
    subject?: string;
    status?: string;
    campus?: Campus | string;
    createdAt?: Date;
    updatedAt?: Date;
}

// ==================== ACTIVITY ENTITIES ====================

export interface Activity {
    activityId: string;
    actionType: string;
    entityType: string;
    targetName: string;
    targetId: string | null;
    description: string;
    apiEndpoint: string | null;
    httpMethod: string | null;
    status: string;
    userRole: string;
    userAgent: string | null;
    ipAddress: string | null;
    timestamp: string;
    actor: {
        userId: string;
        userName: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
    };
    actorId: string;
    campus: any | null;
    campusId: string | null;
    // Legacy fields for backward compatibility
    user?: User | string;
    action?: string;
    entity?: string;
    entityId?: string;
    details?: string;
    createdAt?: Date;
}
