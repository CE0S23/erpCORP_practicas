-- CreateTable
CREATE TABLE "logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpoint" TEXT NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "user_id" TEXT,
    "ip" VARCHAR(45) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "service" VARCHAR(50) NOT NULL,
    "error_stack" TEXT,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endpoint" TEXT NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "total_response_time_ms" BIGINT NOT NULL DEFAULT 0,
    "avg_response_time_ms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "metrics_endpoint_method_key" ON "metrics"("endpoint", "method");
