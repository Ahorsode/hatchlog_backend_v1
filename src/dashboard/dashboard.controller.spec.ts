import 'reflect-metadata';
import { FARM_PERMISSION_KEY } from '../common/decorators/require-farm-permission.decorator';
import { ALLOW_WHEN_FARM_LOCKED_KEY } from '../common/decorators/allow-when-farm-locked.decorator';
import { DashboardController } from './dashboard.controller';

describe('DashboardController metadata', () => {
  it('does not require batches view for stats or monthly summary', () => {
    expect(
      Reflect.getMetadata(FARM_PERMISSION_KEY, DashboardController.prototype.stats),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        FARM_PERMISSION_KEY,
        DashboardController.prototype.monthlySummary,
      ),
    ).toBeUndefined();
  });

  it('allows stats and monthly summary when the farm is locked', () => {
    expect(
      Reflect.getMetadata(
        ALLOW_WHEN_FARM_LOCKED_KEY,
        DashboardController.prototype.stats,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        ALLOW_WHEN_FARM_LOCKED_KEY,
        DashboardController.prototype.monthlySummary,
      ),
    ).toBe(true);
  });
});
