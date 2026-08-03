import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SyncMutationDto {
  @ApiProperty({ example: 'mobile_egg_collection_abc123' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  client_id!: string;

  @ApiProperty({
    example: 'egg_collection',
    description:
      'Supported in Phase 1: egg_collection, feed_usage, mortality. Others are rejected.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  entity_type!: string;

  @ApiProperty({ enum: ['upsert', 'delete'] })
  @IsIn(['upsert', 'delete'])
  op!: 'upsert' | 'delete';

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-08-03T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  client_updated_at?: string;
}

export class SyncPushDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  sync_protocol_version!: number;

  @ApiProperty({ example: 'farm_xxx' })
  @IsString()
  @MinLength(1)
  farm_id!: string;

  @ApiProperty({ type: [SyncMutationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncMutationDto)
  mutations!: SyncMutationDto[];
}

export class SyncPullQueryDto {
  @ApiProperty({ example: 'farm_xxx' })
  @IsString()
  @MinLength(1)
  farm_id!: string;

  @ApiPropertyOptional({
    description: 'ISO timestamp cursor; return records modified after this time',
  })
  @IsOptional()
  @IsISO8601()
  since?: string;

  @ApiPropertyOptional({ default: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

export class SyncStatusQueryDto {
  @ApiProperty({ example: 'farm_xxx' })
  @IsString()
  @MinLength(1)
  farm_id!: string;
}
