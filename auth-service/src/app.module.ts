import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infra/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './infra/redis/redis.module';
import { KafkaModule } from './infra/kafka/kafka.module';

@Module({
  imports: [DatabaseModule, AuthModule, RedisModule, KafkaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
