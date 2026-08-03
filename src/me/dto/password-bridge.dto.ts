import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PasswordBridgeDto {
  @ApiProperty({ description: 'Email or phone number' })
  @IsString()
  @MinLength(3)
  identifier!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}
