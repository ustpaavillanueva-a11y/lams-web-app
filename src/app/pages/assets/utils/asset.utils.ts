/**
 * Asset Utilities
 * Common helper functions for asset management
 */

import { Asset } from '../../service/asset.service';

export class AssetUtils {
    /**
     * Get full name from user object
     */
    static getFullName(user: any): string {
        if (!user) return '';
        const firstName = user.firstName || '';
        const middleName = user.middleName || '';
        const lastName = user.lastName || '';
        return [firstName, middleName, lastName].filter((name) => name).join(' ');
    }

    /**
     * Expand assets with multiple serial numbers into separate display rows
     */
    static expandAssetsForDisplay(assets: Asset[]): Asset[] {
        const expandedAssets: Asset[] = [];

        if (!assets || assets.length === 0) {
            return expandedAssets;
        }

        assets.forEach((asset) => {
            const serialNumber = asset.inventoryCustodianSlip?.serialNumber;

            // Check if serial number contains comma (multiple serials)
            if (serialNumber && serialNumber.includes(',')) {
                // Split by comma and create one row per serial
                const serials = serialNumber.split(',').map((s: string) => s.trim());
                console.log(`📦 Expanding asset ${asset.assetId}: ${serials.length} serials`);

                serials.forEach((serial: string, index: number) => {
                    // Create a copy of the asset for each serial
                    const expandedAsset = {
                        ...asset,
                        // Deep copy ICS to avoid reference issues
                        inventoryCustodianSlip: {
                            ...asset.inventoryCustodianSlip,
                            serialNumber: serial,
                            quantity: 1
                        },
                        // Add unique identifier for table (append serial index)
                        _displayId: `${asset.assetId}_${index}`
                    };
                    expandedAssets.push(expandedAsset);
                });
            } else {
                // Single serial number, add as-is
                expandedAssets.push(asset);
            }
        });

        return expandedAssets;
    }

    /**
     * Get ICS table data for display
     */
    static getIcsTableData(icsData: any): any[] {
        if (!icsData) return [];

        const tableData: any[] = [];
        const fields = [
            { key: 'inventoryCustodianSlipId', label: 'Inventory Custodian Slip ID' },
            { key: 'icsNo', label: 'ICS No' },
            { key: 'quantity', label: 'Quantity' },
            { key: 'uoM', label: 'Unit of Measure' },
            { key: 'unitCost', label: 'Unit Cost' },
            { key: 'description', label: 'Description' },
            { key: 'specifications', label: 'Specifications' },
            { key: 'height', label: 'Height' },
            { key: 'width', label: 'Width' },
            { key: 'length', label: 'Length' },
            { key: 'package', label: 'Package' },
            { key: 'material', label: 'Material' },
            { key: 'serialNumber', label: 'Serial Number' },
            { key: 'modelNumber', label: 'Model Number' },
            { key: 'estimatedUsefullLife', label: 'Estimated Useful Life' }
        ];

        fields.forEach((field) => {
            if (icsData[field.key] !== undefined && icsData[field.key] !== null) {
                tableData.push({
                    field: field.label,
                    value: icsData[field.key]
                });
            }
        });

        return tableData;
    }

    /**
     * Filter assets by search term and campus
     */
    static filterAssets(assets: Asset[], searchTerm: string, selectedCampusId: string | null): Asset[] {
        return assets.filter((asset) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                !searchTerm ||
                asset.assetId?.toLowerCase().includes(searchLower) ||
                asset.assetName?.toLowerCase().includes(searchLower) ||
                asset.propertyNumber?.toLowerCase().includes(searchLower) ||
                asset.category?.toLowerCase().includes(searchLower) ||
                asset.foundCluster?.toLowerCase().includes(searchLower) ||
                asset.purpose?.toLowerCase().includes(searchLower) ||
                asset.issuedTo?.toLowerCase().includes(searchLower) ||
                asset.supplier?.toLowerCase().includes(searchLower) ||
                asset.laboratories?.laboratoryName?.toLowerCase().includes(searchLower) ||
                asset.campus?.campusName?.toLowerCase().includes(searchLower) ||
                // Search in ICS details
                asset.inventoryCustodianSlip?.icsNo?.toLowerCase().includes(searchLower) ||
                asset.inventoryCustodianSlip?.uoM?.toLowerCase().includes(searchLower) ||
                asset.inventoryCustodianSlip?.description?.toLowerCase().includes(searchLower) ||
                asset.inventoryCustodianSlip?.specifications?.toLowerCase().includes(searchLower) ||
                asset.inventoryCustodianSlip?.package?.toLowerCase().includes(searchLower) ||
                asset.inventoryCustodianSlip?.material?.toLowerCase().includes(searchLower) ||
                asset.inventoryCustodianSlip?.serialNumber?.toLowerCase().includes(searchLower) ||
                asset.inventoryCustodianSlip?.modelNumber?.toLowerCase().includes(searchLower) ||
                asset.inventoryCustodianSlip?.estimatedUsefullLife?.toLowerCase().includes(searchLower);

            const matchesCampus = !selectedCampusId || asset.campus?.campusId === selectedCampusId;

            return matchesSearch && matchesCampus;
        });
    }

    /**
     * Check if category is software
     */
    static isSoftwareCategory(category: string): boolean {
        return category === 'Software';
    }
}
