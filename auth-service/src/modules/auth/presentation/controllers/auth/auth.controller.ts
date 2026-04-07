import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from 'src/modules/auth/application/services/auth/auth.service';
import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';

@Controller()
export class AuthKafkaController {
  constructor(private readonly authService: AuthService) {}

  // Listen to 'auth.register' topic
  @MessagePattern('auth.register')
  async handleRegister(@Payload() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  // Listen to 'auth.login' topic
  @MessagePattern('auth.login')
  async handleLogin(@Payload() payload: LoginDto) {
    return this.authService.login(payload);
  }

  // Listen to 'auth.refresh-token' topic
  @MessagePattern('auth.refresh-token')
  async handleRefreshToken(@Payload() payload: { refreshToken: string }) {
    return this.authService.refreshToken(payload.refreshToken);
  }

  // Listen to 'auth.forgot-password' topic
  @MessagePattern('auth.forgot-password')
  async handleForgotPassword(@Payload() payload: { email: string }) {
    return this.authService.forgotPassword(payload.email);
  }

  // Listen to 'auth.verify-otp' topic
  @MessagePattern('auth.verify-otp')
  async handleVerifyOtp(@Payload() payload: { email: string; otp: string }) {
    return this.authService.verifyOtp(payload.email, payload.otp);
  }

  // Listen to 'auth.reset-password' topic
  @MessagePattern('auth.reset-password')
  async handleResetPassword(
    @Payload() payload: { email: string; otp: string; newPassword: string },
  ) {
    return this.authService.resetPassword(
      payload.email,
      payload.otp,
      payload.newPassword,
    );
  }
}
