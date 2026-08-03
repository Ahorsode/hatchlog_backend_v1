import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FarmScopedQueryDto } from './domain.dto';

// ── Inventory ──

export class InventoryQueryDto extends FarmScopedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateInventoryItemDto {
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
}

export class UpdateInventoryItemDto {
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
  @IsString()
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
  @IsString()
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
  @IsString()
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  legacyDebt?: number;
}

export class UpdateSupplierDto {
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
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
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

export class OrderItemInputDto {
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

  @ApiPropertyOptional()
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

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
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

export class SaleItemInputDto {
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

  @ApiProperty({ type: [SaleItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items!: SaleItemInputDto[];
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

// ── Statements ──

export class StatementQueryDto extends FarmScopedQueryDto {
  @ApiProperty()
  @IsString()
  entity_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  end_date?: string;
}
