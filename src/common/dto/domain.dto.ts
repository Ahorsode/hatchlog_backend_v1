import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class FarmScopedQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  farm_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CreateHouseDto {
  @ApiPropertyOptional({
    description: 'Client-generated id for offline-first sync',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isIsolation?: boolean;
}

export class UpdateHouseDto extends PartialType(CreateHouseDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farm_id?: string;
}

export class CreateLivestockDto {
  @ApiPropertyOptional({
    description: 'Client-generated id for offline-first sync',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  houseId!: string;

  @ApiProperty()
  @IsString()
  breedType!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  initialCount!: number;

  @ApiProperty()
  @IsString()
  arrivalDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateLivestockDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  houseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breedType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  initialCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currentCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  arrivalDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  growthTargetOverride?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

export class SoftDeleteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateEggDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty()
  @IsString()
  logDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  eggsCollected?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cratesCollected?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unusableCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualityGrade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSorted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  smallCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mediumCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  largeCount?: number;
}

export class UpdateEggDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  eggsCollected?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unusableCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualityGrade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSorted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  smallCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mediumCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  largeCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logDate?: string;
}

export class CreateFeedingDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amountConsumed!: number;

  @ApiProperty()
  @IsString()
  logDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedTypeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formulationId?: string | null;
}

export class UpdateFeedingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountConsumed?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedTypeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formulationId?: string | null;
}

export class CreateMortalityDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty({ enum: ['SICK', 'DEAD'] })
  @IsString()
  type!: 'SICK' | 'DEAD';

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isolationRoomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subCategory?: string;
}

export class UpdateMortalityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logDate?: string;
}

// ── Isolation ──

export class CreateIsolationRoomDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;
}

export class IsolationTransferDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;
}

export class IsolationReturnDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;
}

export class IsolationMortalityDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subCategory?: string;
}

// ── Egg Categories ──

export class CreateEggCategoryDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sellingPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStockInternal?: boolean;
}

export class UpdateEggCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farm_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sellingPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStockInternal?: boolean;
}

// ── Feed Formulations ──

export class FeedFormulationIngredientDto {
  @ApiProperty()
  @IsString()
  inventoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bags?: number;
}

export class CreateFeedFormulationDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({
    enum: ['PRE_STARTER', 'STARTER', 'GROWER', 'FINISHER', 'BREEDER', 'CUSTOM'],
  })
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetLivestock?: string;

  @ApiProperty({ type: [FeedFormulationIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedFormulationIngredientDto)
  ingredients!: FeedFormulationIngredientDto[];
}

// ── Livestock Weight ──

export class CreateWeightRecordDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  averageWeight!: number;

  @ApiProperty()
  @IsString()
  logDate!: string;
}

// ── Farm Settings ──

