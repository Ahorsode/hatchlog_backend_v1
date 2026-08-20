import { SetMetadata } from '@nestjs/common';
import type { FarmEntitlement } from '../../subscriptions/farm-access-status';

export const FARM_ENTITLEMENT_KEY = 'farm_entitlement';

export const RequireEntitlement = (entitlement: FarmEntitlement) =>
  SetMetadata(FARM_ENTITLEMENT_KEY, entitlement);
