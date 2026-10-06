import { Asset } from '../../service/asset.service';
import { AssetUtils } from './asset.utils';

describe('AssetUtils life remaining', () => {
    const today = new Date(2026, 9, 6); // Oct 6, 2026 (local)
    const asset = (overrides: Partial<Asset>): Asset => ({ supplier: null, laboratories: null, campus: null, ...overrides }) as Asset;

    it('parses useful-life text, treating a bare number as years', () => {
        expect(AssetUtils.parseUsefulLife('5 years')).toEqual({ amount: 5, unit: 'years' });
        expect(AssetUtils.parseUsefulLife('5yrs')).toEqual({ amount: 5, unit: 'years' });
        expect(AssetUtils.parseUsefulLife('18 months')).toEqual({ amount: 18, unit: 'months' });
        expect(AssetUtils.parseUsefulLife('6 mos')).toEqual({ amount: 6, unit: 'months' });
        expect(AssetUtils.parseUsefulLife('2 weeks')).toEqual({ amount: 2, unit: 'weeks' });
        expect(AssetUtils.parseUsefulLife('90 days')).toEqual({ amount: 90, unit: 'days' });
        expect(AssetUtils.parseUsefulLife('3')).toEqual({ amount: 3, unit: 'years' });
        expect(AssetUtils.parseUsefulLife('long')).toBeNull();
        expect(AssetUtils.parseUsefulLife('0 years')).toBeNull();
        expect(AssetUtils.parseUsefulLife(null)).toBeNull();
    });

    it('counts down from acquisition date plus useful life', () => {
        const life = AssetUtils.getLifeRemaining(asset({ acquisitionDate: '2021-10-16', inventoryCustodianSlip: { estimatedUsefullLife: '5 years' } }), today);
        expect(life?.basis).toBe('Useful life');
        expect(life?.daysRemaining).toBe(10);
    });

    it('prefers the subscription length when set', () => {
        const life = AssetUtils.getLifeRemaining(asset({ acquisitionDate: '2026-04-06', subscriptionDurationMonths: 6, inventoryCustodianSlip: { estimatedUsefullLife: '5 years' } }), today);
        expect(life?.basis).toBe('Subscription');
        expect(life?.daysRemaining).toBe(0);
    });

    it('returns negative days once ended', () => {
        const life = AssetUtils.getLifeRemaining(asset({ acquisitionDate: '2025-09-26', inventoryCustodianSlip: { estimatedUsefullLife: '1 year' } }), today);
        expect(life?.daysRemaining).toBe(-10);
    });

    it('falls back to the created date and returns null without a usable length', () => {
        expect(AssetUtils.getLifeRemaining(asset({ assetCreated: '2026-10-01', inventoryCustodianSlip: { estimatedUsefullLife: '30 days' } }), today)?.daysRemaining).toBe(25);
        expect(AssetUtils.getLifeRemaining(asset({ acquisitionDate: '2026-10-01', inventoryCustodianSlip: {} }), today)).toBeNull();
        expect(AssetUtils.getLifeRemaining(asset({ inventoryCustodianSlip: { estimatedUsefullLife: '5 years' } }), today)).toBeNull();
    });
});
