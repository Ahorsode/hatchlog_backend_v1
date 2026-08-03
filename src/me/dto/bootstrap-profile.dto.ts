import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class BootstrapProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passwordHash?: string;
}
