import { SetMetadata } from '@nestjs/common';

export const ALLOW_WHEN_FARM_LOCKED_KEY = 'allow_when_farm_locked';

export const AllowWhenFarmLocked = () =>
  SetMetadata(ALLOW_WHEN_FARM_LOCKED_KEY, true);