export class OnboardFarmDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  capacity!: number;

  /** Ignored — farm is bound to the authenticated user. Kept for web BFF compat. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdateFarmDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  capacity?: number;
}

export class UpdateFarmSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eggRecordReminderTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedRecordReminderTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  growthTargetStandard?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  eggsPerCrate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultEggUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowEggUnitChange?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultEggSortMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowEggSortModeChange?: boolean;
}

export class UpdateSalesSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowBatchOverride?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowWorkerDiscounts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultDiscountType?: string;
}

// ── Team ──

export class CreateInvitationDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    enum: ['MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER', 'CASHIER'],
  })
  @IsString()
  role!: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty({
    enum: ['MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER', 'CASHIER'],
  })
  @IsString()
  role!: string;
}

export class UpdatePermissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewFinance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditFinance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewInventory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditInventory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewBatches?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditBatches?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewSales?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditSales?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewEggs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditEggs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewFeeding?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditFeeding?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewHouses?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditHouses?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewMortality?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditMortality?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewHealth?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditHealth?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewCustomers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditCustomers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewTeam?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canEditTeam?: boolean;
}

// ── Inventory ──

export class InventoryQueryDto extends FarmScopedQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'used_up', 'all'] })
  @IsOptional()
  @IsString()
  filter?: 'active' | 'used_up' | 'all';
}

export class CreateInventoryDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockLevel!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  unit!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eggCategoryId?: string;

  @ApiPropertyOptional({ enum: ['full', 'installments', 'none'] })
  @IsOptional()
  @IsString()
  paymentPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountPaid?: number;
}

export class UpdateInventoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  usageType?: string;
}

// ── Customers ──

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  balanceOwed?: number;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

// ── Suppliers ──

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  balanceOwed?: number;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farm_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  balanceOwed?: number;
}

export class UpdateSupplierBalanceDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount!: number;
}

// ── Orders ──

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inventoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  livestockId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eggAllocationMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eggBatchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lineDiscountAmount?: number;

  @ApiPropertyOptional({ enum: ['flat', 'percent', 'item'] })
  @IsOptional()
  @IsString()
  lineDiscountType?: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalCashReceived?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentAccountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completeNow?: boolean;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  status!: string;
}

// ── Sales ──

export class SaleItemDto {
  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalPrice!: number;
}

export class CreateSaleDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];
}

// ── Payments ──

export class RecordPaymentDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentDate?: string;
}

// ── Shared query DTOs ──

export class ListQueryDto extends FarmScopedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batch_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  house_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

// ── Health Schedules ──

export class HealthScheduleQueryDto extends FarmScopedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batch_id?: string;
}

export class HealthScheduleEntryDto {
  @ApiProperty({ enum: ['VACCINATION', 'MEDICATION'] })
  @IsString()
  type!: 'VACCINATION' | 'MEDICATION';

  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNewItem?: boolean;

  @ApiProperty()
  @IsString()
  scheduledDate!: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['ONE_TIME', 'QUANTITY'] })
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateHealthSchedulesBulkDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty({ type: [HealthScheduleEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HealthScheduleEntryDto)
  entries!: HealthScheduleEntryDto[];
}

export class UpdateHealthScheduleStatusDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty({ enum: ['VACCINATION', 'MEDICATION'] })
  @IsString()
  type!: 'VACCINATION' | 'MEDICATION';

  @ApiProperty({ enum: ['PENDING', 'COMPLETED', 'CANCELLED'] })
  @IsString()
  status!: string;
}

export class DeleteHealthScheduleDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty({ enum: ['VACCINATION', 'MEDICATION'] })
  @IsString()
  type!: 'VACCINATION' | 'MEDICATION';
}

export class RegisterHealthInventoryItemDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty({ enum: ['VACCINATION', 'MEDICATION'] })
  @IsString()
  type!: 'VACCINATION' | 'MEDICATION';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: ['ONE_TIME', 'QUANTITY'] })
  @IsString()
  usageType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;
}

export class SetHealthItemCostDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  inventoryId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPerUnit!: number;
}

// ── Expenses ──

export class ExpenseAllocationInputDto {
  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;
}

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expenseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'AMOUNT'] })
  @IsOptional()
  @IsString()
  allocationMode?: 'PERCENTAGE' | 'AMOUNT';

  @ApiPropertyOptional({ type: [ExpenseAllocationInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseAllocationInputDto)
  allocations?: ExpenseAllocationInputDto[];
}

export class DeleteExpenseDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  reason!: string;
}

// ── Ledger (Financial Transactions) ──

export class LedgerAllocationInputDto {
  @ApiProperty()
  @IsString()
  batchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;
}

export class CreateLedgerTransactionDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty({ enum: ['REVENUE', 'EXPENSE'] })
  @IsString()
  type!: 'REVENUE' | 'EXPENSE';

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: ['PAID', 'UNPAID', 'PARTIALLY_PAID'] })
  @IsString()
  paymentStatus!: string;

  @ApiProperty()
  @IsString()
  paymentMethod!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNum?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'AMOUNT'] })
  @IsOptional()
  @IsString()
  allocationMode?: 'PERCENTAGE' | 'AMOUNT';

  @ApiPropertyOptional({ type: [LedgerAllocationInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LedgerAllocationInputDto)
  allocations?: LedgerAllocationInputDto[];
}

export class SettleLedgerTransactionDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNum?: string;
}

export class DeleteLedgerTransactionDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  reason!: string;
}

// ── Dashboard ──

export class DashboardQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  farm_id!: string;
}

// ── Analytics ──

export class BatchAnalyticsQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  farm_id!: string;

  @ApiProperty()
  @IsString()
  batch_id!: string;
}

export class MortalityTrendsQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  farm_id!: string;
}

export class ComprehensiveReportQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  farm_id!: string;

  @ApiProperty({ description: 'ISO start date' })
  @IsString()
  @MinLength(1)
  start_date!: string;

  @ApiProperty({ description: 'ISO end date' })
  @IsString()
  @MinLength(1)
  end_date!: string;
}

// ── Trash ──

export class TrashQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  farm_id!: string;
}

export class RestoreTrashDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty()
  @IsString()
  tableName!: string;

  @ApiProperty()
  @IsString()
  recordId!: string;
}

// ── Audit ──

export class AuditQueryDto extends FarmScopedQueryDto {
  @ApiPropertyOptional({ enum: ['insert', 'delete', 'edit'] })
  @IsOptional()
  @IsString()
  logType?: 'insert' | 'delete' | 'edit';
}

// ── Subscriptions ──

export class RequestUpgradeDto {
  @ApiProperty()
  @IsString()
  farm_id!: string;

  @ApiProperty({ enum: ['STANDARD', 'PREMIUM'] })
  @IsString()
  tier!: 'STANDARD' | 'PREMIUM';

  @ApiPropertyOptional({ enum: [1, 3, 6, 12] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  months?: number;
}
