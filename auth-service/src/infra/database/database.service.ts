import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    const retries = 5;
    const delay = 2000;

    for (let i = 0; i < retries; i++) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        return; // success, exit loop
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Database connection failed (attempt ${i + 1}/${retries}): ${errorMessage}`,
        );

        if (i < retries - 1) {
          await new Promise((res) => setTimeout(res, delay));
        } else {
          this.logger.error(
            'Could not connect to database after multiple attempts',
          );
          throw err;
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
