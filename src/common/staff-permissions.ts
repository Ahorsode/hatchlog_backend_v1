export type StaffPermissionFlags = {
  canViewFinance: boolean;
  canEditFinance: boolean;
  canViewInventory: boolean;
  canEditInventory: boolean;
  canViewBatches: boolean;
  canEditBatches: boolean;
  canViewSales: boolean;
  canEditSales: boolean;
  canViewEggs: boolean;
  canEditEggs: boolean;
  canViewFeeding: boolean;
  canEditFeeding: boolean;
  canViewHouses: boolean;
  canEditHouses: boolean;
  canViewMortality: boolean;
  canEditMortality: boolean;
  canViewHealth: boolean;
  canEditHealth: boolean;
  canViewCustomers: boolean;
  canEditCustomers: boolean;
  canViewTeam: boolean;
  canEditTeam: boolean;
};

const BASE_PERMISSIONS: StaffPermissionFlags = {
  canViewFinance: false,
  canEditFinance: false,
  canViewInventory: false,
  canEditInventory: false,
  canViewBatches: false,
  canEditBatches: false,
  canViewSales: false,
  canEditSales: false,
  canViewEggs: false,
  canEditEggs: false,
  canViewFeeding: false,
  canEditFeeding: false,
  canViewHouses: false,
  canEditHouses: false,
  canViewMortality: false,
  canEditMortality: false,
  canViewHealth: false,
  canEditHealth: false,
  canViewCustomers: false,
  canEditCustomers: false,
  canViewTeam: false,
  canEditTeam: false,
};

const ROLE_DEFAULTS: Record<string, Partial<StaffPermissionFlags>> = {
  WORKER: {
    canViewEggs: true,
    canEditEggs: true,
    canViewFeeding: true,
    canEditFeeding: true,
    canViewMortality: true,
    canEditMortality: true,
    canViewHealth: true,
    canEditHealth: true,
    canViewBatches: true,
  },
  MANAGER: Object.fromEntries(
    Object.keys(BASE_PERMISSIONS).map((key) => [key, true]),
  ) as StaffPermissionFlags,
  ACCOUNTANT: {
    canViewFinance: true,
    canEditFinance: true,
    canViewSales: true,
    canViewInventory: true,
  },
  FINANCE_OFFICER: {
    canViewFinance: true,
    canEditFinance: true,
    canViewSales: true,
    canEditSales: true,
    canViewInventory: true,
  },
  CASHIER: {
    canViewSales: true,
    canEditSales: true,
    canViewFinance: true,
  },
};

export function getDefaultPermissionsForRole(
  role: string,
  overrides?: Partial<StaffPermissionFlags> | null,
): StaffPermissionFlags {
  const sanitized = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(
      ([, value]) => typeof value === 'boolean',
    ),
  ) as Partial<StaffPermissionFlags>;

  return {
    ...BASE_PERMISSIONS,
    ...(ROLE_DEFAULTS[role] ?? {}),
    ...sanitized,
  };
}
