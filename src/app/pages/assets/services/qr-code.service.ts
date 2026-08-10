/**
 * QR Code Service
 * Handles QR code scanning, validation, and display logic
 */

import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import jsQR from 'jsqr';
import Swal from 'sweetalert2';

@Injectable()
export class QrCodeService {
    constructor(private messageService: MessageService) {}

    /**
     * Decode QR code from uploaded image file
     */
    async decodeQrCodeFromFile(file: File): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e: any) => {
                const img = new Image();

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            throw new Error('Failed to get canvas context');
                        }

                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, img.width, img.height);

                        // Decode QR code
                        const decodedQR = jsQR(imageData.data, img.width, img.height);

                        if (decodedQR) {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'QR Code Scanned',
                                detail: `QR Code: ${decodedQR.data}`
                            });
                            resolve(decodedQR.data);
                        } else {
                            this.messageService.add({
                                severity: 'warn',
                                summary: 'No QR Code',
                                detail: 'Could not find QR code in the image. Please try another image.'
                            });
                            resolve(null);
                        }
                    } catch (error) {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to decode QR code from image'
                        });
                        reject(error);
                    }
                };

                img.onerror = () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to load image file'
                    });
                    reject(new Error('Failed to load image'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to read file'
                });
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Check if QR code is a base64 image or URL
     */
    isBase64Image(qrCode: string): boolean {
        if (!qrCode) return false;
        return qrCode.startsWith('data:image/') || qrCode.startsWith('data:application/') || qrCode.startsWith('http://') || qrCode.startsWith('https://');
    }

    /**
     * Display QR code in a modal dialog
     */
    viewQrCode(qrCode: string, assetName?: string): void {
        if (qrCode) {
            Swal.fire({
                title: 'QR Code',
                html: `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 4px 0 8px;">
                        ${assetName ? `<p style="margin: 0; font-size: 14px; font-weight: 500; color: #374151;">${assetName}</p>` : ''}
                        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px;">
                            <img src="${qrCode}" alt="QR Code" style="width: 240px; height: 240px; object-fit: contain; border-radius: 8px; display: block;" />
                        </div>
                        <a href="${qrCode}" download target="_blank" rel="noopener"
                           style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; background: #3b82f6; color: #ffffff; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
                            <i class="pi pi-download"></i> Download
                        </a>
                    </div>
                `,
                confirmButtonText: 'Close',
                confirmButtonColor: '#6b7280',
                width: '380px'
            });
        } else {
            Swal.fire({
                html: `
                    <div style="text-align: center; padding: 8px 0;">
                        <i class="pi pi-qrcode" style="font-size: 2.5rem; color: #9ca3af;"></i>
                        <p style="margin: 12px 0 0; font-size: 15px; font-weight: 600; color: #374151;">No QR Code</p>
                        <p style="margin: 6px 0 0; font-size: 13px; color: #6b7280;">This asset does not have a QR code associated with it.</p>
                    </div>
                `,
                confirmButtonText: 'OK',
                confirmButtonColor: '#3b82f6',
                width: '360px'
            });
        }
    }

    /**
     * Copy QR code text to clipboard
     */
    async copyToClipboard(text: string): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);
            this.messageService.add({
                severity: 'success',
                summary: 'Copied!',
                detail: 'QR Code copied to clipboard',
                life: 2000
            });
            return true;
        } catch (error) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to copy to clipboard',
                life: 2000
            });
            return false;
        }
    }
}
