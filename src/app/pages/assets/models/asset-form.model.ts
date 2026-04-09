/**
 * Asset Form Models and Interfaces
 * Contains type definitions for asset creation and editing
 */

export interface AssetFormData {
    assetName: string;
    propertyNumber: string;
    category: string;
    foundCluster: string;
    purpose: string;
    issuedTo: string;
    qrCode: string;
    qrCodeImage: File | null;
    program: string;
    supplier: string;
    laboratories: string;
    inventoryCustodianSlip: InventoryCustodianSlipData;
}

export interface InventoryCustodianSlipData {
    icsNo: string;
    quantity: number;
    uoM: string;
    unitCost: number;
    description: string;
    specifications: string;
    height: number;
    width: number;
    length: number;
    package: string;
    material: string;
    serialNumber: string;
    modelNumber: string;
    estimatedUsefullLife: string;
    brand: string;
    color: string;
}

export interface SerialNumberValidation {
    isValid: boolean;
    parsed: string[];
    error: string;
    quantityMismatch: boolean;
}

export interface MaintenanceRequest {
    maintenanceName: string;
    maintenanceType: string;
    serviceMaintenance: string;
    asset: string;
    priorityLevel: string;
    reason: string;
}

export interface DropdownOption {
    label: string;
    value: string;
}
