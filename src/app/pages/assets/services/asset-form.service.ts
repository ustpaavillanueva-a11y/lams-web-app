/**
 * Asset Form Service
 * Handles form validation and serial number parsing logic
 */

import { Injectable } from '@angular/core';
import { SerialNumberValidation } from '../models/asset-form.model';

@Injectable()
export class AssetFormService {
    /**
     * Validate and parse serial numbers from raw input
     */
    validateSerialNumbers(rawInput: string, expectedQuantity: number): SerialNumberValidation {
        const result: SerialNumberValidation = {
            isValid: false,
            parsed: [],
            error: '',
            quantityMismatch: false
        };

        if (!rawInput || !rawInput.trim()) {
            return result;
        }

        // Parse serial numbers by newline, comma, or semicolon
        const rawTokens = rawInput
            .split(/[\n,;]+/) // Split by newline, comma, or semicolon
            .map((s) => s.trim()) // Trim whitespace
            .filter((s) => s.length > 0); // Remove empty values

        console.log('📝 Parsing serials:', {
            raw: rawInput,
            tokens: rawTokens,
            count: rawTokens.length
        });

        // Check for duplicates (case-insensitive)
        const seen = new Map<string, string>();
        const duplicates: string[] = [];

        rawTokens.forEach((serial) => {
            const lowerSerial = serial.toLowerCase();
            if (seen.has(lowerSerial)) {
                if (!duplicates.includes(serial)) {
                    duplicates.push(serial);
                }
            } else {
                seen.set(lowerSerial, serial);
            }
        });

        if (duplicates.length > 0) {
            result.error = `Duplicate serial number(s) found: ${duplicates.join(', ')}`;
            return result;
        }

        result.parsed = rawTokens;
        result.isValid = true;

        // Check if quantity matches serial count
        if (expectedQuantity > 0 && result.parsed.length > 0 && expectedQuantity !== result.parsed.length) {
            result.quantityMismatch = true;
        }

        return result;
    }

    /**
     * Validate asset form basic fields
     */
    validateBasicFields(asset: any): string[] {
        const errors: string[] = [];

        if (!asset.assetName) {
            errors.push('Asset Name is required');
        }

        if (!asset.propertyNumber) {
            errors.push('Property Number is required');
        }

        if (!asset.category) {
            errors.push('Category is required');
        }

        return errors;
    }

    /**
     * Validate ICS fields
     */
    validateIcsFields(ics: any): string[] {
        const errors: string[] = [];

        if (!ics.uoM) {
            errors.push('Unit of Measure is required');
        }

        if (!ics.quantity || ics.quantity <= 0) {
            errors.push('Quantity must be greater than 0');
        }

        return errors;
    }

    /**
     * Validate QR code upload
     */
    validateQrCodeUpload(qrCodeImage: File | null): string | null {
        if (!qrCodeImage) {
            return 'QR Code file must be uploaded';
        }

        return null;
    }

    /**
     * Convert object value to string (for autocomplete fields)
     * Handles Program, Brand, Color objects
     */
    extractStringValue(value: any, fieldName: 'programName' | 'brandName' | 'colorName'): string {
        if (!value) return '';

        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'object' && value[fieldName]) {
            return value[fieldName];
        }

