import { WebSocketEvent, WebSocketService } from '@/shared/services/websocket.service';
import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Asset } from '../../../shared/models/websocket-interfaces';

@Injectable({
    providedIn: 'root'
})
export class AssetsWebSocketService implements OnDestroy {
    private readonly namespace = '/assets';
    private isConnected = false;

    constructor(private webSocketService: WebSocketService) {}

    /**
     * Connect to assets namespace
     */
    connect(): void {
        if (this.isConnected) {
            return;
        }

        try {
            this.webSocketService.connect(this.namespace);
            this.isConnected = true;
        } catch (error) {}
    }

    /**
     * Disconnect from assets namespace
     */
    disconnect(): void {
        this.webSocketService.disconnect(this.namespace);
        this.isConnected = false;
    }

    /**
     * Listen for new assets
     */
    onAssetCreated(): Observable<WebSocketEvent<Asset>> {
        return this.webSocketService.on<Asset>(this.namespace, 'asset-created');
    }

    /**
     * Listen for asset updates
     */
    onAssetUpdated(): Observable<WebSocketEvent<Asset>> {
        return this.webSocketService.on<Asset>(this.namespace, 'asset-updated');
    }

    /**
     * Listen for asset status changes
     */
    onAssetStatusChanged(): Observable<WebSocketEvent<Asset>> {
        return this.webSocketService.on<Asset>(this.namespace, 'asset-status-changed');
    }

    /**
     * Listen for asset deletions
     */
    onAssetDeleted(): Observable<WebSocketEvent<{ assetId: string }>> {
        return this.webSocketService.on<{ assetId: string }>(this.namespace, 'asset-deleted');
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
