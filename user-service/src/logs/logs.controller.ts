import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { InternalSecretGuard } from '../users/guards/internal-secret.guard';
import { LogsService } from './logs.service';

@Controller('internal')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(InternalSecretGuard)
  async createLog(
    @Body()
    body: {
      endpoint: string;
      method: string;
      userId?: string | null;
      ip: string;
      statusCode: number;
      service: string;
      errorStack?: string | null;
    },
  ) {
    const log = await this.logsService.createLog(body);
    return { id: log.id };
  }

  @Post('metrics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalSecretGuard)
  async upsertMetric(
    @Body()
    body: {
      endpoint: string;
      method: string;
      responseTimeMs: number;
    },
  ) {
    await this.logsService.upsertMetric(body);
    return { success: true };
  }

  @Get('metrics')
  @UseGuards(InternalSecretGuard)
  async getAllMetrics() {
    return this.logsService.getAllMetrics();
  }
}
