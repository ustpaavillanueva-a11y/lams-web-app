export type BundleStatus = 'Serviceable' | 'Partially Serviceable' | 'Unserviceable' | 'Retired';

export interface AssetBundle {
    bundleId: string;
    bundleName: string;
    propertyNumber?: string;
    issuedTo?: string;
    acquisitionDate?: string;
    laboratories?: any;
    campus?: any;
    components: any[];
    derived: { status: BundleStatus; activeCount: number; availableCount: number };
}

export interface BundleHistoryItem {
    requestId: string;
    maintenanceName: string;
    scope: 'ASSET' | 'COMPONENTS' | 'BUNDLE';
    target: string;
    maintenanceType: string | null;
    serviceName: string | null;
    status: string;
    requestDate: string;
    completedAt: string | null;
    performedBy: string | null;
    components: { assetId: string; assetName: string; componentRole: string | null }[];
}

export type MembershipAction = 'JOINED' | 'REMOVED' | 'TRANSFERRED' | 'REPLACED' | 'RETIRED' | 'CONVERTED';

export interface MembershipLogItem {
    id: string;
    action: MembershipAction;
    assetId: string;
    assetName: string;
    componentRole: string | null;
    fromBundleId: string | null;
    toBundleId: string | null;
    reason: string | null;
    actorName: string | null;
    createdAt: string;
}
