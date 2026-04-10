/**
 * Asset Constants
 * Contains static configuration and dropdown options
 */

import { DropdownOption } from '../models/asset-form.model';

export class AssetConstants {
    static readonly CATEGORY_OPTIONS: DropdownOption[] = [
        { label: 'Software', value: 'Software' },
        { label: 'Hardware', value: 'Hardware' }
    ];

    static readonly SOFTWARE_CATEGORY = 'Software';
    static readonly HARDWARE_CATEGORY = 'Hardware';

    static readonly DEFAULT_EMPTY_ASSET = {
        assetName: '',
        propertyNumber: '',
        category: '',
        foundCluster: '',
        purpose: '',
        issuedTo: '',
        qrCode: '',
        qrCodeImage: null,
        program: '',
        supplier: '',
        laboratories: '',
        inventoryCustodianSlip: {
            icsNo: '',
            quantity: 0,
            uoM: '',
            unitCost: 0,
            description: '',
            specifications: '',
            height: 0,
            width: 0,
            length: 0,
            package: '',
            material: '',
            serialNumber: '',
            modelNumber: '',
            estimatedUsefullLife: '',
            brand: '',
            color: ''
        }
    };

    /**
     * Get status severity for PrimeNG tag component
     */
    static getStatusSeverity(status: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        if (!status) return 'secondary';

        const statusLower = status.toLowerCase();

        if (statusLower.includes('serviceable') || statusLower.includes('working') || statusLower.includes('available')) {
            return 'success';
        } else if (statusLower.includes('unserviceable') || statusLower.includes('broken') || statusLower.includes('defective')) {
            return 'danger';
        } else if (statusLower.includes('maintenance') || statusLower.includes('repair')) {
            return 'warn';
        } else if (statusLower.includes('deployed') || statusLower.includes('in use')) {
            return 'info';
        }

        return 'secondary';
    }

    /**
     * Get short asset ID by extracting numbers
     */
    static getShortAssetId(assetId: string | undefined): string {
        if (!assetId) return 'N/A';

        // Extract numbers from assetId format like "CAMPUS004-LAB002-001"
        // Result: "004-002-001"
        const parts = assetId.split('-');
        return parts.map((part) => part.replace(/[^\d]/g, '')).join('-');
    }
}
