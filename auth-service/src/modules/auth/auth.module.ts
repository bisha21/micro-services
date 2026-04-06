import { Module } from '@nestjs/common';
import { AuthService } from './application/services/auth/auth.service';
import { AuthController } from './presentation/controllers/auth/auth.controller';

@Module({
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}
