import { SetMetadata } from '@nestjs/common';

export type PermissionModule =
  | 'finance'
  | 'inventory'
  | 'batches'
  | 'sales'
  | 'eggs'
  | 'feeding'
  | 'houses'
  | 'mortality'
  | 'health'
  | 'customers'
  | 'team';

export type PermissionAction = 'view' | 'edit';

export const FARM_PERMISSION_KEY = 'farm_permission';

export type FarmPermissionMeta = {
  module: PermissionModule;
  action: PermissionAction;
  /** Query/body key that carries farm_id (default farm_id). */
  farmIdKey?: string;
};

export const RequireFarmPermission = (
  module: PermissionModule,
  action: PermissionAction = 'view',
  farmIdKey = 'farm_id',
) =>
  SetMetadata(FARM_PERMISSION_KEY, {
    module,
    action,
    farmIdKey,
  } satisfies FarmPermissionMeta);
