export type BundleStatus = 'Serviceable' | 'Partially Serviceable' | 'Unserviceable' | 'Retired';

export interface AssetBundle {
    bundleId: string;
    bundleName: string;
    propertyNumber?: string;
    issuedTo?: string;
    acquisitionDate?: string;
    notes?: string;
    laboratories?: any;
    campus?: any;
    components: any[];
    derived: { status: BundleStatus; activeCount: number; availableCount: number };
}
