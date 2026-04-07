import { IsNotEmpty, IsString } from 'class-validator';
import { VerifyOtpDto } from './verify-otp.dto';

export class ResetPasswordDto extends VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword!: string;
}
