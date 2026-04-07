import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { AllRpcExceptionsFilter } from './common/filters/filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.KAFKA,
    options: {
      /* kafka options */
    },
  });

  app.useGlobalFilters(new AllRpcExceptionsFilter());

  await app.listen();
}
bootstrap();
