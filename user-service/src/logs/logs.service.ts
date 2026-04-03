import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: {
    endpoint: string;
    method: string;
    userId?: string | null;
    ip: string;
    statusCode: number;
    service: string;
    errorStack?: string | null;
  }) {
    return this.prisma.log.create({ data });
  }

  async upsertMetric(data: {
    endpoint: string;
    method: string;
    responseTimeMs: number;
  }) {
    const { endpoint, method, responseTimeMs } = data;

    // Use raw SQL for atomic upsert with increment
    await this.prisma.$executeRaw`
      INSERT INTO metrics (id, endpoint, method, request_count, total_response_time_ms, avg_response_time_ms, last_updated)
      VALUES (gen_random_uuid(), ${endpoint}, ${method}, 1, ${BigInt(responseTimeMs)}, ${responseTimeMs}::float, NOW())
      ON CONFLICT (endpoint, method)
      DO UPDATE SET
        request_count = metrics.request_count + 1,
        total_response_time_ms = metrics.total_response_time_ms + ${BigInt(responseTimeMs)},
        avg_response_time_ms = (metrics.total_response_time_ms + ${BigInt(responseTimeMs)})::float / (metrics.request_count + 1),
        last_updated = NOW()
    `;
  }

  async getAllMetrics() {
    return this.prisma.metric.findMany({
      orderBy: { lastUpdated: 'desc' },
    });
  }
}
