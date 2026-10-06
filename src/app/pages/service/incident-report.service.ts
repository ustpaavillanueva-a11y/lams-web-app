import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type IncidentStatus = 'Pending' | 'Approved' | 'Resolved' | 'Rejected';

export const INCIDENT_STATUSES: IncidentStatus[] = ['Pending', 'Approved', 'Resolved', 'Rejected'];

export interface IncidentUser {
    userId: string;
    firstName: string;
    lastName: string;
}

export interface IncidentAsset {
    assetId: string;
    assetName: string;
    propertyNumber?: string | null;
    category?: string | null;
    campus?: { campusId: string; campusName?: string };
    laboratories?: { laboratoryId: string; laboratoryName?: string; laboratoryLocation?: string } | null;
    inventoryCustodianSlip?: { serialNumber?: string | null; modelNumber?: string | null; brand?: { brandName?: string } | null } | null;
}

export interface IncidentReport {
    incidentId: string;
    incidentDate: string;
    // HH:mm; the new fields are null on reports filed before they existed
    incidentTime?: string | null;
    personsInvolved?: string | null;
    description: string;
    hasWitnesses?: boolean | null;
    hasInjuredPerson?: boolean | null;
    status: IncidentStatus;
    asset: IncidentAsset;
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
    personsInvolved: string;
    incidentDate: string; // YYYY-MM-DD
    incidentTime: string; // HH:mm
    description: string;
    hasWitnesses: boolean;
    hasInjuredPerson: boolean;
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
