import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminActorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminUsername?: string;
}

export class IssueLicenseDto extends AdminActorDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  hardwareId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  desktopFarmId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  accountUserId!: string;

  @ApiProperty({ enum: ['3M', '1Y'] })
  @IsIn(['3M', '1Y'])
  durationPack!: '3M' | '1Y';

  @ApiProperty()
  @IsString()
  @MinLength(4)
  @MaxLength(600)
  transactionReference!: string;
}

export class RenewLicenseDto extends AdminActorDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  hardwareId!: string;

  @ApiPropertyOptional({ description: 'Duration in months (3 or 12)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([3, 12])
  durationMonths?: number;
}

export class ConfirmPaymentDto extends AdminActorDto {
  @ApiProperty()
  @IsUUID()
  deviceRegistrationId!: string;

  @ApiProperty({ enum: [30, 90, 180, 365] })
  @Type(() => Number)
  @IsInt()
  @IsIn([30, 90, 180, 365])
  durationDays!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(600)
  paymentModeNote!: string;
}

export class BindDeviceDto extends AdminActorDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  hardwareId!: string;
}

export class UpgradeTierDto extends AdminActorDto {
  @ApiProperty({ enum: ['STANDARD', 'PREMIUM'] })
  @IsIn(['STANDARD', 'PREMIUM'])
  tier!: 'STANDARD' | 'PREMIUM';

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays!: number;
}

export class ExtendTrialDto extends AdminActorDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  extraDays!: number;
}

export class RevokeFarmDto extends AdminActorDto {}
