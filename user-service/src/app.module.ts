import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule }  from './users/users.module';
import { LogsModule }   from './logs/logs.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    LogsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
