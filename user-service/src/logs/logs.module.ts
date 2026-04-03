import { Module } from '@nestjs/common';

import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { InternalSecretGuard } from '../users/guards/internal-secret.guard';

@Module({
  controllers: [LogsController],
  providers: [LogsService, InternalSecretGuard],
  exports: [LogsService],
})
export class LogsModule {}
