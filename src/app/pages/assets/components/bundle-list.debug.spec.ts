import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Table, RowToggler } from 'primeng/table';
import { BundleListComponent } from './bundle-list';
import { AssetBundleService } from '../services/asset-bundle.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

describe('DEBUG bundle list', () => {
    it('dump', async () => {
        await TestBed.configureTestingModule({
            imports: [BundleListComponent],
            providers: [
                { provide: AssetBundleService, useValue: {} },
                { provide: ErrorHandlerService, useValue: {} }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(BundleListComponent);
        fixture.componentInstance.bundles = [
            { bundleId: 'B1', bundleName: 'PC Set 1', propertyNumber: 'P', laboratories: { laboratoryName: 'L' }, components: [{ assetId: 'A', assetName: 'Monitor', componentRole: 'Monitor', status: { statusName: 'Serviceable' } }], derived: { status: 'Serviceable', activeCount: 1, availableCount: 1 } } as any
        ];
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;
        const btn = el.querySelector('tbody tr td:first-child button') as HTMLButtonElement;
        console.log('BTN-HTML: ' + (btn ? btn.outerHTML.slice(0, 300) : 'NONE'));
        const dt: any = fixture.debugElement.query(By.directive(Table)).componentInstance;
        const togglers = fixture.debugElement.queryAll(By.directive(RowToggler));
        console.log('INFO: togglers=' + togglers.length + ' dataKey=' + dt.dataKey + ' expandedRowTemplate=' + !!dt.expandedRowTemplate + ' _expandedRowTemplate=' + !!dt._expandedRowTemplate + ' keysBefore=' + JSON.stringify(dt.expandedRowKeys) + ' toggler.data=' + (togglers[0] ? JSON.stringify((togglers[0].injector.get(RowToggler) as any).data?.bundleId) : 'n/a'));
        btn.click();
        console.log('INFO2: keysAfterClick=' + JSON.stringify(dt.expandedRowKeys));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        console.log('ROWS-AFTER-CLICK: ' + el.querySelectorAll('tbody tr').length + ' | tds colspan8: ' + el.querySelectorAll('td[colspan="8"]').length + ' | inner tables: ' + el.querySelectorAll('td[colspan="8"] table').length);
        console.log('TBODY: ' + (el.querySelector('tbody')?.innerHTML.replace(/\s+/g, ' ').slice(0, 1200) ?? 'none'));
    });
});
