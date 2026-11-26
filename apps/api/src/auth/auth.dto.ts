import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName: string;
  @IsString() @MinLength(1) @MaxLength(120) lastName: string;
  @IsString() @MinLength(1) @MaxLength(24) phone: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}
export class LoginDto { @IsEmail() @MaxLength(254) email: string; @IsString() @MinLength(8) @MaxLength(72) password: string; }
export class TokenDto { @IsString() @MinLength(64) @MaxLength(64) token: string; }
export class ResetPasswordDto extends TokenDto { @IsString() @MinLength(8) @MaxLength(72) password: string; }
export class TotpDto { @IsString() @MinLength(6) @MaxLength(8) code: string; }
export class ForgotPasswordDto { @IsEmail() @MaxLength(254) email: string; }
