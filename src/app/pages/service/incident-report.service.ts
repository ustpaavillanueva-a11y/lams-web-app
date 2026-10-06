import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type IncidentType = 'Damage' | 'Malfunction' | 'Lost/Missing' | 'Theft' | 'Safety Hazard' | 'Other';
export type IncidentSeverity = 'Low' | 'Medium' | 'High';
export type IncidentStatus = 'Pending' | 'Approved' | 'Resolved' | 'Rejected';

export const INCIDENT_TYPES: IncidentType[] = ['Damage', 'Malfunction', 'Lost/Missing', 'Theft', 'Safety Hazard', 'Other'];
export const INCIDENT_SEVERITIES: IncidentSeverity[] = ['Low', 'Medium', 'High'];
export const INCIDENT_STATUSES: IncidentStatus[] = ['Pending', 'Approved', 'Resolved', 'Rejected'];

export interface IncidentUser {
    userId: string;
    firstName: string;
    lastName: string;
}

export interface IncidentReport {
    incidentId: string;
    incidentType: IncidentType;
    severity: IncidentSeverity;
    incidentDate: string;
    description: string;
    status: IncidentStatus;
    asset: { assetId: string; assetName: string; campus?: string };
    reportedBy?: IncidentUser;
    reviewedBy?: IncidentUser | null;
    resolvedBy?: IncidentUser | null;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
    resolvedAt?: string | null;
    resolutionNotes?: string | null;
    createdAt: string;
}

export interface CreateIncidentReportPayload {
    asset: string;
    incidentType: IncidentType;
    severity: IncidentSeverity;
    incidentDate: string; // YYYY-MM-DD
    description: string;
}

@Injectable({ providedIn: 'root' })
export class IncidentReportService {
    private baseUrl = `${environment.apiUrl}/incident-reports`;

    constructor(private http: HttpClient) {}

    create(payload: CreateIncidentReportPayload): Observable<IncidentReport> {
        return this.http.post<IncidentReport>(this.baseUrl, payload);
    }

    getAll(params?: { status?: IncidentStatus; assetId?: string }): Observable<IncidentReport[]> {
        let httpParams = new HttpParams();
        if (params?.status) httpParams = httpParams.set('status', params.status);
        if (params?.assetId) httpParams = httpParams.set('assetId', params.assetId);
        return this.http.get<IncidentReport[]>(this.baseUrl, { params: httpParams });
    }

    getByAsset(assetId: string): Observable<IncidentReport[]> {
        return this.http.get<IncidentReport[]>(`${this.baseUrl}/asset/${assetId}`);
    }

    approve(id: string): Observable<IncidentReport> {
        return this.http.post<IncidentReport>(`${this.baseUrl}/${id}/approve`, {});
    }

    reject(id: string, reason: string): Observable<IncidentReport> {
        return this.http.post<IncidentReport>(`${this.baseUrl}/${id}/reject`, { reason });
    }

    resolve(id: string, resolutionNotes: string): Observable<IncidentReport> {
        return this.http.post<IncidentReport>(`${this.baseUrl}/${id}/resolve`, { resolutionNotes });
    }
}
