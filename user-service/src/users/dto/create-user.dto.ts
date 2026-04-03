import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AppRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @IsString()
  @MinLength(2, { message: 'name must be at least 2 characters' })
  name: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password: string;

  /**
   * Defaults to 'user' if omitted.
   * Only admin/superAdmin callers should set a higher role.
   */
  @IsOptional()
  @IsEnum(AppRole, {
    message: `role must be one of: ${Object.values(AppRole).join(', ')}`,
  })
  role?: AppRole;
}
