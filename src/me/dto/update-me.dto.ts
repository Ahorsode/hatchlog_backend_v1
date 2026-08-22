import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMeProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstname!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  surname!: string;
}

export class UpdateMePasswordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  current?: string;

  @ApiPropertyOptional({ description: 'New password (alias of newPassword)' })
  @IsOptional()
  @IsString()
  new?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newPassword?: string;
}
