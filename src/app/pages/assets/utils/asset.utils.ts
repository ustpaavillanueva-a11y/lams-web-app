/**
 * Asset Utilities
 * Common helper functions for asset management
 */

import { Asset } from '../../service/asset.service';

export class AssetUtils {
    static escapeHtml(value: unknown): string {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

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
     * Filter assets by search term, campus, laboratory and issued-to
     */
    static filterAssets(assets: Asset[], searchTerm: string, selectedCampusId: string | null, selectedLaboratoryId: string | null = null, selectedIssuedTo: string | null = null, selectedCondition: string | null = null): Asset[] {
        return assets.filter((asset) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                !searchTerm ||
                asset.assetId?.toLowerCase().includes(searchLower) ||
                asset.assetName?.toLowerCase().includes(searchLower) ||
                asset.propertyNumber?.toLowerCase().includes(searchLower) ||
                asset.category?.toLowerCase().includes(searchLower) ||
                asset.condition?.toLowerCase().includes(searchLower) ||
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
            const matchesLaboratory = !selectedLaboratoryId || asset.laboratories?.laboratoryId === selectedLaboratoryId;
            const matchesIssuedTo = !selectedIssuedTo || asset.issuedTo === selectedIssuedTo;
            const matchesCondition = !selectedCondition || asset.condition === selectedCondition;

            return matchesSearch && matchesCampus && matchesLaboratory && matchesIssuedTo && matchesCondition;
        });
    }

    /**
     * Get the distinct, sorted "Issued To" values present in a list of assets
     */
    static getIssuedToOptions(assets: Asset[]): string[] {
        const values = new Set<string>();
        assets.forEach((asset) => {
            if (asset.issuedTo) {
                values.add(asset.issuedTo);
            }
        });
        return Array.from(values).sort((a, b) => a.localeCompare(b));
    }

    /**
     * Check if category is software
     */
    static isSoftwareCategory(category: string): boolean {
        return category === 'Software';
    }

    /**
     * Derive warranty status from the warranty expiration date
     */
    static getWarrantyStatus(warrantyExpirationDate: string | Date | null | undefined): 'Active' | 'Expired' | 'N/A' {
        if (!warrantyExpirationDate) return 'N/A';

        const expiration = new Date(warrantyExpirationDate);
        if (isNaN(expiration.getTime())) return 'N/A';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return expiration >= today ? 'Active' : 'Expired';
    }

    /**
     * Parse the free-text estimated useful life ("5 years", "18 months", "6 mos", "90 days", "3")
     * into a length. A bare number is read as years. Returns null when it cannot be read.
     */
    static parseUsefulLife(text: string | null | undefined): { amount: number; unit: 'days' | 'weeks' | 'months' | 'years' } | null {
        const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]*)/i.exec(text ?? '');
        if (!match) return null;
        const amount = Number(match[1]);
        if (!(amount > 0)) return null;
        const unit = match[2].toLowerCase();
        if (!unit || unit.startsWith('y')) return { amount, unit: 'years' };
        if (unit.startsWith('mo') || unit === 'm') return { amount, unit: 'months' };
        if (unit.startsWith('w')) return { amount, unit: 'weeks' };
        if (unit.startsWith('d')) return { amount, unit: 'days' };
        return null;
    }

    /**
     * When the asset's subscription (if it has one) or estimated useful life ends, counted from the
     * acquisition date (falling back to the date the asset was created), and the days left until then.
     * Negative days mean it has already ended. Null when there is not enough data.
     */
    static getLifeRemaining(asset: Asset, today: Date = new Date()): { basis: 'Subscription' | 'Useful life'; startDate: Date; endDate: Date; totalDays: number; daysRemaining: number } | null {
        const start = new Date(asset.acquisitionDate || asset.assetCreated || '');
        if (isNaN(start.getTime())) return null;

        const end = new Date(start);
        let basis: 'Subscription' | 'Useful life';
        if (asset.subscriptionDurationMonths && asset.subscriptionDurationMonths > 0) {
            basis = 'Subscription';
            end.setMonth(end.getMonth() + asset.subscriptionDurationMonths);
        } else {
            const life = AssetUtils.parseUsefulLife(asset.inventoryCustodianSlip?.estimatedUsefullLife);
            if (!life) return null;
            basis = 'Useful life';
            // Whole units shift the calendar; fractions ("2.5 years") fall back to an average length
            if (life.unit === 'years' && Number.isInteger(life.amount)) end.setFullYear(end.getFullYear() + life.amount);
            else if (life.unit === 'months' && Number.isInteger(life.amount)) end.setMonth(end.getMonth() + life.amount);
            else {
                const daysPerUnit = { days: 1, weeks: 7, months: 30.44, years: 365.25 }[life.unit];
                end.setDate(end.getDate() + Math.round(life.amount * daysPerUnit));
            }
        }

        const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        const daysRemaining = Math.round((startOfDay(end) - startOfDay(today)) / 86_400_000);
        const totalDays = Math.round((startOfDay(end) - startOfDay(start)) / 86_400_000);
        return { basis, startDate: start, endDate: end, totalDays, daysRemaining };
    }

    /** Days left at or below which an asset is critical (red) and flagged for maintenance. */
    static readonly LIFE_DUE_SOON_DAYS = 30;

    /** Days left at or below which an asset should be monitored (orange). */
    static readonly LIFE_MONITOR_DAYS = 90;

    /** Blue while plenty of life remains, orange when it should be monitored, red when critical or ended. */
    static getLifeLevel(daysRemaining: number): 'healthy' | 'monitor' | 'critical' {
        if (daysRemaining <= AssetUtils.LIFE_DUE_SOON_DAYS) return 'critical';
        if (daysRemaining <= AssetUtils.LIFE_MONITOR_DAYS) return 'monitor';
        return 'healthy';
    }

    static getLifeRemainingLabel(asset: Asset): string {
        const life = AssetUtils.getLifeRemaining(asset);
        if (!life) return 'N/A';
        if (life.daysRemaining < 0) return `Ended ${-life.daysRemaining} day(s) ago`;
        if (life.daysRemaining === 0) return 'Ends today';
        return `${life.daysRemaining} day(s) left`;
    }

    static getLifeRemainingSeverity(asset: Asset): 'info' | 'warn' | 'danger' | 'secondary' {
        const life = AssetUtils.getLifeRemaining(asset);
        if (!life) return 'secondary';
        return { healthy: 'info', monitor: 'warn', critical: 'danger' }[AssetUtils.getLifeLevel(life.daysRemaining)] as 'info' | 'warn' | 'danger';
    }

    /**
     * Get PrimeNG tag severity for a warranty status
     */
    static getWarrantySeverity(warrantyExpirationDate: string | Date | null | undefined): 'success' | 'danger' | 'secondary' {
        const status = AssetUtils.getWarrantyStatus(warrantyExpirationDate);
        if (status === 'Active') return 'success';
        if (status === 'Expired') return 'danger';
        return 'secondary';
    }
}
