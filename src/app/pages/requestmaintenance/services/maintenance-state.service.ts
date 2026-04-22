/**
 * Maintenance State Service
 * Centralized reactive state management for maintenance approvals
 * Uses BehaviorSubjects for real-time UI updates across components
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { MaintenanceService } from '../../service/maintenance.service';
import { AuthService } from '../../service/auth.service';
import { UserService } from '../../service/user.service';
import { MaintenanceApproval, MaintenanceFilter, MaintenanceSummary, RequestStatus, PriorityLevel, MaintenanceType, ServiceMaintenance } from '../../models/maintenance.models';
import { MaintenanceUtils } from '../utils/maintenance.utils';

@Injectable({ providedIn: 'root' })
export class MaintenanceStateService {
    // ==================== STATE ====================

    private approvalsSubject = new BehaviorSubject<MaintenanceApproval[]>([]);
    private loadingSubject = new BehaviorSubject<boolean>(false);
    private filterSubject = new BehaviorSubject<MaintenanceFilter>({});
    private summarySubject = new BehaviorSubject<MaintenanceSummary>({
        totalCount: 0,
        pendingCount: 0,
        scheduledCount: 0,
        approvedCount: 0,
        inProgressCount: 0,
        onHoldCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        overdueCount: 0
    });

    // Reference data
    private statusesSubject = new BehaviorSubject<RequestStatus[]>([]);
    private prioritiesSubject = new BehaviorSubject<PriorityLevel[]>([]);
    private typesSubject = new BehaviorSubject<MaintenanceType[]>([]);
    private servicesSubject = new BehaviorSubject<ServiceMaintenance[]>([]);
    private techniciansSubject = new BehaviorSubject<any[]>([]);
    private campusesSubject = new BehaviorSubject<any[]>([]);

    // ==================== OBSERVABLES ====================

    public approvals$ = this.approvalsSubject.asObservable();
    public loading$ = this.loadingSubject.asObservable();
    public filter$ = this.filterSubject.asObservable();
    public summary$ = this.summarySubject.asObservable();

    public statuses$ = this.statusesSubject.asObservable();
    public priorities$ = this.prioritiesSubject.asObservable();
    public types$ = this.typesSubject.asObservable();
    public services$ = this.servicesSubject.asObservable();
    public technicians$ = this.techniciansSubject.asObservable();
    public campuses$ = this.campusesSubject.asObservable();

    // ==================== FILTERED APPROVALS ====================

    /**
     * Get filtered approvals based on current filter state
     */
    public filteredApprovals$: Observable<MaintenanceApproval[]> = this.approvals$.pipe(
        map((approvals) => {
            const filter = this.filterSubject.value;
            return MaintenanceUtils.filterMaintenanceApprovals(approvals, filter);
        })
    );

    constructor(
        private maintenanceService: MaintenanceService,
        private authService: AuthService,
        private userService: UserService
    ) {}

    // ==================== DATA LOADING ====================

    /**
     * Load all maintenance approvals
     */
    loadApprovals(): void {
        this.loadingSubject.next(true);
        this.maintenanceService
            .getMaintenanceApprovals()
            .pipe(
                tap((approvals) => {
                    this.approvalsSubject.next(approvals);
                    this.updateSummary(approvals);
                    this.loadingSubject.next(false);
                })
            )
            .subscribe({
                error: (error) => {
                    console.error('Error loading approvals:', error);
                    this.loadingSubject.next(false);
                }
            });
    }

    /**
     * Load all reference data (statuses, priorities, types, technicians, campuses)
     */
    loadReferenceData(): void {
        forkJoin({
            statuses: this.maintenanceService.getRequestStatuses(),
            priorities: this.maintenanceService.getPriorityLevels(),
            types: this.maintenanceService.getMaintenanceTypes(),
            services: this.maintenanceService.getServiceMaintenances(),
            technicians: this.maintenanceService.getLabTechnicians(),
            campuses: this.userService.getCampuses()
        }).subscribe({
            next: (data) => {
                this.statusesSubject.next(data.statuses);
                this.prioritiesSubject.next(data.priorities);
                this.typesSubject.next(data.types);
                this.servicesSubject.next(data.services);
                this.techniciansSubject.next(data.technicians);
                this.campusesSubject.next(data.campuses);
            },
            error: (error) => {
                console.error('Error loading reference data:', error);
            }
        });
    }

    /**
     * Refresh all data
     */
    refresh(): void {
        this.loadApprovals();
        this.loadReferenceData();
    }

    // ==================== FILTERING ====================

    /**
     * Update filter criteria
     */
    setFilter(filter: MaintenanceFilter): void {
        this.filterSubject.next(filter);
    }

    /**
     * Update a single filter property
     */
    updateFilter(key: keyof MaintenanceFilter, value: any): void {
        const currentFilter = this.filterSubject.value;
        this.filterSubject.next({ ...currentFilter, [key]: value });
    }

    /**
     * Clear all filters
     */
    clearFilter(): void {
        this.filterSubject.next({});
    }

    /**
     * Get approvals by status
     */
    getApprovalsByStatus(status: string): MaintenanceApproval[] {
        return MaintenanceUtils.filterByStatus(this.approvalsSubject.value, status);
    }

    /**
     * Get overdue approvals
     */
    getOverdueApprovals(): MaintenanceApproval[] {
        return MaintenanceUtils.getOverdueApprovals(this.approvalsSubject.value);
    }

    // ==================== CAMPUS & ROLE SCOPING ====================

    /**
     * Get approvals scoped to user's role and campus
     */
    getScopedApprovals(): MaintenanceApproval[] {
        const currentUser = this.authService.getCurrentUser();
        const approvals = this.approvalsSubject.value;

        if (!currentUser) return [];

        // Super Admin sees all
        if (currentUser.role === 'SuperAdmin') {
            return approvals;
        }

        // Campus Admin and Lab Tech see only their campus
        if (currentUser.role === 'CampusAdmin' || currentUser.role === 'LabTech') {
            return approvals.filter((approval) => approval.maintenanceRequest?.asset?.campus?.campusId === currentUser.campus);
        }

        // Faculty sees only their own requests
        if (currentUser.role === 'Faculty') {
            return approvals.filter((approval) => approval.maintenanceRequest?.requestedBy?.userId === currentUser.user_id);
        }

        return [];
    }

    // ==================== SUMMARY STATISTICS ====================

    /**
     * Update summary statistics
     */
    private updateSummary(approvals: MaintenanceApproval[]): void {
        const summary = MaintenanceUtils.calculateSummary(approvals);
        this.summarySubject.next(summary);
    }

    /**
     * Get current summary
     */
    getSummary(): MaintenanceSummary {
        return this.summarySubject.value;
    }

    // ==================== INDIVIDUAL OPERATIONS ====================

    /**
     * Get single approval by ID
     */
    getApprovalById(id: string): Observable<MaintenanceApproval> {
        return this.maintenanceService.getMaintenanceApproval(id);
    }

    /**
     * Confirm schedule
     */
    confirmSchedule(id: string, notes?: string): Observable<any> {
        return this.maintenanceService.confirmSchedule(id, { notes }).pipe(
            tap(() => {
                this.loadApprovals(); // Refresh data
            })
        );
    }

    /**
     * Start maintenance
     */
    startMaintenance(id: string, notes?: string): Observable<any> {
        return this.maintenanceService.startMaintenance(id, { notes }).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    /**
     * Hold maintenance
     */
    holdMaintenance(id: string, reason: string): Observable<any> {
        return this.maintenanceService.holdMaintenance(id, { reason }).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    /**
     * Resume maintenance
     */
    resumeMaintenance(id: string, notes?: string): Observable<any> {
        return this.maintenanceService.resumeMaintenance(id, { notes }).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    /**
     * Complete maintenance
     */
    completeMaintenance(
        id: string,
        data: {
            actionTaken: string;
            observations?: string;
            expectedReading?: string;
            actualReading?: string;
        }
    ): Observable<any> {
        return this.maintenanceService.completeMaintenance(id, data).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    /**
     * Cancel maintenance
     */
    cancelMaintenance(id: string, reason: string): Observable<any> {
        return this.maintenanceService.cancelMaintenance(id, { reason }).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    /**
     * Approve maintenance request
     */
    approveRequest(data: any): Observable<any> {
        return this.maintenanceService.approveMaintenanceRequest(data).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    /**
     * Decline maintenance request
     */
    declineRequest(requestId: string, reason: string): Observable<any> {
        return this.maintenanceService.declineMaintenanceRequest(requestId, reason).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    /**
     * Assign technician
     */
    assignTechnician(requestId: string, data: any): Observable<any> {
        return this.maintenanceService.assignTechnician(requestId, data).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    /**
     * Delete maintenance approval
     */
    deleteApproval(id: string): Observable<void> {
        return this.maintenanceService.deleteMaintenanceApproval(id).pipe(
            tap(() => {
                this.loadApprovals();
            })
        );
    }

    // ==================== UTILITY ====================

    /**
     * Get current user
     */
    getCurrentUser(): any {
        return this.authService.getCurrentUser();
    }

    /**
     * Check if user can perform action
     */
    canPerformAction(approval: MaintenanceApproval): boolean {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        const result = MaintenanceUtils.canPerformActionOnApproval(approval, currentUser.role, currentUser.campus?.campusId, currentUser.userId);

        return result.allowed;
    }
}
