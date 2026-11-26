import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName: string;
  @IsString() @MinLength(1) @MaxLength(120) lastName: string;
  @IsString() @MinLength(1) @MaxLength(24) phone: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}

export class LoginDto {
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}