        return '';
    }

    /**
     * Prepare asset data for API submission
     */
    prepareAssetForSubmission(asset: any, serialNumber: string): any {
        const assetToSend: any = {
            assetName: asset.assetName,
            propertyNumber: asset.propertyNumber,
            category: asset.category,
            foundCluster: asset.foundCluster || '',
            purpose: asset.purpose || '',
            issuedTo: asset.issuedTo || '',
            qrCode: asset.qrCode || '',
            program: asset.program || '',
            supplier: asset.supplier || '',
            laboratories: asset.laboratories || '',
            inventoryCustodianSlip: {
                icsNo: asset.inventoryCustodianSlip.icsNo || '',
                quantity: 1, // Always 1 per asset
                uoM: asset.inventoryCustodianSlip.uoM || '',
                unitCost: Number(asset.inventoryCustodianSlip.unitCost) || 0,
                description: asset.inventoryCustodianSlip.description || '',
                specifications: asset.inventoryCustodianSlip.specifications || '',
                height: Number(asset.inventoryCustodianSlip.height) || 0,
                width: Number(asset.inventoryCustodianSlip.width) || 0,
                length: Number(asset.inventoryCustodianSlip.length) || 0,
                package: asset.inventoryCustodianSlip.package || '',
                material: asset.inventoryCustodianSlip.material || '',
                serialNumber: serialNumber,
                modelNumber: asset.inventoryCustodianSlip.modelNumber || '',
                estimatedUsefullLife: asset.inventoryCustodianSlip.estimatedUsefullLife || '',
                brand: asset.inventoryCustodianSlip.brand || '',
                color: asset.inventoryCustodianSlip.color || ''
            }
        };

        // Extract supplier ID if it's an object
        if (assetToSend.supplier && typeof assetToSend.supplier === 'object') {
            assetToSend.supplier = assetToSend.supplier.supplierId || '';
        }

        // Extract laboratory ID if it's an object
        if (assetToSend.laboratories && typeof assetToSend.laboratories === 'object') {
            assetToSend.laboratories = assetToSend.laboratories.laboratoryId || '';
        }

        // Ensure laboratories is a string (laboratory ID)
        if (!assetToSend.laboratories || typeof assetToSend.laboratories !== 'string') {
            assetToSend.laboratories = '';
        }

        // Convert issuedTo object to string if needed
        if (assetToSend.issuedTo && typeof assetToSend.issuedTo === 'object') {
            assetToSend.issuedTo = this.getFullName(assetToSend.issuedTo);
        }

        // Extract program ID (backend expects ID, not name)
        if (assetToSend.program && typeof assetToSend.program === 'object') {
            assetToSend.program = assetToSend.program.programId || '';
            console.log('✅ Extracted program ID:', assetToSend.program);
        }

        // Extract brand ID (backend expects ID, not name)
        if (assetToSend.inventoryCustodianSlip.brand && typeof assetToSend.inventoryCustodianSlip.brand === 'object') {
            assetToSend.inventoryCustodianSlip.brand = assetToSend.inventoryCustodianSlip.brand.brandId || '';
            console.log('✅ Extracted brand ID:', assetToSend.inventoryCustodianSlip.brand);
        }

        // Extract color ID (backend expects ID, not name)
        if (assetToSend.inventoryCustodianSlip.color && typeof assetToSend.inventoryCustodianSlip.color === 'object') {
            assetToSend.inventoryCustodianSlip.color = assetToSend.inventoryCustodianSlip.color.colorId || '';
            console.log('✅ Extracted color ID:', assetToSend.inventoryCustodianSlip.color);
        }

        // Remove null/undefined values to prevent backend issues
        Object.keys(assetToSend).forEach((key) => {
            if (assetToSend[key] === null || assetToSend[key] === undefined) {
                assetToSend[key] = '';
            }
        });

        Object.keys(assetToSend.inventoryCustodianSlip).forEach((key) => {
            if (assetToSend.inventoryCustodianSlip[key] === null || assetToSend.inventoryCustodianSlip[key] === undefined) {
                assetToSend.inventoryCustodianSlip[key] = typeof assetToSend.inventoryCustodianSlip[key] === 'number' ? 0 : '';
            }
        });

        console.log('📤 Prepared asset for submission:', assetToSend);

        return assetToSend;
    }

    /**
     * Get full name from user object
     */
    private getFullName(user: any): string {
        if (!user) return '';
        const firstName = user.firstName || '';
        const middleName = user.middleName || '';
        const lastName = user.lastName || '';
        return [firstName, middleName, lastName].filter((name) => name).join(' ');
    }
}
