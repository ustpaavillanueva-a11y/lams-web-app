import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ServiceMaintenance {
    serviceMaintenanceId: string;
    serviceName: string;
    serviceDescription: string;
}

export interface RequestStatus {
    requestStatusId: string;
    requestStatusName: string;
}

export interface PriorityLevel {
    priorityLevelId: string;
    priorityLevelName: string;
}

export interface MaintenanceType {
    maintenanceTypeId: string;
    maintenanceTypeName: string;
}

export interface MaintenanceRequestPayload {
    maintenanceName: string;
    maintenanceType: string; // ID
    serviceMaintenance: string; // ID
    asset: string; // asset ID
    priorityLevel: string; // ID
    reason: string; // Reason for maintenance request
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
    private baseApiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    getServiceMaintenances(): Observable<ServiceMaintenance[]> {
        const url = `${this.baseApiUrl}/service-maintenance`;
        return this.http.get<ServiceMaintenance[]>(url).pipe(tap());
    }

    createServiceMaintenance(body: Partial<ServiceMaintenance>): Observable<ServiceMaintenance> {
        return this.http.post<ServiceMaintenance>(`${this.baseApiUrl}/service-maintenance`, body);
    }

    updateServiceMaintenance(id: string, body: Partial<ServiceMaintenance>): Observable<ServiceMaintenance> {
        return this.http.put<ServiceMaintenance>(`${this.baseApiUrl}/service-maintenance/${id}`, body);
    }

    deleteServiceMaintenance(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseApiUrl}/service-maintenance/${id}`);
    }

    getRequestStatuses(): Observable<RequestStatus[]> {
        const url = `${this.baseApiUrl}/request-status`;
        return this.http.get<RequestStatus[]>(url).pipe(tap());
    }

    createRequestStatus(body: Partial<RequestStatus>): Observable<RequestStatus> {
        return this.http.post<RequestStatus>(`${this.baseApiUrl}/request-status`, body);
    }

    updateRequestStatus(id: string, body: Partial<RequestStatus>): Observable<RequestStatus> {
        return this.http.put<RequestStatus>(`${this.baseApiUrl}/request-status/${id}`, body);
    }

    deleteRequestStatus(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseApiUrl}/request-status/${id}`);
    }

    getPriorityLevels(): Observable<PriorityLevel[]> {
        const url = `${this.baseApiUrl}/priority-levels`;
        return this.http.get<PriorityLevel[]>(url).pipe(tap());
    }

    createPriorityLevel(body: Partial<PriorityLevel>): Observable<PriorityLevel> {
        return this.http.post<PriorityLevel>(`${this.baseApiUrl}/priority-level`, body);
    }

    updatePriorityLevel(id: string, body: Partial<PriorityLevel>): Observable<PriorityLevel> {
        return this.http.put<PriorityLevel>(`${this.baseApiUrl}/priority-level/${id}`, body);
    }

    deletePriorityLevel(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseApiUrl}/priority-level/${id}`);
    }

    getMaintenanceTypes(): Observable<MaintenanceType[]> {
        const url = `${this.baseApiUrl}/maintenance-types`;
        return this.http.get<MaintenanceType[]>(url).pipe(tap());
    }

    createMaintenanceType(body: Partial<MaintenanceType>): Observable<MaintenanceType> {
        return this.http.post<MaintenanceType>(`${this.baseApiUrl}/maintenance-types`, body);
    }

    updateMaintenanceType(id: string, body: Partial<MaintenanceType>): Observable<MaintenanceType> {
        return this.http.put<MaintenanceType>(`${this.baseApiUrl}/maintenance-types/${id}`, body);
    }

    deleteMaintenanceType(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseApiUrl}/maintenance-types/${id}`);
    }

    // Create Maintenance Request
    createMaintenanceRequest(body: MaintenanceRequestPayload): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-requests`;
        return this.http.post<any>(url, body);
    }

    // Get Maintenance Requests (list)
    getMaintenanceRequests(): Observable<any[]> {
        const url = `${this.baseApiUrl}/maintenance-requests`;
        return this.http.get<any[]>(url);
    }

    // Approve Maintenance Request
    approveMaintenanceRequest(approvalData: any): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-approvals`;
        return this.http.post<any>(url, approvalData);
    }

    // Assign Technician to Maintenance Request
    assignTechnician(requestId: string, assignmentData: any): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-approvals/${requestId}/assign-technician`;
        return this.http.post<any>(url, assignmentData);
    }

    // Complete Maintenance Approval
    completeMaintenanceApproval(id: string, completionData: any): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-approvals/${id}`;
        return this.http.patch<any>(url, completionData);
    }

    // Get Maintenance Approval Details
    getMaintenanceApproval(id: string): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-approvals/${id}`;
        return this.http.get<any>(url);
    }

    // Get All Maintenance Approvals
    getMaintenanceApprovals(): Observable<any[]> {
        const url = `${this.baseApiUrl}/maintenance-approvals`;
        return this.http.get<any[]>(url);
    }

    // Get Maintenance Approval Details by ID
    getMaintenanceApprovalDetails(id: string): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-approvals/${id}`;
        return this.http.get<any>(url);
    }

    // Get Maintenance Request by ID
    getMaintenanceRequest(id: string): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-requests/${id}`;
        return this.http.get<any>(url);
    }

    // Update Maintenance Request
    updateMaintenanceRequest(id: string, body: Partial<MaintenanceRequestPayload>): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-requests/${id}`;
        return this.http.put<any>(url, body);
    }

    // Delete Maintenance Request
    deleteMaintenanceRequest(id: string): Observable<void> {
        const url = `${this.baseApiUrl}/maintenance-requests/${id}`;
        return this.http.delete<void>(url);
    }

    // Get Lab Technicians
    getLabTechnicians(): Observable<any[]> {
        const url = `${this.baseApiUrl}/users/filter/lab-technicians`;
        return this.http.get<any[]>(url);
    }

    // Decline Maintenance Request
    declineMaintenanceRequest(requestId: string, reason: string): Observable<any> {
        const url = `${this.baseApiUrl}/maintenance-approvals/${requestId}/decline`;
        return this.http.post<any>(url, { reason });
    }
}
