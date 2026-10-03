import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BundleListComponent } from './bundle-list';
import { AssetBundleService } from '../services/asset-bundle.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { AssetBundle } from '../models/asset-bundle.model';

function makeBundle(id: string, name: string): AssetBundle {
    return {
        bundleId: id,
        bundleName: name,
        propertyNumber: 'PN-' + id,
        issuedTo: 'Someone',
        laboratories: { laboratoryName: 'Lab 1' },
        components: [{ assetId: id + '-A', assetName: 'Monitor', componentRole: 'Monitor', status: { statusName: 'Serviceable' }, inventoryCustodianSlip: { serialNumber: 'SN-' + id } }],
        derived: { status: 'Serviceable', activeCount: 1, availableCount: 1 }
    } as unknown as AssetBundle;
}

describe('BundleListComponent row expansion', () => {
    let fixture: ComponentFixture<BundleListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BundleListComponent],
            providers: [
                { provide: AssetBundleService, useValue: {} },
                { provide: ErrorHandlerService, useValue: {} }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(BundleListComponent);
        fixture.componentInstance.bundles = [makeBundle('B1', 'PC Set 1'), makeBundle('B2', 'PC Set 2')];
        fixture.detectChanges();
    });

    const togglers = () => Array.from(fixture.nativeElement.querySelectorAll('tbody tr td:first-child button')) as HTMLButtonElement[];
    const expandedRows = () => (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr td[colspan="8"] table').length;

    it('expands a row when the chevron is clicked', () => {
        expect(togglers().length).toBe(2);
        expect(expandedRows()).toBe(0);

        togglers()[0].click();
        fixture.detectChanges();

        expect(expandedRows()).toBe(1);
    });

    it('collapses the row when the chevron is clicked again', () => {
        togglers()[0].click();
        fixture.detectChanges();
        expect(expandedRows()).toBe(1);

        togglers()[0].click();
        fixture.detectChanges();

        expect(expandedRows()).toBe(0);
    });

    it('keeps the row collapsed after the bundles list is replaced with fresh data', () => {
        togglers()[0].click();
        fixture.detectChanges();
        togglers()[0].click();
        fixture.detectChanges();
        expect(expandedRows()).toBe(0);

        fixture.componentInstance.bundles = [makeBundle('B1', 'PC Set 1'), makeBundle('B2', 'PC Set 2')];
        fixture.detectChanges();

        expect(expandedRows()).toBe(0);
    });
});
