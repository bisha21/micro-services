import { Module } from '@nestjs/common';
import { AuthService } from './application/services/auth/auth.service';
import { AuthKafkaController } from './presentation/controllers/auth/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import JwtConstants from 'src/common/config/jwt-config';
import type { StringValue } from 'ms';
import { DatabaseModule } from 'src/infra/database/database.module';
import { RedisModule } from 'src/infra/redis/redis.module';
import { KafkaModule } from 'src/infra/kafka/kafka.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    KafkaModule,
    JwtModule.register({
      secret: JwtConstants.secret || 'supersecretkey',
      signOptions: {
        expiresIn: (JwtConstants.expiresIn || '5d') as number | StringValue,
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthKafkaController],
})
export class AuthModule {}
