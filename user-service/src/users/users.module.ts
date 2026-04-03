import { Module } from '@nestjs/common';

import { InternalController, UsersController } from './users.controller';
import { UsersService }                        from './users.service';
import { InternalSecretGuard }                 from './guards/internal-secret.guard';

@Module({
  controllers: [InternalController, UsersController],
  providers:   [UsersService, InternalSecretGuard],
  exports:     [UsersService],
})
export class UsersModule {}
