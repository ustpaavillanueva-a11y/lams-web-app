import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AssetBundle, BundleHistoryItem, MembershipLogItem } from '../models/asset-bundle.model';

@Injectable({
    providedIn: 'root'
})
export class AssetBundleService {
    private readonly baseUrl = `${environment.apiUrl}/asset-bundles`;

    constructor(private http: HttpClient) {}

    getBundles(): Observable<AssetBundle[]> {
        return this.http.get<AssetBundle[]>(this.baseUrl);
    }

    getBundle(id: string): Observable<AssetBundle> {
        return this.http.get<AssetBundle>(`${this.baseUrl}/${id}`);
    }

    getBundleHistory(id: string): Observable<BundleHistoryItem[]> {
        return this.http.get<BundleHistoryItem[]>(`${this.baseUrl}/${id}/maintenance-history`);
    }

    createBundle(dto: any): Observable<AssetBundle> {
        return this.http.post<AssetBundle>(this.baseUrl, dto);
    }

    deleteBundle(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    addComponents(bundleId: string, body: { assetIds: string[]; componentRoles?: Record<string, string>; reason?: string }): Observable<AssetBundle> {
        return this.http.post<AssetBundle>(`${this.baseUrl}/${bundleId}/components`, body);
    }

    removeComponent(bundleId: string, assetId: string, body: { reason?: string }): Observable<AssetBundle> {
        return this.http.delete<AssetBundle>(`${this.baseUrl}/${bundleId}/components/${assetId}`, { body });
    }

    transferComponent(bundleId: string, assetId: string, body: { toBundleId: string; reason?: string }): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/${bundleId}/components/${assetId}/transfer`, body);
    }

    replaceComponent(bundleId: string, assetId: string, body: { component: any; reason?: string }): Observable<AssetBundle> {
        return this.http.post<AssetBundle>(`${this.baseUrl}/${bundleId}/components/${assetId}/replace`, body);
    }

    retireComponent(bundleId: string, assetId: string, body: { reason?: string }): Observable<AssetBundle> {
        return this.http.post<AssetBundle>(`${this.baseUrl}/${bundleId}/components/${assetId}/retire`, body);
    }

    getMembershipLog(bundleId: string): Observable<MembershipLogItem[]> {
        return this.http.get<MembershipLogItem[]>(`${this.baseUrl}/${bundleId}/membership-log`);
    }

    convertAsset(body: { assetId: string; bundleName?: string; components: any[]; reason?: string }): Observable<AssetBundle> {
        return this.http.post<AssetBundle>(`${this.baseUrl}/convert`, body);
    }
}
