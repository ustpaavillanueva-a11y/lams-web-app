import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';
import { AssetUtils } from '../utils/asset.utils';

@Injectable({
    providedIn: 'root'
})
export class BundleQrPrintService {
    // The QR encodes exactly the bundleId: the topbar scanner resolves it against bundles by bundleId
    async print(bundle: { bundleId: string; bundleName: string; propertyNumber?: string | null }): Promise<void> {
        // Must be the first statement: the popup has to open synchronously within the user's click
        const win = window.open('', '_blank');
        if (!win) {
            throw new Error('Popup blocked: allow popups to print the QR label');
        }

        let dataUrl: string;
        try {
            dataUrl = await QRCode.toDataURL(bundle.bundleId, { margin: 1, width: 300, errorCorrectionLevel: 'M' });
        } catch (err) {
            win.close();
            throw err;
        }

        const esc = AssetUtils.escapeHtml;
        const propertyLine = bundle.propertyNumber ? `<div class="meta">Property No.: ${esc(bundle.propertyNumber)}</div>` : '';

        win.document.open();
        win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(bundle.bundleName)} - QR label</title>
<style>
    body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 16px; }
    .label { display: inline-block; border: 1px solid #000; padding: 12px; }
    img { width: 300px; height: 300px; display: block; margin: 0 auto 8px; }
    .name { font-size: 18px; font-weight: bold; }
    .meta { font-size: 14px; margin-top: 4px; }
</style>
</head>
<body>
<div class="label">
    <img id="qr" src="${dataUrl}" alt="QR code">
    <div class="name">${esc(bundle.bundleName)}</div>
    <div class="meta">Bundle ID: ${esc(bundle.bundleId)}</div>
    ${propertyLine}
</div>
</body>
</html>`);
        win.document.close();

        let printed = false;
        let fallback: ReturnType<typeof setTimeout> | undefined;
        const doPrint = () => {
            if (printed) return;
            printed = true;
            if (fallback !== undefined) clearTimeout(fallback);
            win.focus();
            win.print();
        };
        const img = win.document.getElementById('qr') as HTMLImageElement | null;
        if (img && !img.complete) {
            img.onload = doPrint;
            img.onerror = doPrint;
        } else {
            setTimeout(doPrint, 0);
        }
        if (!printed) fallback = setTimeout(doPrint, 1500);
    }
}
