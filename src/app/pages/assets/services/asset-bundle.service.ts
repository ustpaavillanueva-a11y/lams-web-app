import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AssetBundle, BundleHistoryItem } from '../models/asset-bundle.model';

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
}
