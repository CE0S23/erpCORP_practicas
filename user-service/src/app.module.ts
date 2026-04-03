import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule }  from './users/users.module';
import { LogsModule }   from './logs/logs.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    LogsModule,
  ],
})
export class AppModule {}
